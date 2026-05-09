const db = require('./db');

async function checkData() {
  await db.dbReady;
  
  console.log('\n=== FOREIGN BONDS ===');
  const bonds = await db.query('SELECT id, name, city, country, contact_person, subscription_plan, subscription_amount FROM foreign_bonds');
  console.table(bonds.rows);
  
  console.log('\n=== VEHICLES ===');
  const vehicles = await db.query('SELECT id, chassis_number, make, model, foreign_bond_id FROM vehicles');
  console.table(vehicles.rows);
  
  console.log('\n=== USERS ===');
  const users = await db.query('SELECT id, email, role, foreign_bond_id, dealership_id FROM users');
  console.table(users.rows);
  
  process.exit(0);
}

checkData();
