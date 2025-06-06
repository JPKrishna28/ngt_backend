const nodemailer = require('nodemailer');
const fs = require('fs');

const sendEmail = async ({ to, subject, text, attachmentPath }) => {
  try {
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
      port: process.env.SMTP_PORT, // Usually 587
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // Your email address
        pass: process.env.SMTP_PASS, // Your email password or app password
      },
    });

    // Prepare email options
    const mailOptions = {
      from: `"Your Company Name" <${process.env.SMTP_USER}>`, // Sender address
      to, // Recipient address
      subject, // Subject line
      text, // Plain text body
      attachments: [
        {
          filename: 'Offer_Letter.pdf',
          path: attachmentPath, // Path to the PDF
        },
      ],
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;