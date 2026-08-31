const CustomerOrder = require('../models/CustomerOrder');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { logActivity } = require('../utils/logActivity');

// @desc    Create a new customer advance order (Booking)
// @route   POST /api/customer-orders
const createCustomerOrder = async (req, res) => {
  try {
    const { customerId, items, deliveryDate, assignedVehicle, remarks } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer is required for order booking' });
    }

    if (!items || !items.length) {
      return res.status(400).json({ message: 'At least one product item is required' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Process & validate items
    let totalCases = 0;
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ message: `Invalid quantity for product ${product.name}` });
      }

      const unitPrice = Number(item.unitPrice || product.sellingPrice);
      const itemTotal = qty * unitPrice;

      totalCases += qty;
      totalAmount += itemTotal;

      processedItems.push({
        product: product._id,
        productName: product.name,
        size: product.size,
        unitType: item.unitType || 'Box',
        quantity: qty,
        unitPrice,
        totalAmount: itemTotal
      });
    }

    // Generate unique order number (e.g. ORD-20260819-001)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await CustomerOrder.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    const orderNumber = `ORD-${dateStr}-${String(countToday + 1).padStart(3, '0')}`;

    const order = await CustomerOrder.create({
      orderNumber,
      customer: customer._id,
      bookedBy: req.user._id,
      assignedVehicle: assignedVehicle || null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
      items: processedItems,
      totalCases,
      totalAmount,
      status: 'Booked',
      remarks
    });

    await logActivity({
      user: req.user._id,
      action: 'CREATE',
      module: 'CustomerOrder',
      details: `Booked Advance Order ${orderNumber} for ${customer.shopName} (${totalCases} Cases, ₹${totalAmount})`,
      targetId: order._id,
      targetModel: 'CustomerOrder',
      req
    });

    const populatedOrder = await CustomerOrder.findById(order._id)
      .populate('customer', 'shopName ownerName phone address')
      .populate('bookedBy', 'name phone')
      .populate('assignedVehicle', 'vehicleNumber vehicleName');

    res.status(201).json({
      message: `Advance order ${orderNumber} booked successfully! 📋`,
      order: populatedOrder
    });
  } catch (error) {
    console.error('Error creating customer order:', error);
    res.status(500).json({ message: error.message || 'Failed to book customer order' });
  }
};

// @desc    Get all customer orders with filters
// @route   GET /api/customer-orders
const getCustomerOrders = async (req, res) => {
  try {
    const { status, customerId, workerId, startDate, endDate } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (customerId) {
      filter.customer = customerId;
    }

    if (workerId) {
      filter.bookedBy = workerId;
    } else if (req.user.role === 'worker') {
      // Workers see their own booked orders or all assigned route orders
      filter.bookedBy = req.user._id;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await CustomerOrder.find(filter)
      .populate('customer', 'shopName ownerName phone address')
      .populate('bookedBy', 'name phone')
      .populate('assignedVehicle', 'vehicleNumber vehicleName')
      .populate('items.product', 'name size sellingPrice image')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ message: 'Failed to fetch customer orders' });
  }
};

// @desc    Get single order details by ID
// @route   GET /api/customer-orders/:id
const getCustomerOrderById = async (req, res) => {
  try {
    const order = await CustomerOrder.findById(req.params.id)
      .populate('customer')
      .populate('bookedBy', 'name phone email')
      .populate('assignedVehicle', 'vehicleNumber vehicleName')
      .populate('items.product')
      .populate('sale');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
};

// @desc    Get aggregated demand summary for pending Booked orders (Used by Warehouse Vehicle Loading)
// @route   GET /api/customer-orders/demand-summary
const getCustomerOrdersDemandSummary = async (req, res) => {
  try {
    const activeOrders = await CustomerOrder.find({ status: 'Booked' })
      .populate('items.product', 'name size sellingPrice warehouseStock');

    const demandMap = {};
    let totalBookedCases = 0;
    let totalBookedOrdersCount = activeOrders.length;

    activeOrders.forEach(order => {
      order.items.forEach(item => {
        const prodId = item.product?._id ? String(item.product._id) : String(item.product);
        if (!demandMap[prodId]) {
          demandMap[prodId] = {
            product: item.product,
            productName: item.productName || item.product?.name,
            size: item.size || item.product?.size,
            sellingPrice: item.unitPrice || item.product?.sellingPrice,
            totalQuantity: 0,
            ordersCount: 0
          };
        }
        demandMap[prodId].totalQuantity += Number(item.quantity || 0);
        demandMap[prodId].ordersCount += 1;
        totalBookedCases += Number(item.quantity || 0);
      });
    });

    const summaryList = Object.values(demandMap);

    res.json({
      totalBookedOrdersCount,
      totalBookedCases,
      demandList: summaryList
    });
  } catch (error) {
    console.error('Error generating demand summary:', error);
    res.status(500).json({ message: 'Failed to generate demand summary' });
  }
};

// @desc    Cancel a customer order
// @route   PUT /api/customer-orders/:id/cancel
const cancelCustomerOrder = async (req, res) => {
  try {
    const order = await CustomerOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'Delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }

    order.status = 'Cancelled';
    if (req.body.remarks) {
      order.remarks = (order.remarks ? order.remarks + ' | ' : '') + `Cancelled: ${req.body.remarks}`;
    }
    await order.save();

    await logActivity({
      user: req.user._id,
      action: 'UPDATE',
      module: 'CustomerOrder',
      details: `Cancelled Order ${order.orderNumber}`,
      targetId: order._id,
      targetModel: 'CustomerOrder',
      req
    });

    res.json({ message: `Order ${order.orderNumber} has been cancelled`, order });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};

// @desc    Update customer order status (e.g. Loaded_In_Van or Delivered)
// @route   PUT /api/customer-orders/:id/status
const updateCustomerOrderStatus = async (req, res) => {
  try {
    const { status, saleId, assignedVehicle } = req.body;
    const order = await CustomerOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status) order.status = status;
    if (saleId) order.sale = saleId;
    if (assignedVehicle) order.assignedVehicle = assignedVehicle;

    await order.save();

    res.json({ message: `Order status updated to ${order.status}`, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

module.exports = {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerOrdersDemandSummary,
  cancelCustomerOrder,
  updateCustomerOrderStatus
};
