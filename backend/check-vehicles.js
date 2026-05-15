const db = require('./db');
db.dbReady.then(async () => {
  // Show actual delivered orders with correct dealership_id from import_orders
  const delivered = db.query(`
    SELECT io.id as order_id, io.order_number, io.dealership_id as order_dealership_id,
           io.foreign_bond_id,
           ov.vehicle_id, ov.quantity as ordered_qty,
           v.make, v.model, v.year, v.color, v.engine_cc, v.fuel_type,
           v.transmission, v.body_type, v.mileage, v.purchase_price_usd, v.sale_price_usd,
           v.chassis_number, v.foreign_bond_id as vehicle_fk_id
    FROM import_orders io
    JOIN order_vehicles ov ON ov.order_id = io.id
    JOIN vehicles v ON v.id = ov.vehicle_id
    WHERE io.order_status = 'Delivered'
  `);
  console.log('Delivered orders:');
  console.table(delivered.rows.map(r => ({
    order: r.order_number,
    order_dealership_id: r.order_dealership_id,
    make: r.make,
    model: r.model,
    ordered_qty: r.ordered_qty
  })));

  // Backfill: add delivered vehicles to dealership inventory
  let backfilled = 0;
  for (const r of delivered.rows) {
    if (!r.order_dealership_id) { console.log(`Skipping ${r.order_number} - no dealership_id`); continue; }

    const existing = db.query(
      `SELECT id, quantity FROM vehicles WHERE dealership_id = $1 AND make = $2 AND model = $3 AND year = $4 AND color = $5 AND source_type = 'import' LIMIT 1`,
      [r.order_dealership_id, r.make, r.model, r.year, r.color]
    );
    if (existing.rows.length > 0) {
      db.query(
        `UPDATE vehicles SET quantity = quantity + $1, status = 'In Stock', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [r.ordered_qty, existing.rows[0].id]
      );
      console.log(`Updated existing dealership vehicle: ${r.make} ${r.model} +${r.ordered_qty}`);
    } else {
      db.query(
        `INSERT INTO vehicles (foreign_bond_id, dealership_id, chassis_number, make, model, year, color, engine_cc, fuel_type, transmission, body_type, mileage, purchase_price_usd, sale_price_usd, quantity, status, source_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'In Stock', 'import', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [r.vehicle_fk_id, r.order_dealership_id,
         r.chassis_number ? `${r.chassis_number}-D${r.order_dealership_id}` : null,
         r.make, r.model, r.year, r.color,
         r.engine_cc, r.fuel_type, r.transmission, r.body_type,
         r.mileage, r.purchase_price_usd, r.sale_price_usd, r.ordered_qty]
      );
      console.log(`Created dealership vehicle: ${r.make} ${r.model} x${r.ordered_qty}`);
      backfilled++;
    }
  }
  db.saveDb();
  console.log(`\nBackfilled ${backfilled} vehicle records.`);

  const dealerInv = db.query(`SELECT id, make, model, quantity, status, dealership_id, source_type FROM vehicles WHERE dealership_id IS NOT NULL ORDER BY dealership_id, make`);
  console.log('\nDealership inventory after backfill:');
  console.table(dealerInv.rows);
  process.exit(0);
});
