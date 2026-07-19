const crypto = require('crypto');

const secret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-this-jwt-secret';
const b64 = value => Buffer.from(value).toString('base64url');
const sign = (payload, expiresIn = 86400) => {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresIn }));
  const input = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret()).update(input).digest('base64url');
  return `${input}.${signature}`;
};
const verify = token => {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
};
const cookieOptions = { httpOnly: true, secure: 'auto', sameSite: 'lax', maxAge: 86400000, path: '/' };
module.exports = { sign, verify, cookieOptions };
