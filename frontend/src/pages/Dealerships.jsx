import { useState, useEffect } from 'react';
import { getUgandanBonds, getUgandanBondVehicles, getUgandanBondOrders, getUgandanBondDashboard, getBondUsers } from '../api';
import { Building2, MapPin, Car, Package, TrendingUp, X, Plus, Users as UsersIcon, Calendar, CheckCircle, XCircle, Globe } from 'lucide-react';
import api from '../api';
import { countries } from '../data/countries';

export default function Dealerships() {
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBond, setSelectedBond] = useState(null);
  const [bondData, setBondData] = useState({ vehicles: [], orders: [], dashboard: null, users: [] });
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddBond, setShowAddBond] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showCreateUserPrompt, setShowCreateUserPrompt] = useState(false);
  const [newlyCreatedDealership, setNewlyCreatedDealership] = useState(null);
  const [newBond, setNewBond] = useState({
    name: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    license_number: '',
    status: 'Active'
  });
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'dealership_manager'
  });

  useEffect(() => {
    fetchBonds();
  }, []);

  const fetchBonds = async () => {
    try {
      const res = await getUgandanBonds();
      setBonds(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBond = async (bond) => {
    setSelectedBond(bond);
    setDataLoading(true);
    setActiveTab('overview');
    try {
      const [vehiclesRes, ordersRes, dashboardRes, usersRes] = await Promise.all([
        getUgandanBondVehicles(bond.id),
        getUgandanBondOrders(bond.id),
        getUgandanBondDashboard(bond.id),
        getBondUsers(bond.id)
      ]);
      setBondData({
        vehicles: vehiclesRes.data.data,
        orders: ordersRes.data.data,
        dashboard: dashboardRes.data.data,
        users: usersRes.data.data
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddBond = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/dealerships', newBond);
      const dealership = response.data;
      setShowAddBond(false);
      setNewBond({
        name: '',
        country: '',
        city: '',
        address: '',
        phone: '',
        email: '',
        license_number: '',
        status: 'Active'
      });
      fetchBonds();
      // Prompt to create user account
      setNewlyCreatedDealership(dealership);
      setShowCreateUserPrompt(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to add dealership');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const dealershipId = selectedBond?.id || newlyCreatedDealership?.dealership_id;
      await api.post('/users', { ...newUser, dealership_id: dealershipId });
      setShowAddUser(false);
      setShowCreateUserPrompt(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'dealership_manager' });
      setNewlyCreatedDealership(null);
      // Refresh users list if viewing a dealership
      if (selectedBond) {
        const usersRes = await getBondUsers(selectedBond.id);
        setBondData({ ...bondData, users: usersRes.data.data });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to add user');
    }
  };

  const handleSkipUserCreation = () => {
    setShowCreateUserPrompt(false);
    setNewlyCreatedDealership(null);
    setNewUser({ email: '', password: '', full_name: '', role: 'dealership_manager' });
  };

  const handleToggleStatus = async (bondId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
      await api.put(`/dealerships/${bondId}`, { status: newStatus });
      fetchBonds();
      if (selectedBond?.id === bondId) {
        setSelectedBond({ ...selectedBond, status: newStatus });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dealerships</h1>
          <p className="text-gray-500">Manage car dealerships subscribed to your system</p>
        </div>
        <button
          onClick={() => setShowAddBond(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Dealership
        </button>
      </div>

      {/* Add Bond Modal */}
      {showAddBond && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Dealership</h2>
              <button onClick={() => setShowAddBond(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBond} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={newBond.name}
                  onChange={(e) => setNewBond({ ...newBond, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <select
                  required
                  value={newBond.country}
                  onChange={(e) => setNewBond({ ...newBond, country: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={newBond.city}
                  onChange={(e) => setNewBond({ ...newBond, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={newBond.address}
                  onChange={(e) => setNewBond({ ...newBond, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newBond.phone}
                    onChange={(e) => setNewBond({ ...newBond, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newBond.email}
                    onChange={(e) => setNewBond({ ...newBond, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">License Number</label>
                <input
                  type="text"
                  value={newBond.license_number}
                  onChange={(e) => setNewBond({ ...newBond, license_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Add Dealership
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBond(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bonds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bonds.map((bond) => (
          <div key={bond.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{bond.name}</h3>
              </div>
              {bond.status === 'Active' ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Suspended
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{bond.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{bond.city}</span>
              </div>
              {bond.contact_phone && (
                <div className="text-gray-500">📞 {bond.contact_phone}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-xs text-gray-600">In Stock</div>
                <div className="text-xl font-bold text-blue-600">{bond.in_stock_count || 0}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-xs text-gray-600">Pending Orders</div>
                <div className="text-xl font-bold text-orange-600">{bond.pending_orders || 0}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleViewBond(bond)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                View Details
              </button>
              <button
                onClick={() => handleToggleStatus(bond.id, bond.status)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  bond.status === 'Active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {bond.status === 'Active' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bond Details Modal */}
      {selectedBond && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedBond.name}</h2>
                <p className="text-gray-500">{selectedBond.country} - {selectedBond.city}</p>
              </div>
              <button onClick={() => setSelectedBond(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b bg-gray-50">
              <div className="flex gap-4 px-6">
                {['overview', 'inventory', 'orders', 'users'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-4 font-medium capitalize ${
                      activeTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {dataLoading ? (
                <div className="flex justify-center items-center h-64">Loading...</div>
              ) : (
                <>
                  {activeTab === 'overview' && bondData.dashboard && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                        <Car className="w-8 h-8 mb-2 opacity-80" />
                        <div className="text-2xl font-bold">{bondData.dashboard.vehicles?.total || 0}</div>
                        <div className="text-sm opacity-90">Total Vehicles</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                        <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
                        <div className="text-2xl font-bold">{bondData.dashboard.vehicles?.in_stock || 0}</div>
                        <div className="text-sm opacity-90">In Stock</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                        <Package className="w-8 h-8 mb-2 opacity-80" />
                        <div className="text-2xl font-bold">{bondData.dashboard.orders?.total || 0}</div>
                        <div className="text-sm opacity-90">Import Orders</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                        <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                        <div className="text-2xl font-bold">{bondData.dashboard.sales?.total_sales || 0}</div>
                        <div className="text-sm opacity-90">Total Sales</div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'inventory' && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Vehicle Inventory</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Chassis</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Make/Model</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Year</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bondData.vehicles.map((vehicle) => (
                              <tr key={vehicle.id}>
                                <td className="px-4 py-3 text-sm">{vehicle.chassis_number}</td>
                                <td className="px-4 py-3 text-sm">{vehicle.make} {vehicle.model}</td>
                                <td className="px-4 py-3 text-sm">{vehicle.year}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    vehicle.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {vehicle.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {bondData.vehicles.length === 0 && (
                          <div className="text-center py-8 text-gray-500">No vehicles found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'orders' && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Import Orders</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Order Number</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vehicle</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Order Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bondData.orders.map((order) => (
                              <tr key={order.id}>
                                <td className="px-4 py-3 text-sm">{order.order_number}</td>
                                <td className="px-4 py-3 text-sm">{order.chassis_number}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {order.order_status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">{new Date(order.order_date).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {bondData.orders.length === 0 && (
                          <div className="text-center py-8 text-gray-500">No orders found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">User Accounts</h3>
                        <button
                          onClick={() => setShowAddUser(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add User
                        </button>
                      </div>
                      <div className="space-y-2">
                        {bondData.users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <UsersIcon className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="font-medium">{user.email}</div>
                                <div className="text-sm text-gray-500">{user.role}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                        {bondData.users.length === 0 && (
                          <div className="text-center py-8 text-gray-500">No users found</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal (from Users tab) */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add User to {selectedBond?.name}</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Prompt Modal (after dealership creation) */}
      {showCreateUserPrompt && newlyCreatedDealership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-green-600">✓ Dealership Created!</h2>
                <p className="text-sm text-gray-600 mt-1">Now create login credentials for this dealership</p>
              </div>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Dealership:</strong> {newBond.name}<br />
                  <strong>Location:</strong> {newBond.city}, {newBond.country}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Manager Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (Login Username) *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="manager@dealership.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                ⚠️ Make sure to save these credentials - they will be needed to login
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Create Login Account
                </button>
                <button
                  type="button"
                  onClick={handleSkipUserCreation}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Skip for Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
