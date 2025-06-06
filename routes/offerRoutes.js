const express = require('express');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

// Helper function to check if user is admin or superadmin
const isAdminOrSuperadmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or Superadmin role required.' });
  }
};

// @desc    Create an offer letter
// @route   POST /api/offers
// @access  Admin or Superadmin
router.post('/', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const { employeeId, offerDetails } = req.body;
    
    // Check if employee exists
    const employee = await User.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Create offer letter
    const offer = new Offer({
      employeeId,
      offerDetails,
      status: 'sent'
    });
    
    const savedOffer = await offer.save();
    
    // Log the activity
    console.log(`Offer letter created by ${req.user.name} (${req.user.employeeId}) for employee ${employeeId}`);
    
    res.status(201).json(savedOffer);
  } catch (error) {
    console.error('Error creating offer letter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all offer letters
// @route   GET /api/offers
// @access  Admin or Superadmin
router.get('/', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offer letters:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get offer letters for a specific employee
// @route   GET /api/offers/employee/:employeeId
// @access  Admin or Superadmin
router.get('/employee/:employeeId', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const offers = await Offer.find({ employeeId }).sort({ createdAt: -1 });
    
    res.json(offers);
  } catch (error) {
    console.error('Error fetching employee offer letters:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get offer letter by ID
// @route   GET /api/offers/:id
// @access  Admin or Superadmin
router.get('/:id', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }
    
    res.json(offer);
  } catch (error) {
    console.error('Error fetching offer letter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update offer letter status
// @route   PATCH /api/offers/:id/status
// @access  Admin or Superadmin
router.patch('/:id/status', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['sent', 'accepted', 'declined', 'expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }
    
    offer.status = status;
    
    if (status === 'accepted') {
      offer.acceptanceDate = new Date();
    }
    
    if (notes) {
      offer.notes = notes;
    }
    
    const updatedOffer = await offer.save();
    
    res.json(updatedOffer);
  } catch (error) {
    console.error('Error updating offer letter status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;