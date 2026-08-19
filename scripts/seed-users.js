// One-off script to add user accounts directly, without going through the
// unauthenticated /auth/register HTTP endpoint.
//
// Usage:
//   1. Edit the `usersToAdd` array below with the accounts the owner shared.
//   2. Run: node scripts/seed-users.js
//   3. Delete or clear the plaintext passwords from this file afterwards.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const usersToAdd = [
  // { userId: 'jdoe', password: 'TempPassword123!', user_role: 'supervisor', name: 'Jane Doe', email: 'jane@example.com' },
];

async function main() {
  if (!process.env.DB) {
    console.error('DB env var (Mongo connection string) is not set.');
    process.exit(1);
  }
  if (usersToAdd.length === 0) {
    console.error('usersToAdd is empty — add the account details before running.');
    process.exit(1);
  }

  await mongoose.connect(process.env.DB);

  for (const u of usersToAdd) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    const user = await User.create({
      userId: u.userId,
      password: hashedPassword,
      user_role: u.user_role,
      name: u.name,
      email: u.email,
    });
    console.log(`Created user ${user.userId} (${user.user_role})`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed to seed users:', err);
  process.exit(1);
});
