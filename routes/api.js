const express = require('express');
const qrcode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const Card = require('../models/cardModel');
const Certificate = require('../models/certificateModel');

const router = express.Router();

// POST /api/update-all-qr
router.post('/update-all-qr', async (req, res) => {
  try {
    // Update all cards
    const cards = await Card.find();
    for (const card of cards) {
      const viewLink = `${process.env.FRONTEND_URL}/card/view/${card.card_no}`;
      const qrDataUri = await qrcode.toDataURL(viewLink, { width: 200, margin: 1 });
      const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
        folder: `cards/${card.card_no}`,
        public_id: `card-${card.card_no}-qr`,
        overwrite: true,
      });
      card.qr = qrUpload.secure_url;
      await card.save();
    }

    // Update all certificates
    const certificates = await Certificate.find();
    for (const cert of certificates) {
      const viewUrl = `${process.env.FRONTEND_URL}/certificate/view/${cert.certificateNo}`;
      const qrDataUri = await qrcode.toDataURL(viewUrl, { width: 200, margin: 1 });
      const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
        folder: `certificates/${cert.certificateNo}`,
        public_id: `cert-${cert.certificateNo}-qr`,
        overwrite: true,
      });
      cert.qrLink = qrUpload.secure_url;
      await cert.save();
    }

    res.json({ status: 'success', message: 'All QR codes updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router; 