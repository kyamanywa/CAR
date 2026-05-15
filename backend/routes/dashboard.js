const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

function buildScopedCondition(req, column, joiner = 'AND') {
  if (req.isDealershipManager) {
    return ` ${joiner} ${column} = ${req.bondId}`;
  }

  if (req.isForeignBondUser) {
    return ` ${joiner} ${column} = ${req.foreignBondId}`;
  }

  return '';
}

// Get main dashboard stats (bond-filtered for managers)
router.get('/stats', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    const { from, to } = req.query;
    const dateClause = from && to ? ` AND sale_date BETWEEN '${from}' AND '${to}'` : '';
    const orderDateClause = from && to ? ` AND created_at BETWEEN '${from}' AND '${to} 23:59:59'` : '';

    let vehicleFilter = '';
    let orderFilter = '';
    let salesFilter = '';
    
    // ROLE-BASED FILTERING
    if (req.isDealershipManager) {
      // Dealerships see their own inventory
      vehicleFilter = `WHERE dealership_id = ${req.bondId}`;
      orderFilter = `WHERE dealership_id = ${req.bondId}`;
      salesFilter = `WHERE dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      // Suppliers see their own vehicles
      vehicleFilter = `WHERE foreign_bond_id = ${req.foreignBondId}`;
      orderFilter = `WHERE foreign_bond_id = ${req.foreignBondId}`;
      salesFilter = `WHERE 1=0`; // Suppliers don't have local sales
    }
    // Admin sees everything (no filter)
    
    const soldUnitsSubquery = req.isDealershipManager
      ? `(SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) FROM local_sales WHERE dealership_id = ${req.bondId})`
      : `0`;

    const vehicles = db.query(`
      SELECT 
        COALESCE(SUM(quantity), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'Available' THEN quantity ELSE 0 END), 0) as available,
        COALESCE(SUM(CASE WHEN status = 'In Transit' THEN quantity ELSE 0 END), 0) as in_transit,
        COALESCE(SUM(CASE WHEN status = 'At Border' THEN quantity ELSE 0 END), 0) as at_border,
        COALESCE(SUM(CASE WHEN status = 'In Stock' THEN quantity ELSE 0 END), 0) as in_stock,
        ${soldUnitsSubquery} as sold
      FROM vehicles
      ${vehicleFilter}
    `);
    
    const orders = db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN order_status = 'Shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN order_status = 'At Border' THEN 1 ELSE 0 END) as at_border,
        SUM(CASE WHEN order_status = 'Cleared' THEN 1 ELSE 0 END) as cleared,
        SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END) as delivered
      FROM import_orders
      ${orderFilter}
    `);
    
    const sales = db.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(selling_price_ugx), 0) as total_revenue,
        COALESCE(SUM(selling_price_ugx - total_cost_ugx), 0) as total_profit,
        COALESCE(AVG(selling_price_ugx - total_cost_ugx), 0) as avg_profit
      FROM local_sales
      ${salesFilter}${salesFilter ? dateClause.replace(' AND ', ' AND ') : (dateClause ? 'WHERE 1=1' + dateClause : '')}
    `);
    
    // Bond counts - only for admin
    const bonds = req.isAdmin ? 
      db.query(`
        SELECT 
          (SELECT COUNT(*) FROM foreign_bonds WHERE status = 'Active') as foreign_active,
          (SELECT COUNT(*) FROM dealerships WHERE status = 'Active') as ugandan_active
      `) :
      db.query(`SELECT 0 as foreign_active, 0 as ugandan_active`);

    res.json({
      data: {
        vehicles: vehicles.rows[0],
        orders: orders.rows[0],
        sales: sales.rows[0],
        bonds: bonds.rows[0]
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pipeline data for chart (bond-filtered)
router.get('/pipeline', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    let whereClause = '';
    if (req.isDealershipManager) {
      whereClause = `WHERE dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      whereClause = `WHERE foreign_bond_id = ${req.foreignBondId}`;
    }
    
    const soldUnitsQuery = req.isDealershipManager
      ? `SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) as sold_units FROM local_sales WHERE dealership_id = ${req.bondId}`
      : `SELECT 0 as sold_units`;

    const result = db.query(`
      SELECT 'Available' as stage, COALESCE(SUM(quantity), 0) as count FROM vehicles ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'Available'
      UNION ALL
      SELECT 'Ordered', COALESCE(SUM(quantity), 0) FROM vehicles ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'Ordered'
      UNION ALL
      SELECT 'In Transit', COALESCE(SUM(quantity), 0) FROM vehicles ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'In Transit'
      UNION ALL
      SELECT 'At Border', COALESCE(SUM(quantity), 0) FROM vehicles ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'At Border'
      UNION ALL
      SELECT 'In Stock', COALESCE(SUM(quantity), 0) FROM vehicles ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'In Stock'
      UNION ALL
      SELECT 'Sold', sold_units FROM (${soldUnitsQuery}) s
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent orders (bond-filtered)
router.get('/recent-orders', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    let whereClause = '';
    if (req.isDealershipManager) {
      whereClause = `WHERE io.dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      whereClause = `WHERE io.foreign_bond_id = ${req.foreignBondId}`;
    }
    
    const result = db.query(`
      SELECT io.*, 
        fb.name as foreign_bond_name,
        fb.country as origin_country,
        d.name as dealership_name,
        (SELECT COALESCE(SUM(ov.quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id) as vehicle_count,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id) as total_units
      FROM import_orders io
      LEFT JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      ${whereClause}
      ORDER BY io.created_at DESC
      LIMIT 5
    `);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Dashboard recent orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent sales (bond-filtered)
