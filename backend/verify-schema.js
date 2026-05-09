const db = require('./db');

async function verifySchema() {
  try {
    console.log('🔍 Verifying Database Schema...\n');
    await db.dbReady;
    const sqlDb = db.getDb();

    // Get all table names
    const tables = sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    
    if (!tables || tables.length === 0 || !tables[0].values) {
      console.log('❌ No tables found in database');
      return;
    }

    console.log('📋 Tables found:', tables[0].values.map(t => t[0]).join(', '));
    console.log('\n' + '='.repeat(80) + '\n');

    // Check specific critical tables
    const criticalTables = [
      { name: 'dealerships', expectedColumns: ['id', 'name', 'country', 'city', 'status'] },
      { name: 'ugandan_bonds', expectedColumns: ['id', 'name', 'city', 'status'] },
      { name: 'users', expectedColumns: ['id', 'email', 'role', 'dealership_id', 'ugandan_bond_id'] },
      { name: 'vehicles', expectedColumns: ['id', 'chassis_number', 'dealership_id', 'ugandan_bond_id'] },
      { name: 'import_orders', expectedColumns: ['id', 'order_number', 'dealership_id', 'ugandan_bond_id'] },
      { name: 'customers', expectedColumns: ['id', 'full_name', 'dealership_id', 'ugandan_bond_id'] }
    ];

    for (const table of criticalTables) {
      const tableExists = tables[0].values.some(t => t[0] === table.name);
      
      if (tableExists) {
        console.log(`✅ Table: ${table.name}`);
        const columns = sqlDb.exec(`PRAGMA table_info(${table.name})`);
        
        if (columns && columns.length > 0 && columns[0].values) {
          const columnNames = columns[0].values.map(col => col[1]);
          console.log(`   Columns: ${columnNames.join(', ')}`);
          
          // Check for expected columns
          const missingExpected = table.expectedColumns.filter(col => !columnNames.includes(col));
          if (missingExpected.length > 0) {
            console.log(`   ⚠️  Missing expected: ${missingExpected.join(', ')}`);
          }
        }
      } else {
        console.log(`❌ Table: ${table.name} - DOES NOT EXIST`);
      }
      console.log('');
    }

    console.log('='.repeat(80) + '\n');
    
    // Check for migration issues
    console.log('🔍 Checking for Common Migration Issues:\n');
    
    const issues = [];
    
    // Check if we have both ugandan_bonds AND dealerships
    const hasUgandanBonds = tables[0].values.some(t => t[0] === 'ugandan_bonds');
    const hasDealerships = tables[0].values.some(t => t[0] === 'dealerships');
    
    if (hasUgandanBonds && !hasDealerships) {
      issues.push('❌ Table "dealerships" missing - need to rename "ugandan_bonds" to "dealerships"');
    }
    
    if (!hasUgandanBonds && !hasDealerships) {
      issues.push('❌ Neither "ugandan_bonds" nor "dealerships" table exists - need fresh migration');
    }
    
    // Check users table
    if (tables[0].values.some(t => t[0] === 'users')) {
      const userCols = sqlDb.exec(`PRAGMA table_info(users)`);
      if (userCols && userCols.length > 0) {
        const userColumnNames = userCols[0].values.map(col => col[1]);
        
        if (userColumnNames.includes('ugandan_bond_id') && !userColumnNames.includes('dealership_id')) {
          issues.push('❌ users table has "ugandan_bond_id" but missing "dealership_id"');
        }
        
        if (userColumnNames.includes('password') && !userColumnNames.includes('password_hash')) {
          issues.push('⚠️  users table has "password" column, should be "password_hash"');
        }
      }
    }
    
    // Check vehicles table
    if (tables[0].values.some(t => t[0] === 'vehicles')) {
      const vehCols = sqlDb.exec(`PRAGMA table_info(vehicles)`);
      if (vehCols && vehCols.length > 0) {
        const vehColumnNames = vehCols[0].values.map(col => col[1]);
        
        if (vehColumnNames.includes('ugandan_bond_id') && !vehColumnNames.includes('dealership_id')) {
          issues.push('❌ vehicles table has "ugandan_bond_id" but missing "dealership_id"');
        }
      }
    }
    
    // Check import_orders table
    if (tables[0].values.some(t => t[0] === 'import_orders')) {
      const orderCols = sqlDb.exec(`PRAGMA table_info(import_orders)`);
      if (orderCols && orderCols.length > 0) {
        const orderColumnNames = orderCols[0].values.map(col => col[1]);
        
        if (orderColumnNames.includes('ugandan_bond_id') && !orderColumnNames.includes('dealership_id')) {
          issues.push('❌ import_orders table has "ugandan_bond_id" but missing "dealership_id"');
        }
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ No critical schema issues found!\n');
    } else {
      console.log('Issues found:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n⚠️  RECOMMENDATION: Delete database and run fresh migrations\n');
      console.log('   Commands:');
      console.log('   Remove-Item ../car_tracking.db -ErrorAction SilentlyContinue');
      console.log('   node migrate.js');
      console.log('   node seed.js\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
    process.exit(1);
  }
}

verifySchema();
