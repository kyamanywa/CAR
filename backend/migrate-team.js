const db = require('./db');
const fs = require('fs');
const path = require('path');

async function migrateTeamManagement() {
  console.log('🔄 Starting team management migration...');
  
  try {
    // Wait for database to initialize
    await db.dbReady;
    
    const sqlFile = path.join(__dirname, 'migrations', '003_team_management.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    
    await db.saveDb();
    
    console.log('✅ Team management migration completed successfully!');
    console.log('   - Added account_type, invited_by, permissions, is_active to users');
    console.log('   - Created team_invitations table');
    console.log('   - Set existing users as "owner" account type');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTeamManagement();
