import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, Building2, MapPin, Car, ShoppingCart, 
  Ship, Shield, DollarSign, BarChart3, LogOut, Menu, X, Users, FileText, Settings, CreditCard, Database, Crown
} from 'lucide-react';
import { useState } from 'react';

// Define nav items with role-based visibility
const getNavItems = (userRole, accountType) => {
  // Supplier menu - varies by account_type
  if (userRole === 'foreign_bond_user') {
    const baseItems = [
      { path: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard', accountTypes: ['owner', 'manager', 'viewer'] },
      { path: '/supplier/inventory', icon: Car, label: 'My Inventory', accountTypes: ['owner', 'manager', 'viewer'] },
    ];
    
    // Managers and owners can add vehicles
    if (accountType === 'owner' || accountType === 'manager') {
      baseItems.push({ path: '/supplier/add-vehicle', icon: Car, label: 'Add Vehicle', accountTypes: ['owner', 'manager'] });
    }
    
    // All can view orders and customers
    baseItems.push(
      { path: '/supplier/orders', icon: ShoppingCart, label: 'Orders', accountTypes: ['owner', 'manager', 'viewer'] },
      { path: '/supplier/customers', icon: Users, label: 'Customers', accountTypes: ['owner', 'manager', 'viewer'] },
    );
    
    // Only owners see subscription and team management
    if (accountType === 'owner') {
      baseItems.push(
        { path: '/supplier/subscription', icon: CreditCard, label: 'Subscription', accountTypes: ['owner'] },
        { path: '/supplier/team', icon: Users, label: 'Team', accountTypes: ['owner'] },
        { path: '/supplier/reference-data', icon: Database, label: 'Reference Data', accountTypes: ['owner'] },
      );
    }
    
    // Analytics for all
    baseItems.push({ path: '/supplier/analytics', icon: BarChart3, label: 'Analytics', accountTypes: ['owner', 'manager', 'viewer'] });
    
    return baseItems.filter(item => item.accountTypes.includes(accountType || 'owner'));
  }
  
  // Admin & Dealership menu
  const items = [
    // Main Overview
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'dealership_manager'] },
    
    // Core Operations (Daily Workflow)
    { path: '/inventory', icon: Car, label: 'Inventory', roles: ['admin', 'dealership_manager'] },
    { path: '/orders', icon: ShoppingCart, label: 'Orders', roles: ['admin', 'dealership_manager'] },
    { path: '/shipping', icon: Ship, label: 'Shipping', roles: ['admin', 'dealership_manager'] },
    { path: '/border-clearance', icon: Shield, label: 'Border Clearance', roles: ['admin', 'dealership_manager'] },
    { path: '/sales', icon: DollarSign, label: 'Sales', roles: ['admin', 'dealership_manager'] },
    
    // Management & Partners
    { path: '/customers', icon: Users, label: 'Customers', roles: ['admin', 'dealership_manager'] },
    { path: '/dealership-management', icon: MapPin, label: 'Dealership Management', roles: ['admin'] },
    { path: '/supplier-management', icon: Building2, label: 'Supplier Management', roles: ['admin'] },
    
    // Insights & Reporting
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'dealership_manager'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['admin', 'dealership_manager'] },
    
    // Administration (Bottom)
    { path: '/admin', icon: Crown, label: 'Admin Dashboard', roles: ['admin'] },
    { path: '/system', icon: Settings, label: 'System Management', roles: ['admin'] },
  ];
  
  return items.filter(item => item.roles.includes(userRole));
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const navItems = getNavItems(user?.role || 'dealership_manager', user?.account_type || 'owner');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-400" />
            <span className="text-lg font-bold">CarTrack UG</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold">CarTrack Uganda</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
