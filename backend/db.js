const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'car_tracking.db');

let db = null;
let dbReady = null;

// Initialize the database
async function initDb() {
  const SQL = await initSqlJs();
  
  // Try to load existing database
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (error) {
    console.log('Creating new database...');
    db = new SQL.Database();
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  return db;
}

// Get database promise
dbReady = initDb();

// Save database to file
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Helper function to match pg query interface
function query(sql, params = []) {
  // Convert $1, $2, etc. to ? placeholders
  let convertedSql = sql;
  let paramIndex = 1;
  while (convertedSql.includes(`$${paramIndex}`)) {
    convertedSql = convertedSql.replace(`$${paramIndex}`, '?');
    paramIndex++;
  }
  
  // Convert NOW() to datetime('now')
  convertedSql = convertedSql.replace(/NOW\(\)/gi, "datetime('now')");
  
  // Convert ILIKE to LIKE (SQLite is case-insensitive by default for ASCII)
  convertedSql = convertedSql.replace(/ILIKE/gi, 'LIKE');
  
  try {
    const trimmedSql = convertedSql.trim().toUpperCase();
    
    if (trimmedSql.startsWith('SELECT')) {
      const stmt = db.prepare(convertedSql);
      stmt.bind(params);
      
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return { rows };
    } else if (trimmedSql.startsWith('INSERT') && convertedSql.toUpperCase().includes('RETURNING')) {
      // Handle RETURNING clause - SQLite doesn't support it directly
      const insertSql = convertedSql.replace(/\s+RETURNING\s+\*/gi, '');
      db.run(insertSql, params);
      
      // Get the inserted row
      const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
      const tableName = extractTableName(convertedSql);
      
      if (tableName) {
        const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
        selectStmt.bind([lastId]);
        if (selectStmt.step()) {
          const row = selectStmt.getAsObject();
          selectStmt.free();
          saveDb();
          return { rows: [row] };
        }
        selectStmt.free();
      }
      saveDb();
      return { rows: [], lastInsertRowid: lastId };
    } else if (trimmedSql.startsWith('UPDATE') && convertedSql.toUpperCase().includes('RETURNING')) {
      // Handle UPDATE with RETURNING
      const updateSql = convertedSql.replace(/\s+RETURNING\s+\*/gi, '');
      db.run(updateSql, params);
      
      // Get the updated row - need to extract WHERE clause
      const tableName = extractTableName(convertedSql);
      const whereMatch = convertedSql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (tableName && whereMatch) {
        const lastParam = params[params.length - 1];
        const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE ${whereMatch[1]} = ?`);
        selectStmt.bind([lastParam]);
        if (selectStmt.step()) {
          const row = selectStmt.getAsObject();
          selectStmt.free();
          saveDb();
          return { rows: [row] };
        }
        selectStmt.free();
      }
      saveDb();
      return { rows: [] };
    } else {
      db.run(convertedSql, params);
      saveDb();
      return { rows: [], changes: db.getRowsModified() };
    }
  } catch (error) {
    console.error('SQL Error:', error.message);
    console.error('SQL:', convertedSql);
    console.error('Params:', params);
    throw error;
  }
}

function extractTableName(sql) {
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  if (insertMatch) return insertMatch[1];
  
  const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
  if (updateMatch) return updateMatch[1];
  
  return null;
}

// Execute multiple statements (for migrations)
function exec(sql) {
  db.exec(sql);
  saveDb();
}

// Get raw db for direct access
function getDb() {
  return db;
}

module.exports = {
  query,
  exec,
  getDb,
  dbReady,
  saveDb
};

