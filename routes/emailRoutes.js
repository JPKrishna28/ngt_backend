const express = require('express');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const router = express.Router();

// @desc Send offer letter email
// @route POST /api/email/send-offer-letter
// @access Admin or Superadmin
router.post('/send-offer-letter', async (req, res) => {
  try {
    const { to, subject, text, attachmentPath } = req.body;

    // Validate required fields
    if (!to || !subject || !text || !attachmentPath) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Send the email
    await sendEmail({
      to,
      subject,
      text,
      attachmentPath: path.resolve(attachmentPath), // Ensure absolute path
    });

    res.status(200).json({ message: 'Offer letter email sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

module.exports = router;