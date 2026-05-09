import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Generic fetch with auth helper
export const fetchWithAuth = async (endpoint) => {
  const response = await api.get(endpoint);
  return response.data;
};

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getPipeline = () => api.get('/dashboard/pipeline');
export const getRecentOrders = () => api.get('/dashboard/recent-orders');
export const getRecentSales = () => api.get('/dashboard/recent-sales');
export const getSalesAnalytics = (params) => api.get('/dashboard/analytics/sales', { params });
export const getImportAnalytics = (params) => api.get('/dashboard/analytics/imports', { params });
export const getInventoryAnalytics = (params) => api.get('/dashboard/analytics/inventory', { params });

// Foreign Bonds
export const getForeignBonds = (params) => api.get('/foreign-bonds', { params });
export const getForeignBond = (id) => api.get(`/foreign-bonds/${id}`);
export const getForeignBondVehicles = (id, params) => api.get(`/foreign-bonds/${id}/vehicles`, { params });

// Ugandan Bonds
export const getUgandanBonds = (params) => api.get('/ugandan-bonds', { params });
export const getUgandanBond = (id) => api.get(`/ugandan-bonds/${id}`);
export const getUgandanBondVehicles = (id, params) => api.get(`/ugandan-bonds/${id}/vehicles`, { params });
export const getUgandanBondOrders = (id) => api.get(`/ugandan-bonds/${id}/orders`);
export const getUgandanBondDashboard = (id) => api.get(`/ugandan-bonds/${id}/dashboard`);

// Import Orders
export const getImportOrders = (params) => api.get('/import-orders', { params });
export const getImportOrder = (id) => api.get(`/import-orders/${id}`);
export const createImportOrder = (data) => api.post('/import-orders', data);
export const updateOrderStatus = (id, status) => api.patch(`/import-orders/${id}/status`, { status });
export const confirmOrder = (id) => api.patch(`/import-orders/${id}/confirm`);
export const updateImportOrder = (id, data) => api.put(`/import-orders/${id}`, data);
export const deleteImportOrder = (id) => api.delete(`/import-orders/${id}`);

// Shipping
export const getShipments = (params) => api.get('/shipping', { params });
export const getShipment = (id) => api.get(`/shipping/${id}`);
export const searchByBL = (blNumber) => api.get(`/shipping/search/bl/${blNumber}`);
export const createShipment = (data) => api.post('/shipping', data);
export const updateShipmentStatus = (id, data) => api.patch(`/shipping/${id}/status`, data);

// Border Clearance
export const getBorderClearances = (params) => api.get('/border-clearance', { params });
export const getBorderClearance = (id) => api.get(`/border-clearance/${id}`);
export const getBorderSummary = () => api.get('/border-clearance/summary/by-border');
export const createBorderClearance = (data) => api.post('/border-clearance', data);
export const updateClearanceStatus = (id, data) => api.patch(`/border-clearance/${id}/status`, data);

// Taxes
export const calculateTax = (data) => api.post('/taxes/calculate', data);
export const getOrderTaxes = (orderId) => api.get(`/taxes/order/${orderId}`);

// Inventory
export const getVehicles = (params) => api.get('/inventory', { params });
export const getVehicle = (id) => api.get(`/inventory/${id}`);
export const getVehicleHistory = (id) => api.get(`/inventory/${id}/history`);
export const searchByChassis = (chassis) => api.get(`/inventory/search/chassis/${chassis}`);
export const updateVehicleImage = (id, imageUrl) => api.patch(`/inventory/${id}`, { image_url: imageUrl });

// Local Sales
export const getSales = (params) => api.get('/local-sales', { params });
export const getSale = (id) => api.get(`/local-sales/${id}`);
export const getSalesStats = (params) => api.get('/local-sales/stats/summary', { params });
export const createSale = (data) => api.post('/local-sales', data);
export const updateSalePayment = (id, data) => api.patch(`/local-sales/${id}/payment`, data);
export const deleteSale = (id) => api.delete(`/local-sales/${id}`);

