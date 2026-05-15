import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { CurrencyProvider } from './CurrencyContext';
import Layout from './components/Layout';
import { loadCurrencyConfig } from './utils/currencyUtils';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SalesDashboard from './pages/SalesDashboard';
import ForeignBonds from './pages/ForeignBonds';
import Dealerships from './pages/Dealerships';
import SupplierManagement from './pages/SupplierManagement';
import DealershipManagement from './pages/DealershipManagement';
import SystemManagement from './pages/SystemManagement';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Shipping from './pages/Shipping';
import ShippingManagement from './pages/ShippingManagement';
import BorderClearance from './pages/BorderClearance';
import BorderClearanceManagement from './pages/BorderClearanceManagement';
import Sales from './pages/Sales';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import FinancialManagement from './pages/FinancialManagement';
import SupplierDashboard from './pages/SupplierDashboard';
import AddVehicle from './pages/AddVehicle';
import SupplierInventory from './pages/SupplierInventory';
import SupplierOrders from './pages/SupplierOrders';
import SupplierOrdersManagement from './pages/SupplierOrdersManagement';
import SupplierCustomers from './pages/SupplierCustomers';
import SupplierSubscription from './pages/SupplierSubscription';
import SupplierTeam from './pages/SupplierTeam';
import ReferenceData from './pages/ReferenceData';
import PaymentPage from './pages/PaymentPage';
import PaymentCallback from './pages/PaymentCallback';
import LandingPage from './pages/LandingPage';
import CSVImport from './pages/CSVImport';
import CompanyProfile from './pages/CompanyProfile';
import DealershipInventory from './pages/DealershipInventory';
import LoanManagement from './pages/LoanManagement';
import PublicTracking from './pages/PublicTracking';
import Inspections from './pages/Inspections';
import AuditLogs from './pages/AuditLogs';
import TestDrives from './pages/TestDrives';
import Expenses from './pages/Expenses';
import MyAccount from './pages/MyAccount';

