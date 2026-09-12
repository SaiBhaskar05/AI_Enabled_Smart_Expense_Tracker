const Category = require('../models/Category');

// @desc   Get all categories for user
// @route  GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

// @desc   Create category
// @route  POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const existing = await Category.findOne({ userId: req.user._id, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    const category = await Category.create({ userId: req.user._id, name, icon: icon || '📦', color: color || '#6366f1' });
    res.status(201).json({ success: true, message: 'Category created', data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// @desc   Update category
// @route  PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category updated', data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

// @desc   Delete category
// @route  DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    if (category.isDefault) return res.status(400).json({ success: false, message: 'Cannot delete default categories' });
    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
