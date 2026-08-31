const Product = require('../models/Product');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { size: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const products = await Product.find(query).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create new product (Case-based)
// @desc    Create new product (Box & Hanger based)
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      boxPrice,
      sellingPrice, // Box Price alias
      hangersPerBox,
      sellFullBox = true,
      sellIndividualHanger = true,
      sealedBoxStock,
      warehouseStock, // Sealed box stock alias
      looseHangerStock = 0,
      purchasePrice
    } = req.body;

    const rawBoxPrice = boxPrice !== undefined && boxPrice !== null && boxPrice !== '' 
      ? Number(boxPrice) 
      : (sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== '' ? Number(sellingPrice) : null);

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product Name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (rawBoxPrice === null || isNaN(rawBoxPrice) || rawBoxPrice <= 0) {
      return res.status(400).json({ message: 'Box Price must be greater than 0' });
    }

    const cleanCostPrice = Number(purchasePrice || 0);
    if (cleanCostPrice > 0 && rawBoxPrice <= cleanCostPrice) {
      return res.status(400).json({
        message: `⛔ Selling Price (₹${rawBoxPrice.toFixed(2)}) cannot be less than or equal to Cost Price (₹${cleanCostPrice.toFixed(2)}). Selling price must be strictly greater than cost price.`
      });
    }

    const cleanHangersPerBox = Number(hangersPerBox || 24);
    if (isNaN(cleanHangersPerBox) || cleanHangersPerBox <= 0) {
      return res.status(400).json({ message: 'Hangers in 1 Box must be greater than 0' });
    }

    const cleanHangerPrice = Number((rawBoxPrice / cleanHangersPerBox).toFixed(2));
    const cleanSealedStock = Number(sealedBoxStock !== undefined ? sealedBoxStock : (warehouseStock !== undefined ? warehouseStock : 0));
    const cleanLooseStock = Number(looseHangerStock || 0);

    // Prevent duplicate product creation with same name
    const existing = await Product.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      status: 'Active'
    });

    if (existing) {
      return res.status(400).json({ 
        message: `Product "${existing.name}" already exists in catalog. Please edit the existing product or delete it before re-adding.` 
      });
    }

    const cleanSku = `BAL-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const product = new Product({
      name: name.trim(),
      brand: 'Balaji',
      category: category.trim(),
      sku: cleanSku,
      boxPrice: rawBoxPrice,
      sellingPrice: rawBoxPrice,
      hangersPerBox: cleanHangersPerBox,
      hangerPrice: cleanHangerPrice,
      sellFullBox: Boolean(sellFullBox),
      sellIndividualHanger: Boolean(sellIndividualHanger),
      sealedBoxStock: cleanSealedStock,
      warehouseStock: cleanSealedStock,
      looseHangerStock: cleanLooseStock,
      purchasePrice: Number(purchasePrice || 0),
      unit: 'Box',
      crateQuantity: cleanHangersPerBox,
      status: 'Active'
    });

    const createdProduct = await product.save();
    await logActivity({ req, user: req.user, action: 'Create Product', details: `Added product ${createdProduct.name} (Box: ₹${createdProduct.boxPrice}, Hangers/Box: ${createdProduct.hangersPerBox}, Hanger: ₹${createdProduct.hangerPrice})` });

    res.status(201).json(createdProduct);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: err.message || 'Failed to create product' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const fields = [
      'name',
      'category',
      'boxPrice',
      'sellingPrice',
      'hangersPerBox',
      'sellFullBox',
      'sellIndividualHanger',
      'sealedBoxStock',
      'warehouseStock',
      'looseHangerStock',
      'purchasePrice',
      'status'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.boxPrice !== undefined || req.body.sellingPrice !== undefined) {
      const p = Number(req.body.boxPrice !== undefined ? req.body.boxPrice : req.body.sellingPrice);
      product.boxPrice = p;
      product.sellingPrice = p;
    }
    if (req.body.sealedBoxStock !== undefined || req.body.warehouseStock !== undefined) {
      const s = Number(req.body.sealedBoxStock !== undefined ? req.body.sealedBoxStock : req.body.warehouseStock);
      product.sealedBoxStock = s;
      product.warehouseStock = s;
    }
    if (product.hangersPerBox > 0 && product.boxPrice > 0) {
      product.hangerPrice = Number((product.boxPrice / product.hangersPerBox).toFixed(2));
    }

    const cP = Number(product.purchasePrice || 0);
    const bP = Number(product.boxPrice || 0);
    if (cP > 0 && bP <= cP) {
      return res.status(400).json({
        message: `⛔ Selling Price (₹${bP.toFixed(2)}) cannot be less than or equal to Cost Price (₹${cP.toFixed(2)}). Selling price must be strictly greater than cost price.`
      });
    }

    const updatedProduct = await product.save();
    await logActivity({ req, user: req.user, action: 'Update Product', details: `Updated product ${updatedProduct.name}` });

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    await logActivity({ req, user: req.user, action: 'Delete Product', details: `Deleted product ${product.name}` });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear All Products
// @route   DELETE /api/products/clear-all
const clearAllProducts = async (req, res) => {
  try {
    await Product.deleteMany({});
    await logActivity({ req, user: req.user, action: 'Clear All Products', details: 'Cleared all items from products catalog' });
    res.json({ message: 'All items removed from catalog successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  clearAllProducts
};