function ProtectedRoute({ children, allowedRoles }) {
  const { token, loading, user } = useAuth();
  const DEALERSHIP_ROLES = ['dealership_manager', 'dealership_sales', 'dealership_accountant'];
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If roles are specified, check if user has permission
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'foreign_bond_user') {
      return <Navigate to="/supplier/dashboard" replace />;
    }
    if (DEALERSHIP_ROLES.includes(user?.role)) {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function DashboardRedirect() {
  const { user } = useAuth();
  
  // Redirect suppliers to their dashboard
  if (user?.role === 'foreign_bond_user') {
    return <Navigate to="/supplier/dashboard" replace />;
  }

  // Sales role gets the sales-focused dashboard
  if (user?.role === 'dealership_sales') {
    return <Navigate to="/sales-dashboard" replace />;
  }

  // Platform admin lands on admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  // All other dealership roles see main dashboard
  return <Dashboard />;
}

function SubscriptionRouteRedirect() {
  const { user } = useAuth();

  if (user?.role === 'foreign_bond_user') {
    return <Navigate to="/supplier/subscription" replace />;
  }

  if (user?.role === 'dealership_manager') {
    return <Navigate to="/payment" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/system" replace />;
  }

  return <Navigate to="/" replace />;
}

export default function App() {
  // Load currency configuration on app startup
  useEffect(() => {
    loadCurrencyConfig();
  }, []);

  return (
    <CurrencyProvider>
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/track" element={<PublicTracking />} />
      <Route path="/track/:reference" element={<PublicTracking />} />
      
      {/* Payment Routes (outside main layout) */}
      <Route path="/payment" element={
        <ProtectedRoute>
          <PaymentPage />
        </ProtectedRoute>
      } />
      <Route path="/subscription/callback" element={
        <ProtectedRoute>
          <PaymentCallback />
        </ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute>
          <SubscriptionRouteRedirect />
        </ProtectedRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Main Dashboard - redirects based on role */}
        <Route index element={<DashboardRedirect />} />
        
        {/* Sales Dashboard */}
        <Route path="sales-dashboard" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <SalesDashboard />
          </ProtectedRoute>
        } />
        
        {/* Admin Only Routes */}
        <Route path="admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="system" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SystemManagement />
          </ProtectedRoute>
        } />
        <Route path="audit-logs" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AuditLogs />
          </ProtectedRoute>
        } />
        <Route path="foreign-bonds" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ForeignBonds />
          </ProtectedRoute>
        } />
        <Route path="supplier-management" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SupplierManagement />
          </ProtectedRoute>
        } />
        <Route path="dealership-management" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DealershipManagement />
          </ProtectedRoute>
        } />
        
        {/* Admin & Dealership Routes */}
        <Route path="dealerships" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Dealerships />
          </ProtectedRoute>
        } />
        <Route path="ugandan-bonds" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Dealerships />
          </ProtectedRoute>
        } />
        <Route path="inventory" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="local-inventory" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <DealershipInventory />
          </ProtectedRoute>
        } />
        <Route path="csv-import" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <CSVImport />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="shipping" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <ShippingManagement />
          </ProtectedRoute>
        } />
        <Route path="border-clearance" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <BorderClearanceManagement />
          </ProtectedRoute>
        } />
        <Route path="sales" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales', 'dealership_accountant']}>
            <Sales />
          </ProtectedRoute>
        } />
        <Route path="customers" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales', 'dealership_accountant']}>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_accountant']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="financials" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_accountant']}>
            <FinancialManagement />
          </ProtectedRoute>
        } />
        <Route path="loans" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_accountant']}>
            <LoanManagement />
          </ProtectedRoute>
        } />
        <Route path="inspections" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales', 'dealership_accountant']}>
            <Inspections />
          </ProtectedRoute>
        } />
        <Route path="test-drives" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales']}>
            <TestDrives />
          </ProtectedRoute>
        } />
        <Route path="expenses" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_accountant']}>
            <Expenses />
          </ProtectedRoute>
        } />
        <Route path="account" element={
          <ProtectedRoute>
            <MyAccount />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute allowedRoles={['dealership_manager', 'dealership_sales', 'dealership_accountant']}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="team" element={
          <ProtectedRoute allowedRoles={['dealership_manager']}>
            <SupplierTeam />
          </ProtectedRoute>
        } />
        <Route path="company-profile" element={
          <ProtectedRoute allowedRoles={['dealership_manager']}>
            <CompanyProfile />
          </ProtectedRoute>
        } />
        
        {/* Supplier Only Routes */}
        <Route path="supplier/dashboard" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierDashboard />
          </ProtectedRoute>
        } />
        <Route path="supplier/inventory" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierInventory />
          </ProtectedRoute>
        } />
        <Route path="supplier/add-vehicle" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <AddVehicle />
          </ProtectedRoute>
        } />
        <Route path="supplier/orders" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierOrders />
          </ProtectedRoute>
        } />
        <Route path="supplier/orders-received" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierOrdersManagement />
          </ProtectedRoute>
        } />
        <Route path="supplier/shipping" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <ShippingManagement />
          </ProtectedRoute>
        } />
        <Route path="supplier/border-clearance" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <BorderClearanceManagement />
          </ProtectedRoute>
        } />
        <Route path="supplier/customers" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierCustomers />
          </ProtectedRoute>
        } />
        <Route path="supplier/analytics" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="supplier/financials" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <FinancialManagement />
          </ProtectedRoute>
        } />
        <Route path="supplier/subscription" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierSubscription />
          </ProtectedRoute>
        } />
        <Route path="supplier/team" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <SupplierTeam />
          </ProtectedRoute>
        } />
        <Route path="supplier/company-profile" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <CompanyProfile />
          </ProtectedRoute>
        } />
        <Route path="supplier/reference-data" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <ReferenceData />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
    </CurrencyProvider>
  );
}
