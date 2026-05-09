const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const { getDb, saveDb } = require('../db');

// =====================
// VEHICLE MAKES
// =====================

// Get all makes
router.get('/makes', auth, bondFilter, async (req, res) => {
  const db = getDb();
  
  try {
    const stmt = db.prepare('SELECT * FROM vehicle_makes WHERE foreign_bond_id = ? ORDER BY name ASC');
    stmt.bind([req.user.foreign_bond_id]);
    
    const makes = [];
    while (stmt.step()) {
      makes.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json({ data: makes });
  } catch (error) {
    console.error('Error fetching makes:', error);
    res.status(500).json({ error: 'Failed to fetch makes' });
  }
});

// Create a new make
router.post('/makes', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Make name is required' });
  }
  
  try {
    // Check if make already exists for this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_makes WHERE name = ? AND foreign_bond_id = ?');
    checkStmt.bind([name.trim(), req.user.foreign_bond_id]);
    
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'Make already exists' });
    }
    checkStmt.free();
    
    // Insert new make
    db.run('INSERT INTO vehicle_makes (name, foreign_bond_id) VALUES (?, ?)', 
      [name.trim(), req.user.foreign_bond_id]);
    
    await saveDb();
    
    // Get the created make
    const stmt = db.prepare('SELECT * FROM vehicle_makes WHERE name = ? AND foreign_bond_id = ?');
    stmt.bind([name.trim(), req.user.foreign_bond_id]);
    stmt.step();
    const make = stmt.getAsObject();
    stmt.free();
    
    res.status(201).json(make);
  } catch (error) {
    console.error('Error creating make:', error);
    res.status(500).json({ error: 'Failed to create make' });
  }
});

// Update a make
router.put('/makes/:id', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Make name is required' });
  }
  
  try {
    // Check if make belongs to this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_makes WHERE id = ? AND foreign_bond_id = ?');
    checkStmt.bind([id, req.user.foreign_bond_id]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Make not found' });
    }
    checkStmt.free();
    
    // Update make
    db.run('UPDATE vehicle_makes SET name = ? WHERE id = ? AND foreign_bond_id = ?', 
      [name.trim(), id, req.user.foreign_bond_id]);
    
    await saveDb();
    
    // Get updated make
    const stmt = db.prepare('SELECT * FROM vehicle_makes WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    const make = stmt.getAsObject();
    stmt.free();
    
    res.json({ data: make });
  } catch (error) {
    console.error('Error updating make:', error);
    res.status(500).json({ error: 'Failed to update make' });
  }
});

// Delete a make
router.delete('/makes/:id', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  try {
    // Check if make belongs to this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_makes WHERE id = ? AND foreign_bond_id = ?');
    checkStmt.bind([id, req.user.foreign_bond_id]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Make not found' });
    }
    checkStmt.free();
    
    // Check if make has models
    const modelsStmt = db.prepare('SELECT COUNT(*) as count FROM vehicle_models WHERE make_id = ?');
    modelsStmt.bind([id]);
    modelsStmt.step();
    const result = modelsStmt.getAsObject();
    modelsStmt.free();
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete make with existing models' });
    }
    
    // Delete make
    db.run('DELETE FROM vehicle_makes WHERE id = ? AND foreign_bond_id = ?', [id, req.user.foreign_bond_id]);
    await saveDb();
    
    res.json({ message: 'Make deleted successfully' });
  } catch (error) {
    console.error('Error deleting make:', error);
    res.status(500).json({ error: 'Failed to delete make' });
  }
});

// =====================
// VEHICLE MODELS
// =====================

