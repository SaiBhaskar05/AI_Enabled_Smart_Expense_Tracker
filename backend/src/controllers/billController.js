const Bill = require('../models/Bill');
const Group = require('../models/Group');

// @desc    Upload new bill (Personal or Group)
// @route   POST /api/bills
// @access  Private
exports.uploadBill = async (req, res, next) => {
  try {
    const {
      title,
      category,
      amount,
      date,
      fileData,
      fileName,
      fileType,
      fileSize,
      notes,
      groupId
    } = req.body;

    if (!title || !fileData || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Title, file attachment, and filename are required.'
      });
    }

    // If uploading for a group, check that user is a group member
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ success: false, message: 'Group not found' });
      }

      const isMember = group.members.some(m => m.user?.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Not authorized to upload bills to this group' });
      }
    }

    const bill = new Bill({
      userId: req.user._id,
      groupId: groupId || null,
      title: title.trim(),
      category: category || 'General & Others',
      amount: amount !== undefined && amount !== '' ? Number(amount) : null,
      date: date || new Date(),
      fileData,
      fileName,
      fileType,
      fileSize: Number(fileSize) || 0,
      notes: notes ? notes.trim() : '',
      uploadedBy: req.user._id
    });

    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('uploadedBy', 'name email avatar')
      .populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Bill uploaded successfully!',
      data: { bill: populated }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all personal bills for current user
// @route   GET /api/bills
// @access  Private
exports.getPersonalBills = async (req, res, next) => {
  try {
    const { category, search } = req.query;

    const query = {
      userId: req.user._id,
      groupId: null
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const bills = await Bill.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { bills }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bills for a specific group
// @route   GET /api/bills/group/:groupId
// @access  Private
exports.getGroupBills = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { category, search } = req.query;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user?.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to view bills in this group' });
    }

    const query = { groupId: group._id };
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const bills = await Bill.find(query)
      .populate('uploadedBy', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { bills }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a bill
// @route   DELETE /api/bills/:id
// @access  Private
exports.deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Permission check: Owner or Group Admin
    const isOwner = bill.uploadedBy.toString() === req.user._id.toString();
    
    if (!isOwner) {
      if (bill.groupId) {
        const group = await Group.findById(bill.groupId);
        const isAdmin = group?.members?.some(m => m.user?.toString() === req.user._id.toString() && m.role === 'admin');
        if (!isAdmin) {
          return res.status(403).json({ success: false, message: 'Not authorized to delete this bill' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this bill' });
      }
    }

    await Bill.findByIdAndDelete(bill._id);

    res.status(200).json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