router.get('/recent-sales', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    let whereClause = '';
    if (req.isDealershipManager) {
      whereClause = `WHERE ls.dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      // Suppliers don't have sales
      return res.json({ data: [] });
    }
    
    const result = db.query(`
      SELECT ls.*, v.make, v.model, v.year, c.full_name as customer_name,
        d.name as dealership_name
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      JOIN customers c ON ls.customer_id = c.id
      LEFT JOIN dealerships d ON ls.dealership_id = d.id
      ${whereClause}
      ORDER BY ls.sale_date DESC
      LIMIT 5
    `);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Dashboard recent sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sales analytics (bond-filtered)
router.get('/analytics/sales', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    const { period } = req.query;
    let interval = '-30 days';
    if (period === 'week') interval = '-7 days';
    if (period === 'quarter') interval = '-90 days';
    if (period === 'year') interval = '-365 days';

    if (req.isForeignBondUser) {
      return res.json({
        data: {
          sales_over_time: [],
          sales_by_make: [],
          sales_by_model: [],
          sales_by_color: [],
          payment_status: []
        }
      });
    }

    const salesCondition = buildScopedCondition(req, 'ls.dealership_id');
    
    const salesOverTime = db.query(`
      SELECT DATE(sale_date) as date, 
        COUNT(*) as sales_count,
        SUM(selling_price_ugx) as revenue_ugx,
        SUM(selling_price_ugx - total_cost_ugx) as profit_ugx
      FROM local_sales ls
      WHERE sale_date >= datetime('now', '${interval}')
      ${salesCondition}
      GROUP BY DATE(sale_date)
      ORDER BY date
    `);
    
    const salesByMake = db.query(`
      SELECT v.make, COUNT(*) as count
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      WHERE ls.sale_date >= datetime('now', '${interval}')
      ${salesCondition}
      GROUP BY v.make
      ORDER BY count DESC
      LIMIT 10
    `);

    const salesByModel = db.query(`
      SELECT v.make, v.model, COUNT(*) as count
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      WHERE ls.sale_date >= datetime('now', '${interval}')
      ${salesCondition}
      GROUP BY v.make, v.model
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const salesByColor = db.query(`
      SELECT v.color, COUNT(*) as count
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      WHERE ls.sale_date >= datetime('now', '${interval}')
      ${salesCondition}
      GROUP BY v.color
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const paymentStatus = db.query(`
      SELECT payment_status, COUNT(*) as count, COALESCE(SUM(selling_price_ugx), 0) as amount
      FROM local_sales ls
      WHERE sale_date >= datetime('now', '${interval}')
      ${salesCondition}
      GROUP BY payment_status
    `);

    res.json({
      data: {
        sales_over_time: salesOverTime.rows,
        sales_by_make: salesByMake.rows,
        sales_by_model: salesByModel.rows,
        sales_by_color: salesByColor.rows,
        payment_status: paymentStatus.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import analytics (bond-filtered)
router.get('/analytics/imports', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    const { period } = req.query;
    let interval = '-30 days';
    if (period === 'week') interval = '-7 days';
    if (period === 'quarter') interval = '-90 days';
    if (period === 'year') interval = '-365 days';

    const importCondition = req.isDealershipManager
      ? buildScopedCondition(req, 'io.dealership_id')
      : buildScopedCondition(req, 'io.foreign_bond_id');
    
    const ordersOverTime = db.query(`
      SELECT DATE(io.created_at) as date, 
        COUNT(*) as order_count,
        SUM((SELECT COALESCE(SUM(ov.quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id)) as vehicle_count,
        SUM(io.total_amount_usd) as total_value_usd
      FROM import_orders io
      WHERE io.created_at >= datetime('now', '${interval}')
      ${importCondition}
      GROUP BY DATE(io.created_at)
      ORDER BY date
    `);
    
    const ordersByCountry = db.query(`
      SELECT fb.country, COUNT(*) as count
      FROM import_orders io
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      WHERE io.created_at >= datetime('now', '${interval}')
      ${importCondition}
      GROUP BY fb.country
      ORDER BY count DESC
    `);
    
    const ordersByStatus = db.query(`
      SELECT order_status, COUNT(*) as count
      FROM import_orders io
      WHERE io.created_at >= datetime('now', '${interval}')
      ${importCondition}
      GROUP BY order_status
      ORDER BY count DESC
    `);
    
    const avgTransitDays = db.query(`
      SELECT AVG(
        CAST(
          (julianday(COALESCE(s.delivered_date, datetime('now'))) - julianday(s.departure_date)) 
          AS INTEGER
        )
      ) as avg_transit_days
      FROM import_orders io
      LEFT JOIN shipping s ON s.order_id = io.id
      WHERE io.created_at >= datetime('now', '${interval}')
      AND s.departure_date IS NOT NULL
      ${importCondition}
    `);

    // For suppliers: Most imported makes and models
    let mostImportedMakes = { rows: [] };
    let mostImportedModels = { rows: [] };
    
    if (req.isForeignBondUser) {
      mostImportedMakes = db.query(`
        SELECT v.make, COUNT(*) as count
        FROM vehicles v
        WHERE v.foreign_bond_id = ${req.foreignBondId}
        GROUP BY v.make
        ORDER BY count DESC
        LIMIT 10
      `);

      mostImportedModels = db.query(`
        SELECT v.make, v.model, COUNT(*) as count
        FROM vehicles v
        WHERE v.foreign_bond_id = ${req.foreignBondId}
        GROUP BY v.make, v.model
        ORDER BY count DESC
        LIMIT 10
      `);
    }

    res.json({
      data: {
        orders_over_time: ordersOverTime.rows,
        orders_by_country: ordersByCountry.rows,
        orders_by_status: ordersByStatus.rows,
        avg_transit_days: avgTransitDays.rows[0]?.avg_transit_days || null,
        most_imported_makes: mostImportedMakes.rows,
        most_imported_models: mostImportedModels.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Inventory analytics (bond-filtered)
router.get('/analytics/inventory', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant dashboard data' });
    }

    let inventoryWhere = '';
    let vehicleCondition = '';

    if (req.isDealershipManager) {
      inventoryWhere = `WHERE dealership_id = ${req.bondId}`;
      vehicleCondition = `WHERE v.dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      inventoryWhere = `WHERE foreign_bond_id = ${req.foreignBondId}`;
      vehicleCondition = `WHERE v.foreign_bond_id = ${req.foreignBondId}`;
    }
    
    const byStatus = db.query(`
      SELECT status, COUNT(*) as count
      FROM vehicles
      ${inventoryWhere}
      GROUP BY status
    `);
    
    const byMake = db.query(`
      SELECT make, COUNT(*) as count
      FROM vehicles
      ${inventoryWhere}
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const byOrigin = db.query(`
      SELECT fb.country, COUNT(*) as count
      FROM vehicles v
      JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      ${vehicleCondition}
      GROUP BY fb.country
    `);
    
    const avgPrice = db.query(`
      SELECT make, ROUND(AVG(purchase_price_usd), 2) as avg_price
      FROM vehicles v
      ${vehicleCondition}
      GROUP BY make
      ORDER BY avg_price DESC
    `);

    res.json({
      data: {
        byStatus: byStatus.rows,
        byMake: byMake.rows,
        byOrigin: byOrigin.rows,
        avgPrice: avgPrice.rows
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
