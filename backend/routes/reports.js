const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// Financial summary report (bond-filtered)
router.get('/financial-summary', auth, bondFilter, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // ROLE-BASED FILTERING
    let bondCondition = '';
    if (req.isDealershipManager) {
      bondCondition = `AND ls.dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      // Suppliers don't have local sales, return empty data
      return res.json({
        data: {
          summary: { total_sales: 0, total_revenue: 0, total_costs: 0, total_profit: 0 },
          paymentBreakdown: [],
          topVehicles: [],
          pendingPayments: { count: 0, total_outstanding: 0 }
        }
      });
    }
    // Admin sees all (no filter)
    
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = `AND ls.sale_date BETWEEN '${start_date}' AND '${end_date}'`;
    }
    
    // Sales summary
    const salesSummary = await db.query(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(selling_price_ugx) as total_revenue,
        SUM(total_cost_ugx) as total_costs,
        SUM(selling_price_ugx - total_cost_ugx) as total_profit,
        AVG(selling_price_ugx - total_cost_ugx) as avg_profit_per_sale,
        MIN(sale_date) as first_sale_date,
        MAX(sale_date) as last_sale_date
      FROM local_sales ls
      WHERE 1=1 ${bondCondition} ${dateFilter}
    `);
    
    // Payment status breakdown
    const paymentBreakdown = await db.query(`
      SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(selling_price_ugx) as total_amount
      FROM local_sales ls
      WHERE 1=1 ${bondCondition} ${dateFilter}
      GROUP BY payment_status
    `);
    
    // Top selling vehicles
    const topVehicles = await db.query(`
      SELECT 
        v.make,
        v.model,
        COUNT(*) as sales_count,
        SUM(ls.selling_price_ugx) as total_revenue
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      WHERE 1=1 ${bondCondition} ${dateFilter}
      GROUP BY v.make, v.model
      ORDER BY sales_count DESC
      LIMIT 10
    `);
    
    // Pending payments
    const pendingPayments = await db.query(`
      SELECT 
        COUNT(*) as count,
        SUM(selling_price_ugx - amount_paid_ugx) as total_outstanding
      FROM local_sales ls
      WHERE payment_status != 'Paid' ${bondCondition}
    `);
    
    res.json({
      data: {
        summary: salesSummary.rows[0],
        paymentBreakdown: paymentBreakdown.rows,
        topVehicles: topVehicles.rows,
        pendingPayments: pendingPayments.rows[0]
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Inventory report (bond-filtered)
router.get('/inventory', auth, bondFilter, async (req, res) => {
  try {
    // ROLE-BASED FILTERING
    let bondCondition = '';
    if (req.isDealershipManager) {
      bondCondition = `WHERE v.dealership_id = ${req.bondId}`;
    } else if (req.isForeignBondUser) {
      bondCondition = `WHERE v.foreign_bond_id = ${req.foreignBondId}`;
    }
    // Admin sees all (no filter)
    
    // Inventory by status
    const byStatus = await db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(purchase_price_usd) as total_value_usd
      FROM vehicles v
      ${bondCondition}
      GROUP BY status
    `);
    
    // Inventory by make
    const byMake = await db.query(`
      SELECT 
        make,
        COUNT(*) as count,
        AVG(purchase_price_usd) as avg_price_usd
      FROM vehicles v
      ${bondCondition}
      GROUP BY make
      ORDER BY count DESC
    `);
    
    // Inventory aging (vehicles not sold)
    const aging = await db.query(`
      SELECT 
        CASE 
          WHEN julianday('now') - julianday(created_at) <= 30 THEN '0-30 days'
          WHEN julianday('now') - julianday(created_at) <= 60 THEN '31-60 days'
          WHEN julianday('now') - julianday(created_at) <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END as age_group,
        COUNT(*) as count
      FROM vehicles v
      WHERE status != 'Sold' ${bondCondition ? 'AND v.dealership_id = ' + req.bondId : ''}
      GROUP BY age_group
    `);
    
    res.json({
      data: {
        byStatus: byStatus.rows,
        byMake: byMake.rows,
        aging: aging.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer report (bond-filtered)
router.get('/customers', auth, bondFilter, async (req, res) => {
  try {
    const bondCondition = req.isBondManager ? `WHERE c.dealership_id = ${req.bondId}` : '';
    
    // Top customers by purchase value
    const topCustomers = await db.query(`
      SELECT 
        c.id,
        c.full_name,
        c.phone,
        COUNT(ls.id) as purchase_count,
        SUM(ls.selling_price_ugx) as total_spent,
        MAX(ls.sale_date) as last_purchase_date
      FROM customers c
      JOIN local_sales ls ON ls.customer_id = c.id
      ${bondCondition}
      GROUP BY c.id, c.full_name, c.phone
      ORDER BY total_spent DESC
      LIMIT 20
    `);
    
    // Customer acquisition trend
    const acquisitionTrend = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers
      FROM customers c
      WHERE created_at >= datetime('now', '-90 days')
      ${bondCondition}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    res.json({
      data: {
        topCustomers: topCustomers.rows,
        acquisitionTrend: acquisitionTrend.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import orders report (bond-filtered)
router.get('/import-orders', auth, bondFilter, async (req, res) => {
  try {
    const bondCondition = req.isBondManager ? `WHERE io.dealership_id = ${req.bondId}` : '';
    
    // Orders by status
    const byStatus = await db.query(`
      SELECT 
        order_status,
        COUNT(*) as count,
        SUM(total_amount_usd) as total_value_usd
      FROM import_orders io
      ${bondCondition}
      GROUP BY order_status
    `);
    
    // Orders by foreign bond
    const byForeignBond = await db.query(`
      SELECT 
        fb.name as bond_name,
        fb.country,
        COUNT(io.id) as order_count,
        SUM(io.total_amount_usd) as total_value_usd
      FROM import_orders io
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      ${bondCondition}
      GROUP BY fb.name, fb.country
      ORDER BY order_count DESC
    `);
    
    // Monthly order trend
    const monthlyTrend = await db.query(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as order_count,
        SUM(total_amount_usd) as total_value_usd
      FROM import_orders io
      WHERE created_at >= datetime('now', '-12 months')
      ${bondCondition}
      GROUP BY month
      ORDER BY month
    `);
    
    res.json({
      data: {
        byStatus: byStatus.rows,
        byForeignBond: byForeignBond.rows,
        monthlyTrend: monthlyTrend.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
