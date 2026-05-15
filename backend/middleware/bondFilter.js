// Middleware to enforce multi-tenant data isolation
const DEALERSHIP_ROLES = ['dealership_manager', 'dealership_sales', 'dealership_accountant'];

module.exports = (req, res, next) => {
  // All dealership staff roles
  if (DEALERSHIP_ROLES.includes(req.user.role) && req.user.dealership_id) {
    req.bondId = req.user.dealership_id;
    req.isDealershipManager = true;         // grants data access
    req.dealershipRole = req.user.role;

    // Granular permission flags
    req.canManageInventory = ['dealership_manager', 'dealership_sales'].includes(req.user.role);
    req.canEditInventory = req.user.role === 'dealership_manager';  // Only managers can edit vehicles
    req.canManageFinancials = ['dealership_manager', 'dealership_accountant'].includes(req.user.role);
    req.canManageTeam = req.user.role === 'dealership_manager';
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
