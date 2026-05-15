const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const emailService = require('../services/emailService');
const { checkOrderLimit } = require('../middleware/usageLimits');
const auditLog = require('../middleware/auditLog');

// Get all import orders
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access subscriber operational orders' });
    }

    const { status, foreign_bond_id } = req.query;
    
    let query = `
      SELECT io.*, 
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name,
        (SELECT COALESCE(SUM(ov.quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id) as vehicle_count
      FROM import_orders io
      LEFT JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    // Filter by dealership for dealership managers
    if (req.isDealershipManager) {
      params.push(req.bondId);
      query += ` AND io.dealership_id = $${params.length}`;
    }
    
    // Filter by foreign bond for suppliers
    if (req.isForeignBondUser) {
      params.push(req.foreignBondId);
      query += ` AND io.foreign_bond_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND io.order_status = $${params.length}`;
    }
    
    if (foreign_bond_id && !req.isForeignBondUser) {
      params.push(foreign_bond_id);
      query += ` AND io.foreign_bond_id = $${params.length}`;
    }
    
    query += ' ORDER BY io.created_at DESC';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access subscriber operational orders' });
    }

    const orderResult = await db.query(`
      SELECT io.*, 
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name
      FROM import_orders io
      LEFT JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE io.id = $1
    `, [req.params.id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (req.user.role === 'dealership_manager' && req.user.dealership_id !== order.dealership_id) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }
    if (req.user.role === 'foreign_bond_user' && req.user.foreign_bond_id !== order.foreign_bond_id) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }

    const vehiclesResult = await db.query(`
      SELECT v.*, ov.quantity as ordered_quantity 
      FROM vehicles v
      JOIN order_vehicles ov ON v.id = ov.vehicle_id
      WHERE ov.order_id = $1
    `, [req.params.id]);
    
    // Calculate totals
    const vehicles = vehiclesResult.rows;
    const totalUnits = vehicles.reduce((sum, v) => sum + (parseInt(v.ordered_quantity) || 1), 0);
    const totalAmount = vehicles.reduce((sum, v) => {
      const qty = parseInt(v.ordered_quantity) || 1;
      const price = parseFloat(v.purchase_price_usd) || 0;
      return sum + (price * qty);
    }, 0);

    res.json({
      data: {
        ...order,
        vehicles: vehicles,
        total_units: totalUnits,
        calculated_total_amount: totalAmount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create import order (with usage limit check)
router.post('/', auth, bondFilter, checkOrderLimit, auditLog('import_orders'), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot create subscriber operational orders' });
    }

    const { foreign_bond_id, vehicle_ids, vehicle_quantities, total_amount_usd, notes } = req.body;
    
    // Get dealership_id from authenticated user
    const dealership_id = req.user.dealership_id || req.user.bond_id;
    
    if (!dealership_id) {
      return res.status(403).json({ error: 'Only dealership managers can create orders' });
    }
    
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    
    const orderResult = await db.query(
      `INSERT INTO import_orders (order_number, foreign_bond_id, dealership_id, total_amount_usd, notes, order_status)
       VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *`,
      [orderNumber, foreign_bond_id, dealership_id, total_amount_usd, notes]
    );

    const order = orderResult.rows[0];

    // Link vehicles to order with quantities
    if (vehicle_ids && vehicle_ids.length > 0) {
      for (const vehicleId of vehicle_ids) {
        // Get current vehicle details
        const vehicleResult = await db.query('SELECT quantity, status FROM vehicles WHERE id = $1', [vehicleId]);
        const vehicle = vehicleResult.rows[0];
        
        if (!vehicle) continue;
        
        // Get requested quantity (default to 1 if not specified)
        const requestedQty = vehicle_quantities && vehicle_quantities[vehicleId] 
          ? parseInt(vehicle_quantities[vehicleId]) 
          : 1;
        
        // Check if enough quantity available
        const availableQty = vehicle.quantity || 1;
        if (requestedQty > availableQty) {
          return res.status(400).json({ 
            error: `Not enough quantity for vehicle ID ${vehicleId}. Available: ${availableQty}, Requested: ${requestedQty}` 
          });
        }
        
        // Insert order-vehicle link with quantity
        await db.query(
          'INSERT INTO order_vehicles (order_id, vehicle_id, quantity) VALUES ($1, $2, $3)',
          [order.id, vehicleId, requestedQty]
        );
        
        // NOTE: Inventory is NOT reduced here. It will only be reduced when supplier confirms the order.
      }
      
      // Save database changes
      await db.saveDb();
    }

    // Send notifications to supplier and dealership
    try {
      // Get supplier and dealership details for email
      const supplierResult = await db.query('SELECT * FROM foreign_bonds WHERE id = $1', [foreign_bond_id]);
      const dealershipResult = await db.query('SELECT * FROM dealerships WHERE id = $1', [dealership_id]);
      const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      
      if (supplierResult.rows[0] && userResult.rows[0]) {
        const supplier = supplierResult.rows[0];
        const dealership = dealershipResult.rows[0];
        // Notify supplier of new order
        emailService.sendSupplierOrderReceived(order, dealership, supplier, supplier.contact_email || supplier.email);
      }
    } catch (emailError) {
      console.log('Email notification failed (non-critical):', emailError.message);
    }

    res.status(201).json({ data: order });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status
router.patch('/:id/status', auth, auditLog('import_orders'), async (req, res) => {
  try {
    const { status } = req.body;

    const orderCheck = await db.query(
      'SELECT id, order_status, foreign_bond_id, dealership_id FROM import_orders WHERE id = $1',
      [req.params.id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];

    // Enforce tenant ownership
    if (req.user.role === 'foreign_bond_user' && req.user.foreign_bond_id !== order.foreign_bond_id) {
      return res.status(403).json({ error: 'You can only update orders for your own supplier account' });
    }

    // Role-based permissions:
    // - Supplier confirms with /confirm, then updates the full shipment flow.
    // - Dealership cannot directly update order status.
    if (req.user.role === 'dealership_manager') {
      return res.status(403).json({
        error: 'Dealership cannot update order status directly. Supplier updates all order statuses.'
      });
    }

    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can update order status' });
    }

    const supplierAllowedStatuses = ['Shipped', 'At Border', 'Cleared', 'Delivered', 'Cancelled'];

    if (req.user.role === 'foreign_bond_user' && !supplierAllowedStatuses.includes(status)) {
      return res.status(403).json({
        error: 'Supplier can update status to Shipped, At Border, Cleared, Delivered, or Cancelled.'
      });
    }

    const validTransitions = {
      Confirmed: ['Shipped', 'Cancelled'],
      Shipped: ['At Border', 'Cancelled'],
      'At Border': ['Cleared', 'Cancelled'],
      Cleared: ['Delivered', 'Cancelled']
    };

    if (validTransitions[order.order_status] && !validTransitions[order.order_status].includes(status)) {
      return res.status(400).json({
        error: `Invalid status flow: cannot move from "${order.order_status}" to "${status}".`
      });
    }
    
    // VALIDATION RULES - Industry Standard
    if (status === 'At Border') {
      // Can't mark "At Border" without shipping record
      const shippingCheck = await db.query(
        'SELECT id FROM shipping WHERE order_id = $1',
        [req.params.id]
      );
      if (shippingCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Cannot mark order "At Border" without a shipping record. Please create shipping record first.' 
        });
      }
    }
    
    if (status === 'Cleared') {
      // Can't mark "Cleared" without clearance record with URA declaration
      const clearanceCheck = await db.query(
        'SELECT id, ura_declaration_number FROM border_clearance WHERE order_id = $1',
        [req.params.id]
      );
      if (clearanceCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Cannot mark order "Cleared" without a border clearance record. Please create clearance record first.' 
        });
      }
      if (!clearanceCheck.rows[0].ura_declaration_number) {
        return res.status(400).json({ 
          error: 'Cannot mark order "Cleared" without URA declaration number. Please update clearance record.' 
        });
      }
    }
    
    if (status === 'Delivered') {
      // Can't mark "Delivered" without clearance with release date
      const clearanceCheck = await db.query(
        'SELECT id, release_date FROM border_clearance WHERE order_id = $1',
        [req.params.id]
      );
      if (clearanceCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Cannot mark order "Delivered" without completing border clearance first.' 
        });
      }
      if (!clearanceCheck.rows[0].release_date) {
        return res.status(400).json({ 
          error: 'Cannot mark order "Delivered" without release date. Please update clearance record with release date.' 
        });
      }
    }
    
    const result = await db.query(
      'UPDATE import_orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update vehicles status based on order status
    const statusMap = {
      'Shipped': 'In Transit',
      'At Border': 'At Border',
      'Cleared': 'Cleared',
      'Delivered': 'In Stock'
      // 'Completed' intentionally omitted: supplier vehicle stock is managed by quantity, not order completion status
    };
    
    // Send email notifications based on status
    try {
      const order = result.rows[0];
      const dealershipQuery = await db.query('SELECT id, name, contact_email FROM dealerships WHERE id = $1', [order.dealership_id]);
      const dealership = dealershipQuery.rows[0];
      
      if (dealership && dealership.contact_email) {
        if (status === 'At Border') {
          const clearanceQuery = await db.query('SELECT * FROM border_clearance WHERE order_id = $1', [order.id]);
          if (clearanceQuery.rows.length > 0) {
            await emailService.sendOrderAtBorder(order, clearanceQuery.rows[0], dealership, dealership.contact_email);
          }
        } else if (status === 'Cleared') {
          await emailService.sendOrderCleared(order, dealership, dealership.contact_email);
        } else if (status === 'Delivered') {
          await emailService.sendOrderDelivered(order, dealership, dealership.contact_email);
        }
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the request if email fails
    }
    
    if (statusMap[status]) {
      await db.query(`
        UPDATE vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (SELECT vehicle_id FROM order_vehicles WHERE order_id = $2)
      `, [statusMap[status], req.params.id]);
    }

    // On Delivered: add ordered vehicles to the dealership's inventory
    if (status === 'Delivered') {
      const order = result.rows[0];
      const orderVehiclesResult = await db.query(
        'SELECT ov.vehicle_id, ov.quantity, v.* FROM order_vehicles ov JOIN vehicles v ON v.id = ov.vehicle_id WHERE ov.order_id = $1',
        [req.params.id]
      );
      for (const ov of orderVehiclesResult.rows) {
        const orderedQty = ov.quantity || 1;
        // Check if dealership already has a record for this exact vehicle (from a prior delivery of same order vehicle)
        const existing = await db.query(
          `SELECT id, quantity FROM vehicles WHERE dealership_id = $1 AND foreign_bond_id = $2 AND make = $3 AND model = $4 AND year = $5 AND color = $6 AND source_type = 'import' LIMIT 1`,
          [order.dealership_id, ov.foreign_bond_id, ov.make, ov.model, ov.year, ov.color]
        );
        if (existing.rows.length > 0) {
          // Add to existing dealership record
          await db.query(
            `UPDATE vehicles SET quantity = quantity + $1, status = 'In Stock', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [orderedQty, existing.rows[0].id]
          );
        } else {
          // Create new vehicle record for the dealership
          await db.query(
            `INSERT INTO vehicles (foreign_bond_id, dealership_id, chassis_number, make, model, year, color, engine_cc, fuel_type, transmission, body_type, mileage, purchase_price_usd, sale_price_usd, quantity, status, source_type, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'In Stock', 'import', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              ov.foreign_bond_id, order.dealership_id,
              ov.chassis_number ? `${ov.chassis_number}-D${order.dealership_id}` : null,
              ov.make, ov.model, ov.year, ov.color,
              ov.engine_cc, ov.fuel_type, ov.transmission, ov.body_type,
              ov.mileage, ov.purchase_price_usd, ov.sale_price_usd,
              orderedQty
            ]
          );
        }
      }
    }
    
    // Note: Shipping and border clearance records must be created manually by users
    
    // If order is cancelled, restore inventory using actual ordered quantity
    if (status === 'Cancelled') {
      const vehicleIds = await db.query(
        'SELECT vehicle_id, quantity FROM order_vehicles WHERE order_id = $1',
        [req.params.id]
      );
      
      for (const row of vehicleIds.rows) {
        const orderedQty = row.quantity || 1;
        await db.query(
          `UPDATE vehicles 
           SET status = 'Available', 
               quantity = quantity + $1, 
               dealership_id = NULL,
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [orderedQty, row.vehicle_id]
        );
      }
    }
    
    // Save database changes
    await db.saveDb();

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Confirm order (supplier action) - reduces inventory
router.patch('/:id/confirm', auth, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can confirm orders' });
    }

    const orderId = req.params.id;
    
    // Check order exists
    const orderResult = await db.query('SELECT * FROM import_orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    // Only allow confirming pending orders
    if (order.order_status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending orders can be confirmed' });
    }
    
    // Verify user is the supplier for this order
    if (req.user.foreign_bond_id && req.user.foreign_bond_id !== order.foreign_bond_id) {
      return res.status(403).json({ error: 'You can only confirm orders for your own bond' });
    }
    
    // Get all vehicles in this order
    const orderVehicles = await db.query(
      'SELECT vehicle_id, quantity FROM order_vehicles WHERE order_id = $1',
      [orderId]
    );
    
    // Reduce inventory for each vehicle
    for (const ov of orderVehicles.rows) {
      const vehicleId = ov.vehicle_id;
      const requestedQty = ov.quantity || 1;
      
      // Get current vehicle details
      const vehicleResult = await db.query('SELECT quantity, status FROM vehicles WHERE id = $1', [vehicleId]);
      const vehicle = vehicleResult.rows[0];
      
      if (!vehicle) continue;
      
      const availableQty = vehicle.quantity || 0;
      
      // Check if enough quantity still available
      if (requestedQty > availableQty) {
        return res.status(400).json({ 
          error: `Not enough quantity for vehicle ID ${vehicleId}. Available: ${availableQty}, Requested: ${requestedQty}` 
        });
      }
      
      // Reduce inventory
      const newQuantity = availableQty - requestedQty;
      if (newQuantity > 0) {
        // Still have quantity left, just reduce it
        await db.query(
          'UPDATE vehicles SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newQuantity, vehicleId]
        );
      } else {
        // No quantity left, mark as ordered
        await db.query(
          'UPDATE vehicles SET quantity = 0, status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['ordered', vehicleId]
        );
      }
    }
    
    // Update order status to Confirmed
    const result = await db.query(
      'UPDATE import_orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['Confirmed', orderId]
    );
    
    // Save database changes
    await db.saveDb();

    // Send confirmation email to dealership
    try {
      const dealershipResult = await db.query('SELECT * FROM dealerships WHERE id = $1', [order.dealership_id]);
      const supplierResult = await db.query('SELECT * FROM foreign_bonds WHERE id = $1', [order.foreign_bond_id]);
      const dealershipEmail = await db.query('SELECT email FROM users WHERE dealership_id = $1 LIMIT 1', [order.dealership_id]);
      
      if (dealershipResult.rows[0] && supplierResult.rows[0] && dealershipEmail.rows[0]) {
        const dealership = dealershipResult.rows[0];
        const supplier = supplierResult.rows[0];
        emailService.sendOrderConfirmedBySupplier(order, supplier, dealership, dealershipEmail.rows[0].email);
      }
    } catch (emailError) {
      console.log('Email notification failed (non-critical):', emailError.message);
    }
    
    res.json({ data: result.rows[0], message: 'Order confirmed and inventory updated' });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update entire order (vehicles, amount, notes)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Only dealership can edit orders' });
    }

    const { vehicle_ids, vehicle_quantities, total_amount_usd, notes } = req.body;
    const orderId = req.params.id;
    
    // Check order exists and get current details
    const orderResult = await db.query('SELECT * FROM import_orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];

    if (req.user.dealership_id !== order.dealership_id) {
      return res.status(403).json({ error: 'You can only edit your own dealership orders' });
    }
    
    // Only allow editing pending/confirmed orders
    if (!['Pending', 'Confirmed'].includes(order.order_status)) {
      return res.status(400).json({ error: 'Cannot edit order in current status' });
    }
    
    // Get existing vehicle assignments with quantities
    const existingVehicles = await db.query(
      'SELECT vehicle_id, quantity FROM order_vehicles WHERE order_id = $1',
      [orderId]
    );
    
    // Restore previously assigned vehicles' quantities
    for (const row of existingVehicles.rows) {
      const orderedQty = row.quantity || 1;
      await db.query(
        `UPDATE vehicles 
         SET status = 'Available', 
             quantity = quantity + $1, 
             dealership_id = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [orderedQty, row.vehicle_id]
      );
    }
    
    // Remove old vehicle assignments
    await db.query('DELETE FROM order_vehicles WHERE order_id = $1', [orderId]);
    
    // Add new vehicle assignments with quantities
    if (vehicle_ids && vehicle_ids.length > 0) {
      for (const vehicleId of vehicle_ids) {
        const vehicleResult = await db.query('SELECT quantity, status FROM vehicles WHERE id = $1', [vehicleId]);
        const vehicle = vehicleResult.rows[0];
        
        if (!vehicle) continue;
        
        // Get requested quantity
        const requestedQty = vehicle_quantities && vehicle_quantities[vehicleId] 
          ? parseInt(vehicle_quantities[vehicleId]) 
          : 1;
        
        // Check availability
        const availableQty = vehicle.quantity || 1;
        if (requestedQty > availableQty) {
          return res.status(400).json({ 
            error: `Not enough quantity for vehicle ID ${vehicleId}. Available: ${availableQty}, Requested: ${requestedQty}` 
          });
        }
        
        // Insert order-vehicle link with quantity
        await db.query(
          'INSERT INTO order_vehicles (order_id, vehicle_id, quantity) VALUES ($1, $2, $3)',
          [orderId, vehicleId, requestedQty]
        );
        
        // Update vehicle quantity
        const newQuantity = availableQty - requestedQty;
        if (newQuantity > 0) {
          await db.query(
            'UPDATE vehicles SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newQuantity, vehicleId]
          );
        } else {
          await db.query(
            'UPDATE vehicles SET quantity = 0, status = $1, dealership_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['ordered', order.dealership_id, vehicleId]
          );
        }
      }
    }
    
    // Update order details
    const updateResult = await db.query(
      `UPDATE import_orders 
       SET total_amount_usd = $1, notes = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [total_amount_usd, notes, orderId]
    );
    
    await db.saveDb();
    
    res.json({ data: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete order
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Only dealership can delete orders' });
    }

    const orderId = req.params.id;
    
    // Check order exists
    const orderResult = await db.query('SELECT * FROM import_orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];

    if (req.user.dealership_id !== order.dealership_id) {
      return res.status(403).json({ error: 'You can only delete your own dealership orders' });
    }
    
    // Only allow deleting pending orders
    if (order.order_status !== 'Pending') {
      return res.status(400).json({ error: 'Can only delete pending orders' });
    }
    
    // Get vehicle assignments
    const vehicleIds = await db.query(
      'SELECT vehicle_id FROM order_vehicles WHERE order_id = $1',
      [orderId]
    );
    
    // Restore vehicles to available
    for (const row of vehicleIds.rows) {
      await db.query(
        `UPDATE vehicles 
         SET status = 'Available', 
             quantity = quantity + 1, 
             dealership_id = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [row.vehicle_id]
      );
    }
    
    // Delete order-vehicle links
    await db.query('DELETE FROM order_vehicles WHERE order_id = $1', [orderId]);
    
    // Delete tracking events
    await db.query('DELETE FROM tracking_events WHERE order_id = $1', [orderId]);
    
    // Delete order
    await db.query('DELETE FROM import_orders WHERE id = $1', [orderId]);
    
    await db.saveDb();
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record a payment against an import order (dealership pays supplier)
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Only dealership can record payments on import orders' });
    }

    const orderId = req.params.id;
    const { amount_paid_usd, payment_notes } = req.body;

    if (amount_paid_usd === undefined || isNaN(Number(amount_paid_usd))) {
      return res.status(400).json({ error: 'amount_paid_usd is required and must be a number' });
    }

    const orderResult = await db.query('SELECT * FROM import_orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderResult.rows[0];
    if (order.dealership_id !== req.user.dealership_id) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }

    const paid = Number(amount_paid_usd);
    const total = Number(order.total_amount_usd) || 0;
    let payment_status = 'Unpaid';
    if (paid >= total) payment_status = 'Paid';
    else if (paid > 0) payment_status = 'Partial';

    const result = await db.query(
      `UPDATE import_orders SET amount_paid_usd=$1, payment_status=$2, payment_notes=$3 WHERE id=$4 RETURNING *`,
      [paid, payment_status, payment_notes || null, orderId]
    );

    await db.saveDb();
    res.json({ data: result.rows[0], message: 'Payment recorded successfully' });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