// Customers
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Reports
export const getFinancialSummary = (params) => api.get('/reports/financial-summary', { params });
export const getInventoryReport = () => api.get('/reports/inventory');
export const getCustomerReport = () => api.get('/reports/customers');
export const getImportOrdersReport = () => api.get('/reports/import-orders');

// Users (for bond management)
export const getUsers = () => api.get('/users');
export const getBondUsers = (bondId) => api.get(`/users/bond/${bondId}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const changePassword = (id, newPassword) => api.put(`/users/${id}/password`, { newPassword });
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Dealerships (Ugandan Bonds Management)
export const registerDealership = (data) => api.post('/dealerships/register', data);
export const registerSupplier = (data) => api.post('/foreign-bonds/register', data);
export const getDealerships = (params) => api.get('/dealerships', { params });
export const getDealership = (id) => api.get(`/dealerships/${id}`);
export const createDealership = (data) => api.post('/dealerships', data);
export const updateDealership = (id, data) => api.put(`/dealerships/${id}`, data);

// System Management
export const getSystemStats = () => api.get('/system/stats');
export const getActivityLogs = (params) => api.get('/system/activity-logs', { params });
export const sendNotification = (data) => api.post('/system/notifications', data);
export const getSystemHealth = () => api.get('/system/health');

// Supplier (Foreign Bond User) Routes
export const getMyVehicles = () => api.get('/inventory/my/vehicles');
export const addMyVehicle = (data) => api.post('/inventory/my/vehicles', data);
export const updateMyVehicle = (id, data) => api.put(`/inventory/my/vehicles/${id}`, data);
export const deleteMyVehicle = (id) => api.delete(`/inventory/my/vehicles/${id}`);
export const getMyOrders = () => api.get('/inventory/my/orders');

// Team Management
export const getTeamMembers = () => api.get('/team/members');
export const getPendingInvitations = () => api.get('/team/invitations');
export const inviteTeamMember = (data) => api.post('/team/invite', data);
export const createTeamMember = (data) => api.post('/team/create-user', data);
export const acceptInvitation = (token, data) => api.post(`/team/accept-invite/${token}`, data);
export const updateTeamMember = (id, data) => api.patch(`/team/members/${id}`, data);
export const removeTeamMember = (id) => api.delete(`/team/members/${id}`);
export const cancelInvitation = (id) => api.delete(`/team/invitations/${id}`);

// Subscription Info
export const getMySubscription = () => api.get('/subscription-info/my-subscription');
export const checkLimit = (action) => api.post('/subscription-info/check-limit', { action });

// Reference Data
export const getMakes = () => api.get('/reference-data/makes');
export const createMake = (data) => api.post('/reference-data/makes', data);
export const updateMake = (id, data) => api.put(`/reference-data/makes/${id}`, data);
export const deleteMake = (id) => api.delete(`/reference-data/makes/${id}`);

export const getModels = (makeId) => api.get('/reference-data/models', { params: { make_id: makeId } });
export const createModel = (data) => api.post('/reference-data/models', data);
export const updateModel = (id, data) => api.put(`/reference-data/models/${id}`, data);
export const deleteModel = (id) => api.delete(`/reference-data/models/${id}`);

export const getColors = () => api.get('/reference-data/colors');
export const createColor = (data) => api.post('/reference-data/colors', data);
export const updateColor = (id, data) => api.put(`/reference-data/colors/${id}`, data);
export const deleteColor = (id) => api.delete(`/reference-data/colors/${id}`);

// Tracking Events
export const getOrderTracking = (orderId) => api.get(`/tracking/order/${orderId}`);
export const getOrderTimeline = (orderId) => api.get(`/tracking/order/${orderId}/timeline`);
export const addTrackingEvent = (data) => api.post('/tracking', data);
export const updateTrackingEvent = (id, data) => api.patch(`/tracking/${id}`, data);
export const deleteTrackingEvent = (id) => api.delete(`/tracking/${id}`);

export default api;
