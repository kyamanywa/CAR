// Middleware to enforce multi-tenant data isolation
module.exports = (req, res, next) => {
  // Dealership managers see only their dealership data
  if (req.user.role === 'dealership_manager' && req.user.dealership_id) {
    req.bondId = req.user.dealership_id;
    req.isDealershipManager = true;
  } 
  // Foreign bond users (suppliers) see only their vehicles and orders
  else if (req.user.role === 'foreign_bond_user' && req.user.foreign_bond_id) {
    req.foreignBondId = req.user.foreign_bond_id;
    req.isForeignBondUser = true;
  } 
  // Admin can see all data
  else if (req.user.role === 'admin') {
    req.bondId = req.query.dealership_id || null;
    req.foreignBondId = req.query.foreign_bond_id || null;
    req.isAdmin = true;
  }
  next();
};