// Get all models (optionally filter by make_id)
router.get('/models', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { make_id } = req.query;
  
  try {
    let query = `
      SELECT vm.*, vma.name as make_name 
      FROM vehicle_models vm 
      JOIN vehicle_makes vma ON vm.make_id = vma.id
      WHERE vm.foreign_bond_id = ?
    `;
    const params = [req.user.foreign_bond_id];
    
    if (make_id) {
      query += ' AND vm.make_id = ?';
      params.push(make_id);
    }
    
    query += ' ORDER BY vma.name, vm.name ASC';
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const models = [];
    while (stmt.step()) {
      models.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json({ data: models });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Create a new model
router.post('/models', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { name, make_id } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Model name is required' });
  }
  
  if (!make_id) {
    return res.status(400).json({ error: 'Make is required' });
  }
  
  try {
    // Check if make belongs to this foreign_bond
    const makeStmt = db.prepare('SELECT id FROM vehicle_makes WHERE id = ? AND foreign_bond_id = ?');
    makeStmt.bind([make_id, req.user.foreign_bond_id]);
    
    if (!makeStmt.step()) {
      makeStmt.free();
      return res.status(400).json({ error: 'Invalid make' });
    }
    makeStmt.free();
    
    // Check if model already exists for this make
    const checkStmt = db.prepare('SELECT id FROM vehicle_models WHERE name = ? AND make_id = ? AND foreign_bond_id = ?');
    checkStmt.bind([name.trim(), make_id, req.user.foreign_bond_id]);
    
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'Model already exists for this make' });
    }
    checkStmt.free();
    
    // Insert new model
    db.run('INSERT INTO vehicle_models (name, make_id, foreign_bond_id) VALUES (?, ?, ?)', 
      [name.trim(), make_id, req.user.foreign_bond_id]);
    
    await saveDb();
    
    // Get the created model
    const stmt = db.prepare(`
      SELECT vm.*, vma.name as make_name 
      FROM vehicle_models vm 
      JOIN vehicle_makes vma ON vm.make_id = vma.id
      WHERE vm.name = ? AND vm.make_id = ? AND vm.foreign_bond_id = ?
    `);
    stmt.bind([name.trim(), make_id, req.user.foreign_bond_id]);
    stmt.step();
    const model = stmt.getAsObject();
    stmt.free();
    
    res.status(201).json(model);
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

// Update a model
router.put('/models/:id', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, make_id } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Model name is required' });
  }
  
  if (!make_id) {
    return res.status(400).json({ error: 'Make is required' });
  }
  
  try {
    // Check if model belongs to this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_models WHERE id = ? AND foreign_bond_id = ?');
    checkStmt.bind([id, req.user.foreign_bond_id]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Model not found' });
    }
    checkStmt.free();
    
    // Check if make belongs to this foreign_bond
    const makeStmt = db.prepare('SELECT id FROM vehicle_makes WHERE id = ? AND foreign_bond_id = ?');
    makeStmt.bind([make_id, req.user.foreign_bond_id]);
    
    if (!makeStmt.step()) {
      makeStmt.free();
      return res.status(400).json({ error: 'Invalid make' });
    }
    makeStmt.free();
    
    // Update model
    db.run('UPDATE vehicle_models SET name = ?, make_id = ? WHERE id = ? AND foreign_bond_id = ?', 
      [name.trim(), make_id, id, req.user.foreign_bond_id]);
    
    await saveDb();
    
    // Get updated model
    const stmt = db.prepare(`
      SELECT vm.*, vma.name as make_name 
      FROM vehicle_models vm 
      JOIN vehicle_makes vma ON vm.make_id = vma.id
      WHERE vm.id = ?
    `);
    stmt.bind([id]);
    stmt.step();
    const model = stmt.getAsObject();
    stmt.free();
    
    res.json({ data: model });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// Delete a model
router.delete('/models/:id', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  try {
    // Check if model belongs to this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_models WHERE id = ? AND foreign_bond_id = ?');
    checkStmt.bind([id, req.user.foreign_bond_id]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Model not found' });
    }
    checkStmt.free();
    
    // Check if model is used in vehicles
    const vehiclesStmt = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE model = (SELECT name FROM vehicle_models WHERE id = ?) AND foreign_bond_id = ?');
    vehiclesStmt.bind([id, req.user.foreign_bond_id]);
    vehiclesStmt.step();
    const result = vehiclesStmt.getAsObject();
    vehiclesStmt.free();
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete model that is used by vehicles' });
    }
    
    // Delete model
    db.run('DELETE FROM vehicle_models WHERE id = ? AND foreign_bond_id = ?', [id, req.user.foreign_bond_id]);
    await saveDb();
    
    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// =====================
// VEHICLE COLORS
// =====================

// Get all colors
router.get('/colors', auth, bondFilter, async (req, res) => {
  const db = getDb();
  
  try {
    const stmt = db.prepare('SELECT * FROM vehicle_colors WHERE foreign_bond_id = ? ORDER BY name ASC');
    stmt.bind([req.user.foreign_bond_id]);
    
    const colors = [];
    while (stmt.step()) {
      colors.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json({ data: colors });
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

// Create a new color
router.post('/colors', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Color name is required' });
  }
  
  try {
    // Check if color already exists for this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_colors WHERE name = ? AND foreign_bond_id = ?');
    checkStmt.bind([name.trim(), req.user.foreign_bond_id]);
    
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'Color already exists' });
    }
    checkStmt.free();
    
    // Insert new color
    db.run('INSERT INTO vehicle_colors (name, foreign_bond_id) VALUES (?, ?)', 
      [name.trim(), req.user.foreign_bond_id]);
    
    await saveDb();
    
    // Get the created color
    const stmt = db.prepare('SELECT * FROM vehicle_colors WHERE name = ? AND foreign_bond_id = ?');
    stmt.bind([name.trim(), req.user.foreign_bond_id]);
    stmt.step();
    const color = stmt.getAsObject();
    stmt.free();
    
    res.status(201).json(color);
  } catch (error) {
    console.error('Error creating color:', error);
    res.status(500).json({ error: 'Failed to create color' });
  }
});

// Update a color
router.put('/colors/:id', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Color name is required' });
  }
  
  try {
    // Check if color belongs to this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_colors WHERE id = ? AND foreign_bond_id = ?');
    checkStmt.bind([id, req.user.foreign_bond_id]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Color not found' });
    }
    checkStmt.free();
    
    // Update color
    db.run('UPDATE vehicle_colors SET name = ? WHERE id = ? AND foreign_bond_id = ?', 
      [name.trim(), id, req.user.foreign_bond_id]);
    
    await saveDb();
    
    // Get updated color
    const stmt = db.prepare('SELECT * FROM vehicle_colors WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    const color = stmt.getAsObject();
    stmt.free();
    
    res.json({ data: color });
  } catch (error) {
    console.error('Error updating color:', error);
    res.status(500).json({ error: 'Failed to update color' });
  }
});

// Delete a color
router.delete('/colors/:id', auth, bondFilter, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  try {
    // Check if color belongs to this foreign_bond
    const checkStmt = db.prepare('SELECT id FROM vehicle_colors WHERE id = ? AND foreign_bond_id = ?');
    checkStmt.bind([id, req.user.foreign_bond_id]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Color not found' });
    }
    checkStmt.free();
    
    // Check if color is used in vehicles
    const vehiclesStmt = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE color = (SELECT name FROM vehicle_colors WHERE id = ?) AND foreign_bond_id = ?');
    vehiclesStmt.bind([id, req.user.foreign_bond_id]);
    vehiclesStmt.step();
    const result = vehiclesStmt.getAsObject();
    vehiclesStmt.free();
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete color that is used by vehicles' });
    }
    
    // Delete color
    db.run('DELETE FROM vehicle_colors WHERE id = ? AND foreign_bond_id = ?', [id, req.user.foreign_bond_id]);
    await saveDb();
    
    res.json({ message: 'Color deleted successfully' });
  } catch (error) {
    console.error('Error deleting color:', error);
    res.status(500).json({ error: 'Failed to delete color' });
  }
});

module.exports = router;
