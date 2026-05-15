const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

function buildBetweenClause(field, startDate, endDate) {
  if (startDate && endDate) {
    return ` AND ${field} BETWEEN '${startDate}' AND '${endDate}'`;
  }

  return '';
}

router.get('/financial-management', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant financial management reports' });
    }

    const { start_date, end_date } = req.query;

    if (req.isForeignBondUser) {
      const orderDateFilter = buildBetweenClause('io.created_at', start_date, end_date);
      const inventoryDateFilter = buildBetweenClause('v.created_at', start_date, end_date);

      const summaryResult = await db.query(`
        SELECT
          (SELECT COALESCE(SUM(v.quantity), 0)
           FROM vehicles v
           WHERE v.foreign_bond_id = $1) as active_inventory_units,
          (SELECT COALESCE(SUM(v.purchase_price_usd * COALESCE(v.quantity, 1)), 0)
           FROM vehicles v
           WHERE v.foreign_bond_id = $1) as inventory_cost_usd,
          (SELECT COALESCE(SUM(CASE WHEN io.order_status = 'Pending' THEN 1 ELSE 0 END), 0)
           FROM import_orders io
           WHERE io.foreign_bond_id = $1) as pending_orders,
          (SELECT COALESCE(SUM(CASE WHEN io.order_status = 'Confirmed' THEN 1 ELSE 0 END), 0)
           FROM import_orders io
           WHERE io.foreign_bond_id = $1) as confirmed_orders,
          (SELECT COALESCE(SUM(CASE WHEN io.order_status = 'Shipped' THEN 1 ELSE 0 END), 0)
           FROM import_orders io
           WHERE io.foreign_bond_id = $1) as shipped_orders,
          (SELECT COALESCE(SUM(io.total_amount_usd), 0)
           FROM import_orders io
           WHERE io.foreign_bond_id = $1) as total_order_value_usd
      `, [req.foreignBondId]);

      const orderInvoices = await db.query(`
        SELECT
          io.id,
          io.order_number as invoice_number,
          io.order_status,
          io.total_amount_usd,
          io.created_at,
          d.name as counterparty_name,
          (SELECT COALESCE(SUM(quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id) as units
        FROM import_orders io
        LEFT JOIN dealerships d ON d.id = io.dealership_id
        WHERE io.foreign_bond_id = $1 ${orderDateFilter}
        ORDER BY io.created_at DESC
        LIMIT 12
      `, [req.foreignBondId]);

      const inventoryByMake = await db.query(`
        SELECT
          v.make,
          COALESCE(SUM(v.quantity), 0) as units,
          COALESCE(SUM(v.purchase_price_usd * COALESCE(v.quantity, 1)), 0) as inventory_cost_usd
        FROM vehicles v
        WHERE v.foreign_bond_id = $1 ${inventoryDateFilter}
        GROUP BY v.make
        ORDER BY inventory_cost_usd DESC
        LIMIT 10
      `, [req.foreignBondId]);

      return res.json({
        data: {
          role: 'supplier',
          summary: summaryResult.rows[0],
          orderInvoices: orderInvoices.rows,
          inventoryByMake: inventoryByMake.rows
        }
      });
    }

    const saleDateFilter = buildBetweenClause('ls.sale_date', start_date, end_date);
    const orderDateFilter = buildBetweenClause('io.created_at', start_date, end_date);
    const inventoryDateFilter = buildBetweenClause('v.created_at', start_date, end_date);
    const dealershipCondition = req.isDealershipManager ? ` AND ls.dealership_id = ${req.bondId}` : '';
    const orderCondition = req.isDealershipManager ? ` AND io.dealership_id = ${req.bondId}` : '';
    const inventoryCondition = req.isDealershipManager ? ` AND v.dealership_id = ${req.bondId}` : '';

    const summaryResult = await db.query(`
      SELECT
        COALESCE(COUNT(ls.id), 0) as local_sales_count,
        COALESCE(SUM(ls.selling_price_ugx), 0) as local_revenue_ugx,
        COALESCE(SUM(ls.total_cost_ugx), 0) as local_cost_ugx,
        COALESCE(SUM(ls.selling_price_ugx - ls.total_cost_ugx), 0) as gross_profit_ugx,
        COALESCE(SUM(CASE WHEN ls.payment_status != 'Paid' THEN ls.selling_price_ugx - ls.amount_paid_ugx ELSE 0 END), 0) as outstanding_ugx
      FROM local_sales ls
      WHERE 1=1 ${dealershipCondition} ${saleDateFilter}
    `);

    const purchasingResult = await db.query(`
      SELECT
        COALESCE(COUNT(io.id), 0) as import_orders_count,
        COALESCE(SUM(io.total_amount_usd), 0) as import_spend_usd,
        COALESCE(SUM(io.total_amount_usd - COALESCE(io.amount_paid_usd, 0)), 0) as payables_outstanding_usd,
        COALESCE(SUM(COALESCE(io.amount_paid_usd, 0)), 0) as payables_paid_usd
      FROM import_orders io
      WHERE 1=1 ${orderCondition} ${orderDateFilter}
    `);

    const inventoryResult = await db.query(`
      SELECT
        COALESCE(SUM(v.purchase_price_usd * COALESCE(v.quantity, 1)), 0) as inventory_value_usd,
        COALESCE(SUM(v.quantity), 0) as inventory_units
      FROM vehicles v
      WHERE 1=1 ${inventoryCondition} ${inventoryDateFilter}
    `);

    const paymentBreakdown = await db.query(`
      SELECT
        ls.payment_status,
        COUNT(*) as count,
        COALESCE(SUM(ls.selling_price_ugx), 0) as total_amount_ugx,
        COALESCE(SUM(ls.selling_price_ugx - ls.amount_paid_ugx), 0) as balance_ugx
      FROM local_sales ls
      WHERE 1=1 ${dealershipCondition} ${saleDateFilter}
      GROUP BY ls.payment_status
      ORDER BY count DESC
    `);

    const salesInvoices = await db.query(`
      SELECT
        ls.id,
        ls.invoice_number,
        ls.sale_date,
        ls.payment_status,
        ls.selling_price_ugx,
        ls.amount_paid_ugx,
        (ls.selling_price_ugx - ls.amount_paid_ugx) as balance_ugx,
        c.full_name as counterparty_name,
        (v.make || ' ' || v.model || ' ' || v.year) as item_name
      FROM local_sales ls
      JOIN customers c ON c.id = ls.customer_id
      JOIN vehicles v ON v.id = ls.vehicle_id
      WHERE 1=1 ${dealershipCondition} ${saleDateFilter}
      ORDER BY ls.sale_date DESC
      LIMIT 50
    `);

    const purchaseInvoices = await db.query(`
      SELECT
        io.id,
        io.order_number as invoice_number,
        io.created_at,
        io.order_status,
        io.total_amount_usd,
        COALESCE(io.amount_paid_usd, 0) as amount_paid_usd,
        (io.total_amount_usd - COALESCE(io.amount_paid_usd, 0)) as outstanding_usd,
        COALESCE(io.payment_status, CASE WHEN COALESCE(io.amount_paid_usd, 0) >= io.total_amount_usd THEN 'Paid'
          WHEN COALESCE(io.amount_paid_usd, 0) > 0 THEN 'Partial' ELSE 'Unpaid' END) as payment_status,
        fb.name as counterparty_name,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id) as units
      FROM import_orders io
      LEFT JOIN foreign_bonds fb ON fb.id = io.foreign_bond_id
      WHERE 1=1 ${orderCondition} ${orderDateFilter}
      ORDER BY io.created_at DESC
      LIMIT 50
    `);

    // Local acquisitions (trade-ins, auctions, local purchases)
    const localAcquisitionCondition = req.isDealershipManager
      ? ` AND v.dealership_id = ${req.bondId}` : '';
    const localAcquisitions = await db.query(`
      SELECT
        COALESCE(COUNT(*), 0) as local_acquisition_count,
        COALESCE(SUM(COALESCE(v.acquisition_cost_ugx, 0)), 0) as local_acquisition_cost_ugx
      FROM vehicles v
      WHERE v.source_type != 'import' AND v.source_type IS NOT NULL ${localAcquisitionCondition} ${inventoryDateFilter}
    `);

    const localAcquisitionList = await db.query(`
      SELECT v.id, v.chassis_number, v.make, v.model, v.year, v.color,
        v.acquisition_cost_ugx, v.acquisition_source, v.source_type,
        v.status, v.image_url, v.created_at
      FROM vehicles v
      WHERE v.source_type != 'import' AND v.source_type IS NOT NULL ${localAcquisitionCondition}
      ORDER BY v.created_at DESC LIMIT 50
    `);

    // P&L calculation
    const revenue_ugx = Number(summaryResult.rows[0]?.local_revenue_ugx) || 0;
    const cogs_from_imports_ugx = Number(summaryResult.rows[0]?.local_cost_ugx) || 0;
    const cogs_from_local_ugx = Number(localAcquisitions.rows[0]?.local_acquisition_cost_ugx) || 0;
    const total_cogs_ugx = cogs_from_imports_ugx + cogs_from_local_ugx;
    const gross_profit_ugx = revenue_ugx - total_cogs_ugx;
    const gross_margin_pct = revenue_ugx > 0 ? ((gross_profit_ugx / revenue_ugx) * 100).toFixed(1) : 0;

    return res.json({
      data: {
        role: req.isDealershipManager ? 'dealership' : 'supplier',
        summary: {
          ...summaryResult.rows[0],
          ...purchasingResult.rows[0],
          ...inventoryResult.rows[0],
          local_acquisition_count: localAcquisitions.rows[0]?.local_acquisition_count || 0,
          local_acquisition_cost_ugx: localAcquisitions.rows[0]?.local_acquisition_cost_ugx || 0,
        },
        pnl: {
          revenue_ugx,
          cogs_from_imports_ugx,
          cogs_from_local_ugx,
          total_cogs_ugx,
          gross_profit_ugx,
          gross_margin_pct: Number(gross_margin_pct),
        },
        paymentBreakdown: paymentBreakdown.rows,
        salesInvoices: salesInvoices.rows,
        purchaseInvoices: purchaseInvoices.rows,
        localAcquisitions: localAcquisitionList.rows,
      }
    });
  } catch (error) {
    console.error('Financial management report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Financial summary report (bond-filtered)
router.get('/financial-summary', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant financial summary reports' });
    }

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
    // Tenant scope already enforced above; no admin access here
    
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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant inventory reports' });
    }

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
      WHERE status != 'Sold' ${bondCondition ? bondCondition.replace('WHERE ', 'AND ') : ''}
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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant customer reports' });
    }

    if (req.isForeignBondUser) {
      return res.json({ data: { topCustomers: [], acquisitionTrend: [] } });
    }

    const bondCondition = req.isDealershipManager ? `WHERE c.dealership_id = ${req.bondId}` : '';
    
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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant import-order reports' });
    }

    const bondCondition = req.isDealershipManager
      ? `WHERE io.dealership_id = ${req.bondId}`
      : req.isForeignBondUser
        ? `WHERE io.foreign_bond_id = ${req.foreignBondId}`
        : '';
    
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
      ${bondCondition ? bondCondition.replace('WHERE ', 'AND ') : ''}
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
