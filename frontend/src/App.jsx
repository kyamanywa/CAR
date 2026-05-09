import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
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

function ProtectedRoute({ children, allowedRoles }) {
  const { token, loading, user } = useAuth();
  
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
  
  // All others (admin, dealership_manager) see main dashboard
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
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
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Main Dashboard - redirects based on role */}
        <Route index element={<DashboardRedirect />} />
        
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
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="csv-import" element={
          <ProtectedRoute allowedRoles={['admin', 'foreign_bond_user']}>
            <CSVImport />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="shipping" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <ShippingManagement />
          </ProtectedRoute>
        } />
        <Route path="border-clearance" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <BorderClearanceManagement />
          </ProtectedRoute>
        } />
        <Route path="sales" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Sales />
          </ProtectedRoute>
        } />
        <Route path="customers" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute allowedRoles={['admin', 'dealership_manager']}>
            <Analytics />
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
        <Route path="supplier/reference-data" element={
          <ProtectedRoute allowedRoles={['foreign_bond_user']}>
            <ReferenceData />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}
