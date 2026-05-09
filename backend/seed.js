const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  try {
    console.log('Waiting for database to initialize...');
    await db.dbReady;
    const sqlDb = db.getDb();
    
    console.log('Seeding database...');

    // Create admin user
    const passwordHash = bcrypt.hashSync('admin123', 10);
    sqlDb.run(`
      INSERT OR IGNORE INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `, ['admin@cartracking.ug', passwordHash, 'System Admin', 'admin']);

    // Foreign Bonds - Keep only ONE for demo
    sqlDb.run(`
      INSERT OR IGNORE INTO foreign_bonds (
        name, country, city, contact_person, contact_email, specialization, license_number,
        subscription_plan, subscription_amount, subscription_status, subscription_start_date, next_payment_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), date('now', '+30 days'))
    `, [
      'Tokyo Auto Exports', 
      'Japan', 
      'Tokyo', 
      'Tanaka San', 
      'sales@tokyoauto.jp', 
      'Toyota, Honda, Nissan',
      'JP-AUTO-2024-001',
      'Professional',
      499.00,
      'Active'
    ]);

    // Dealerships - Keep only ONE for demo
    sqlDb.run(`
      INSERT OR IGNORE INTO dealerships (
        name, license_number, country, city, contact_person, contact_email, specialization,
        subscription_plan, subscription_amount, subscription_status, subscription_start_date, next_payment_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), date('now', '+30 days'))
    `, [
      'KPM Motors Uganda', 
      'URA-001', 
      'Uganda', 
      'Kampala', 
      'David Mukasa', 
      'manager@kpmmotors.ug', 
      'Japanese imports',
      'Business',
      299.00,
      'Active'
    ]);

    // Create dealership manager user
    const dealershipManagerHash = bcrypt.hashSync('bond123', 10);
    sqlDb.run(`
      INSERT OR IGNORE INTO users (email, password_hash, full_name, role, dealership_id)
      VALUES (?, ?, ?, ?, ?)
    `, ['manager@kpmmotors.ug', dealershipManagerHash, 'David Mukasa', 'dealership_manager', 1]);
    
    // Create supplier user account (ONE only)
    const supplierPassword = bcrypt.hashSync('supplier123', 10);
    sqlDb.run(`
      INSERT OR IGNORE INTO users (email, password_hash, full_name, role, foreign_bond_id)
      VALUES (?, ?, ?, ?, ?)
    `, ['supplier@tokyoauto.jp', supplierPassword, 'Tanaka San', 'foreign_bond_user', 1]);

    // Vehicles - Only from Tokyo Auto (foreign_bond_id = 1)
    const vehicles = [
      { chassis: 'JTDKN3DU5A0000001', make: 'Toyota', model: 'Prius', year: 2020, color: 'White', engine_cc: 1800, mileage: 45000, fuel: 'Hybrid', trans: 'Automatic', body: 'Sedan', purchase: 7500, sale: 8500, foreign_bond: 1 },
      { chassis: 'JTDKN3DU5A0000002', make: 'Toyota', model: 'Harrier', year: 2019, color: 'Black', engine_cc: 2000, mileage: 62000, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', purchase: 13000, sale: 15000, foreign_bond: 1 },
      { chassis: 'JTDKN3DU5A0000004', make: 'Nissan', model: 'X-Trail', year: 2018, color: 'Silver', engine_cc: 2500, mileage: 78000, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', purchase: 9500, sale: 11000, foreign_bond: 1 },
      { chassis: 'JTDKN3DU5A0000009', make: 'Toyota', model: 'Hilux', year: 2021, color: 'Silver', engine_cc: 2800, mileage: 25000, fuel: 'Diesel', trans: 'Manual', body: 'Pickup', purchase: 28000, sale: 32000, foreign_bond: 1 },
    ];

    for (const v of vehicles) {
      sqlDb.run(`
        INSERT OR IGNORE INTO vehicles (chassis_number, make, model, year, color, engine_cc, mileage, fuel_type, transmission, body_type, purchase_price_usd, sale_price, foreign_bond_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
      `, [v.chassis, v.make, v.model, v.year, v.color, v.engine_cc, v.mileage, v.fuel, v.trans, v.body, v.purchase, v.sale, v.foreign_bond]);
    }

    // Customers (linked to dealership for multi-tenancy)
    const customers = [
      { name: 'John Okello', phone: '+256700123456', email: 'john.okello@gmail.com', nid: 'CM12345678', address: 'Kampala, Uganda', dealership: 1 },
      { name: 'Mary Namukasa', phone: '+256701234567', email: 'mary.n@gmail.com', nid: 'CF23456789', address: 'Entebbe, Uganda', dealership: 1 },
      { name: 'Robert Ssempijja', phone: '+256702345678', email: 'robert.s@yahoo.com', nid: 'CM34567890', address: 'Jinja, Uganda', dealership: 1 },
    ];

    for (const c of customers) {
      sqlDb.run(`
        INSERT OR IGNORE INTO customers (full_name, phone, email, national_id, address, dealership_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [c.name, c.phone, c.email, c.nid, c.address, c.dealership]);
    }

    // Sample Import Order
    sqlDb.run(`
      INSERT OR IGNORE INTO import_orders (order_number, foreign_bond_id, dealership_id, total_amount_usd, order_status)
      VALUES (?, ?, ?, ?, ?)
    `, ['ORD-SAMPLE001', 1, 1, 23500, 'Shipped']);

    // Link vehicles to order
    const vehicleResult = sqlDb.exec(`
      SELECT id FROM vehicles WHERE chassis_number IN ('JTDKN3DU5A0000001', 'JTDKN3DU5A0000002')
    `);
    
    const orderResult = sqlDb.exec(`SELECT id FROM import_orders WHERE order_number = 'ORD-SAMPLE001'`);
    
    if (orderResult.length > 0 && orderResult[0].values.length > 0) {
      const orderId = orderResult[0].values[0][0];
      
      if (vehicleResult.length > 0 && vehicleResult[0].values.length > 0) {
        for (const row of vehicleResult[0].values) {
          const vehicleId = row[0];
          sqlDb.run(`INSERT OR IGNORE INTO order_vehicles (order_id, vehicle_id) VALUES (?, ?)`, [orderId, vehicleId]);
        }
      }

      // Update those vehicles
      sqlDb.run(`
        UPDATE vehicles SET status = 'In Transit', dealership_id = 1
        WHERE chassis_number IN ('JTDKN3DU5A0000001', 'JTDKN3DU5A0000002')
      `);
    }

    // Shipping record
    sqlDb.run(`
      INSERT OR IGNORE INTO shipping (order_id, bl_number, container_number, vessel_name, departure_port, arrival_port, departure_date, estimated_arrival, shipping_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [1, 'BL-TYO-2024-001', 'CONT-001234', 'Pacific Star', 'Tokyo, Japan', 'Mombasa, Kenya', '2024-01-15', '2024-02-15', 'In Transit']);

    // Save database
    db.saveDb();

    console.log('✅ Database seeded successfully');
    console.log('\n📋 Login credentials:');
    console.log('   👑 Admin: admin@cartracking.ug / admin123');
    console.log('   🏪 Dealership: manager@kpmmotors.ug / bond123');
    console.log('      Plan: Business ($299/month)');
    console.log('   🏭 Supplier: supplier@tokyoauto.jp / supplier123');
    console.log('      Plan: Professional ($499/month)');
    console.log('\n📦 Demo data:');
    console.log('   - 1 Supplier (Tokyo Auto Exports) with 4 vehicles');
    console.log('   - 1 Dealership (KPM Motors) - Clean slate for testing');
    console.log('\n💡 Admin can now create more suppliers via Supplier Management page');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
