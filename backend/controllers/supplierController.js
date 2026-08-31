const Supplier = require('../models/Supplier');
const { logActivity } = require('../utils/logActivity');

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch suppliers' });
  }
};

const createSupplier = async (req, res) => {
  const { name, contactPerson, phone, email, address, gstNumber } = req.body;

  const supplier = new Supplier({
    name,
    contactPerson,
    phone,
    email,
    address,
    gstNumber
  });

  await supplier.save();
  await logActivity({ req, user: req.user, action: 'Create Supplier', details: `Added supplier ${name}` });

  res.status(201).json(supplier);
};

const updateSupplier = async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

  Object.assign(supplier, req.body);
  await supplier.save();
  await logActivity({ req, user: req.user, action: 'Update Supplier', details: `Updated supplier ${supplier.name}` });

  res.json(supplier);
};

const deleteSupplier = async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

  await Supplier.findByIdAndDelete(req.params.id);
  await logActivity({ req, user: req.user, action: 'Delete Supplier', details: `Deleted supplier ${supplier.name}` });

  res.json({ message: 'Supplier removed' });
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
