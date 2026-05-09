const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'car_tracking.db');

async function seedReferenceData() {
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  console.log('Seeding reference data for foreign_bond_id = 1...');

  // Seed Makes
  const makes = [
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Mitsubishi',
    'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen',
    'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Lexus'
  ];

  makes.forEach(make => {
    try {
      db.run('INSERT INTO vehicle_makes (name, foreign_bond_id) VALUES (?, ?)', [make, 1]);
    } catch (e) {
      console.log(`Make ${make} already exists, skipping...`);
    }
  });

  // Get make IDs
  const getMakeId = (makeName) => {
    const stmt = db.prepare('SELECT id FROM vehicle_makes WHERE name = ? AND foreign_bond_id = ?');
    stmt.bind([makeName, 1]);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return result.id;
  };

  // Seed Models
  const models = {
    'Toyota': ['Land Cruiser', 'Prado', 'Harrier', 'Camry', 'Corolla', 'RAV4', 'Hilux', 'Fortuner'],
    'Honda': ['CR-V', 'Civic', 'Accord', 'Fit', 'Pilot', 'Odyssey'],
    'Nissan': ['Patrol', 'X-Trail', 'Navara', 'Altima', 'Rogue', 'Murano'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'CX-3'],
    'Subaru': ['Forester', 'Outback', 'Legacy', 'Impreza', 'XV'],
    'Mitsubishi': ['Pajero', 'Outlander', 'L200', 'ASX'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'G-Class'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7'],
    'Audi': ['A4', 'A6', 'Q5', 'Q7', 'Q8'],
    'Volkswagen': ['Tiguan', 'Passat', 'Golf', 'Touareg'],
    'Ford': ['Ranger', 'F-150', 'Explorer', 'Escape'],
    'Hyundai': ['Santa Fe', 'Tucson', 'Elantra', 'Sonata'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Seltos'],
    'Lexus': ['LX', 'RX', 'NX', 'ES', 'GX']
  };

  Object.entries(models).forEach(([makeName, modelNames]) => {
    const makeId = getMakeId(makeName);
    if (makeId) {
      modelNames.forEach(modelName => {
        try {
          db.run('INSERT INTO vehicle_models (name, make_id, foreign_bond_id) VALUES (?, ?, ?)', 
            [modelName, makeId, 1]);
        } catch (e) {
          console.log(`Model ${modelName} for ${makeName} already exists, skipping...`);
        }
      });
    }
  });

  // Seed Colors
  const colors = [
    'White', 'White Pearl', 'Black', 'Black Mica', 'Silver', 'Silver Metallic',
    'Gray', 'Dark Gray', 'Red', 'Red Mica', 'Blue', 'Blue Metallic',
    'Green', 'Dark Green', 'Gold', 'Bronze', 'Brown', 'Beige',
    'Yellow', 'Orange'
  ];

  colors.forEach(color => {
    try {
      db.run('INSERT INTO vehicle_colors (name, foreign_bond_id) VALUES (?, ?)', [color, 1]);
    } catch (e) {
      console.log(`Color ${color} already exists, skipping...`);
    }
  });

  console.log('Reference data seeding completed!');

  // Count totals
  const countStmt1 = db.prepare('SELECT COUNT(*) as count FROM vehicle_makes WHERE foreign_bond_id = 1');
  countStmt1.step();
  const makesCount = countStmt1.getAsObject().count;
  countStmt1.free();

  const countStmt2 = db.prepare('SELECT COUNT(*) as count FROM vehicle_models WHERE foreign_bond_id = 1');
  countStmt2.step();
  const modelsCount = countStmt2.getAsObject().count;
  countStmt2.free();

  const countStmt3 = db.prepare('SELECT COUNT(*) as count FROM vehicle_colors WHERE foreign_bond_id = 1');
  countStmt3.step();
  const colorsCount = countStmt3.getAsObject().count;
  countStmt3.free();

  console.log(`\nSeeded: ${makesCount} makes, ${modelsCount} models, ${colorsCount} colors`);

  // Save the database
  const data = db.export();
  fs.writeFileSync(dbPath, data);
  db.close();
}

seedReferenceData().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
