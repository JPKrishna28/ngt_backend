const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Set up multer for file uploads
const upload = multer({
  dest: 'uploads/', // Temporary folder for uploads
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// @desc Upload a file
// @route POST /api/files/upload
// @access Public
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  res.status(200).json({ filePath: path.join(__dirname, '../uploads', req.file.filename) });
});
router.delete('/delete', (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ message: 'File path is required' });
  }

  // Resolve the full path to avoid directory traversal attacks
  const fullPath = path.resolve(filePath);

  fs.unlink(fullPath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).json({ message: 'Failed to delete file' });
    }

    res.status(200).json({ message: 'File deleted successfully' });
  });
});


module.exports = router;