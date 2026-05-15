import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCurrency, CURRENCIES } from '../CurrencyContext';
import { 
  LayoutDashboard, Building2, MapPin, Car, ShoppingCart, 
  Ship, Shield, DollarSign, BarChart3, LogOut, Menu, X, Users, FileText, Settings, CreditCard, Database, Crown, Bell, ClipboardList, ChevronDown, Calendar, Receipt, User
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../api';

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
      { path: '/supplier/orders-received', icon: ShoppingCart, label: 'Orders Received', accountTypes: ['owner', 'manager', 'viewer'] },
      { path: '/supplier/shipping', icon: Ship, label: 'Shipping', accountTypes: ['owner', 'manager'] },
      { path: '/supplier/border-clearance', icon: Shield, label: 'Border Clearance', accountTypes: ['owner', 'manager'] },
      { path: '/supplier/orders', icon: Car, label: 'Browse Vehicles', accountTypes: ['owner', 'manager', 'viewer'] },
      { path: '/supplier/financials', icon: DollarSign, label: 'Financials', accountTypes: ['owner', 'manager', 'viewer'] },
      { path: '/supplier/customers', icon: Users, label: 'Customers', accountTypes: ['owner', 'manager', 'viewer'] },
    );
    
    // Only owners see subscription and team management
    if (accountType === 'owner') {
      baseItems.push(
        { path: '/supplier/company-profile', icon: Building2, label: 'Company Profile', accountTypes: ['owner'] },
        { path: '/supplier/subscription', icon: CreditCard, label: 'Subscription', accountTypes: ['owner'] },
        { path: '/supplier/team', icon: Users, label: 'Team', accountTypes: ['owner'] },
        { path: '/supplier/reference-data', icon: Database, label: 'Reference Data', accountTypes: ['owner'] },
      );
    }
    
    // Analytics for all
    baseItems.push({ path: '/supplier/analytics', icon: BarChart3, label: 'Analytics', accountTypes: ['owner', 'manager', 'viewer'] });
    baseItems.push({ path: '/account', icon: User, label: 'My Account', accountTypes: ['owner', 'manager', 'viewer'] });
    
    return baseItems.filter(item => item.accountTypes.includes(accountType || 'owner'));
  }

  // Admin & Dealership menu
  const DEALERSHIP_ROLES = ['dealership_manager', 'dealership_sales', 'dealership_accountant'];

  const items = [
    // Main Overview
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', ...DEALERSHIP_ROLES] },
    { path: '/sales-dashboard', icon: LayoutDashboard, label: 'Sales Dashboard', roles: ['dealership_sales', 'dealership_manager'] },
    
    // Core Operations (Daily Workflow)
    { path: '/inventory', icon: Car, label: 'Inventory', roles: ['dealership_manager', 'dealership_sales'] },
    { path: '/orders', icon: ShoppingCart, label: 'Orders', roles: ['dealership_manager', 'dealership_sales'] },
    { path: '/shipping', icon: Ship, label: 'Shipping', roles: ['dealership_manager', 'dealership_sales'] },
    { path: '/border-clearance', icon: Shield, label: 'Border Clearance', roles: ['dealership_manager', 'dealership_sales'] },
    { path: '/sales', icon: DollarSign, label: 'Sales', roles: ['dealership_manager', 'dealership_sales', 'dealership_accountant'] },
    { path: '/financials', icon: FileText, label: 'Financials', roles: ['dealership_manager', 'dealership_accountant'] },
    { path: '/loans', icon: CreditCard, label: 'Loan Management', roles: ['dealership_manager', 'dealership_accountant'] },
    { path: '/inspections', icon: ClipboardList, label: 'Inspections', roles: ['dealership_manager', 'dealership_sales', 'dealership_accountant'] },
    { path: '/test-drives', icon: Calendar, label: 'Test Drives', roles: ['dealership_manager', 'dealership_sales'] },
    { path: '/expenses', icon: Receipt, label: 'Expenses & Aging', roles: ['dealership_manager', 'dealership_accountant'] },
    
    // Management & Partners
    { path: '/customers', icon: Users, label: 'Customers', roles: ['dealership_manager', 'dealership_sales', 'dealership_accountant'] },
    { path: '/company-profile', icon: Building2, label: 'Company Profile', roles: ['dealership_manager'] },
    { path: '/dealership-management', icon: MapPin, label: 'Dealership Management', roles: ['admin'] },
    { path: '/supplier-management', icon: Building2, label: 'Supplier Management', roles: ['admin'] },
    
    // Insights & Reporting
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: [...DEALERSHIP_ROLES] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['dealership_manager', 'dealership_accountant'] },
    
    // Administration (Bottom)
    { path: '/admin', icon: Crown, label: 'Admin Dashboard', roles: ['admin'] },
    { path: '/system', icon: Settings, label: 'System Management', roles: ['admin'] },
    { path: '/audit-logs', icon: ClipboardList, label: 'Audit Logs', roles: ['admin'] },

    // My Account — all logged-in users
    { path: '/account', icon: User, label: 'My Account', roles: ['admin', ...DEALERSHIP_ROLES, 'foreign_bond_user'] },
  ];

  if (userRole === 'dealership_manager' && accountType === 'owner') {
    items.splice(11, 0, { path: '/team', icon: Users, label: 'Team', roles: ['dealership_manager'] });
  }
  
  return items.filter(item => item.roles.includes(userRole));
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { displayCurrency, setCurrency, currencies } = useCurrency();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const notifRef = useRef(null);
  const currencyRef = useRef(null);
  
  const navItems = getNavItems(user?.role || 'dealership_manager', user?.account_type || 'owner');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (currencyRef.current && !currencyRef.current.contains(e.target)) setCurrencyOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.data || []);
      setUnread(res.data?.unread || 0);
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch (_) {}
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

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
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-400" />
            <span className="text-lg font-bold">CarTrack UG</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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
        
        <div className="flex-shrink-0 p-4 border-t border-gray-700">
          {/* Currency selector */}
          <div className="relative mb-3" ref={currencyRef}>
            <button
              onClick={() => setCurrencyOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white text-sm"
            >
              <span className="flex items-center gap-2">
                <span>{displayCurrency.flag}</span>
                <span className="font-medium">{displayCurrency.code}</span>
                <span className="text-gray-400 text-xs truncate">{displayCurrency.name}</span>
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            {currencyOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-72 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Display Currency
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {currencies.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 text-left ${
                        c.code === displayCurrency.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="font-mono font-semibold w-10">{c.code}</span>
                      <span className="text-gray-500 text-xs">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Notification bell in sidebar bottom */}
          <div className="relative mb-3" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className="text-sm">Notifications {unread > 0 && `(${unread})`}</span>
            </button>
            {notifOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 && <p className="px-4 py-6 text-center text-gray-400 text-sm">No notifications</p>}
                  {notifications.map(n => (
                    <div key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
