const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// CSV Import endpoint
router.post('/import', auth, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  
  if (!filePath) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  let lineNumber = 1;

  try {
    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          lineNumber++;
          
          // Validate required fields
          const required = ['chassis_number', 'make', 'model', 'year', 'purchase_price_usd'];
          const missing = required.filter(field => !data[field]);
          
          if (missing.length > 0) {
            errors.push({
              line: lineNumber,
              error: `Missing fields: ${missing.join(', ')}`,
              data
            });
            return;
          }

          // Validate data types
          if (isNaN(data.year) || parseInt(data.year) < 1900 || parseInt(data.year) > 2026) {
            errors.push({
              line: lineNumber,
              error: 'Invalid year',
              data
            });
            return;
          }

          if (isNaN(data.purchase_price_usd) || parseFloat(data.purchase_price_usd) <= 0) {
            errors.push({
              line: lineNumber,
              error: 'Invalid purchase price',
              data
            });
            return;
          }

          results.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Delete uploaded file
    fs.unlinkSync(filePath);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors,
        valid_count: results.length
      });
    }

    // Insert valid vehicles
    let inserted = 0;
    const foreign_bond_id = req.user.foreign_bond_id || req.body.foreign_bond_id;

    if (!foreign_bond_id) {
      return res.status(400).json({ error: 'foreign_bond_id is required' });
    }

    for (const vehicle of results) {
      try {
        await db.query(
          `INSERT INTO vehicles (
            chassis_number, make, model, year, color, engine_cc, mileage,
            fuel_type, transmission, body_type, foreign_bond_id, purchase_price_usd,
            quantity, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Available')`,
          [
            vehicle.chassis_number,
            vehicle.make,
            vehicle.model,
            parseInt(vehicle.year),
            vehicle.color || null,
            vehicle.engine_cc ? parseInt(vehicle.engine_cc) : null,
            vehicle.mileage ? parseInt(vehicle.mileage) : null,
            vehicle.fuel_type || null,
            vehicle.transmission || null,
            vehicle.body_type || null,
            foreign_bond_id,
            parseFloat(vehicle.purchase_price_usd),
            vehicle.quantity ? parseInt(vehicle.quantity) : 1
          ]
        );
        inserted++;
      } catch (error) {
        errors.push({
          line: lineNumber,
          error: error.message,
          data: vehicle
        });
      }
    }

    await db.saveDb();

    res.json({
      success: true,
      message: `Successfully imported ${inserted} vehicles`,
      inserted: inserted,
      errors: errors.length,
      error_details: errors
    });

  } catch (error) {
    // Clean up file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

// Download CSV template
router.get('/template', (req, res) => {
  const template = `chassis_number,make,model,year,color,engine_cc,mileage,fuel_type,transmission,body_type,purchase_price_usd,quantity
ABC123456789,Toyota,Land Cruiser,2023,White,4500,15000,Diesel,Automatic,SUV,45000,1
XYZ987654321,Honda,Civic,2022,Black,2000,22000,Petrol,Automatic,Sedan,28000,1
`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=vehicle_import_template.csv');
  res.send(template);
});

module.exports = router;
