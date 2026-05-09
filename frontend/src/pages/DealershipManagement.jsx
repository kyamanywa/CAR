import { useState, useEffect } from 'react';
import api from '../api';
import { Building2, Plus, Edit, Trash2, Eye, Users, Key, X, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { countries } from '../data/countries';

export default function DealershipManagement() {
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedDealership, setSelectedDealership] = useState(null);
  const [dealershipUsers, setDealershipUsers] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    country: 'Uganda',
    city: '',
    address: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    license_number: '',
    specialization: '',
    status: 'Active',
    subscription_plan: 'Free Trial',
    subscription_amount: 0,
    subscription_status: 'Active'
  });

  useEffect(() => {
    fetchDealerships();
  }, []);

  const fetchDealerships = async () => {
    try {
      const res = await api.get('/dealerships');
      setDealerships(res.data.data);
    } catch (error) {
      console.error('Error fetching dealerships:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDealershipUsers = async (dealershipId) => {
    try {
      const res = await api.get(`/users/bond/${dealershipId}`);
      setDealershipUsers(res.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setDealershipUsers([]);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      name: '',
      country: 'Uganda',
      city: '',
      address: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      license_number: '',
      specialization: '',
      status: 'Active',
      subscription_plan: 'Free Trial',
      subscription_amount: 0,
      subscription_status: 'Active'
    });
    setShowModal(true);
  };

  const handleEdit = (dealership) => {
    setModalMode('edit');
    setSelectedDealership(dealership);
    setFormData({
      name: dealership.name,
      country: dealership.country,
      city: dealership.city,
      address: dealership.address || '',
      contact_person: dealership.contact_person || '',
      contact_email: dealership.contact_email || '',
      contact_phone: dealership.contact_phone || '',
      license_number: dealership.license_number || '',
      specialization: dealership.specialization || '',
      status: dealership.status || 'Active',
      subscription_plan: dealership.subscription_plan || 'Free Trial',
      subscription_amount: dealership.subscription_amount || 0,
      subscription_status: dealership.subscription_status || 'Active'
    });
    setShowModal(true);
  };

  const handleViewDetails = async (dealership) => {
    setSelectedDealership(dealership);
    await fetchDealershipUsers(dealership.id);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await api.post('/dealerships', formData);
        alert('Dealership created successfully!');
      } else {
        await api.put(`/dealerships/${selectedDealership.id}`, formData);
        alert('Dealership updated successfully!');
      }
      setShowModal(false);
      fetchDealerships();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Operation failed';
      alert(errorMsg);
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this dealership? This will also delete all associated user accounts.')) return;
    try {
      await api.delete(`/dealerships/${id}`);
      alert('Dealership deleted successfully!');
      fetchDealerships();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete dealership';
      alert(errorMsg);
      console.error('Delete error:', error);
    }
  };

  const handlePasswordReset = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordReset(true);
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { new_password: newPassword });
      alert(`Password reset successfully for ${selectedUser.email}`);
      setShowPasswordReset(false);
      setNewPassword('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to reset password';
      alert(errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dealership Management</h1>
          <p className="text-gray-600">Manage car dealerships (buyers)</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Dealership
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dealerships.map((dealership) => (
                <tr key={dealership.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{dealership.name}</div>
                        <div className="text-sm text-gray-500">{dealership.license_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{dealership.city}, {dealership.country}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{dealership.contact_person}</div>
                    <div className="text-xs text-gray-500">{dealership.contact_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium">{dealership.subscription_plan || 'Free Trial'}</div>
                    <div className="text-xs text-gray-500">${dealership.subscription_amount || 0}/month</div>
                    {dealership.next_payment_date && (
                      <div className="text-xs text-gray-400">Next: {new Date(dealership.next_payment_date).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dealership.subscription_status === 'Active' ? 'bg-green-100 text-green-800' : 
                      dealership.subscription_status === 'Expired' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {dealership.subscription_status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(dealership)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(dealership)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dealership.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {modalMode === 'create' ? 'Add New Dealership' : 'Edit Dealership'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">License Number</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Specialization</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select specialization</option>
                    <option value="New Cars">New Cars</option>
                    <option value="Used Cars">Used Cars</option>
                    <option value="Luxury Vehicles">Luxury Vehicles</option>
                    <option value="Commercial Vehicles">Commercial Vehicles</option>
                    <option value="All Types">All Types</option>
                  </select>
                </div>

                {/* Subscription Details */}
                <div className="col-span-2 border-t pt-4">
                  <h3 className="font-semibold mb-2">Subscription Details</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Subscription Plan</label>
                  <select
                    value={formData.subscription_plan}
                    onChange={(e) => {
                      const plan = e.target.value;
                      const amounts = {
                        'Free Trial': 0,
                        'Basic': 99,
                        'Business': 299,
                        'Enterprise': 599
                      };
                      setFormData({...formData, subscription_plan: plan, subscription_amount: amounts[plan] || 0});
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Free Trial">Free Trial</option>
                    <option value="Basic">Basic ($99/month)</option>
                    <option value="Business">Business ($299/month)</option>
                    <option value="Enterprise">Enterprise ($599/month)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Amount (USD)</label>
                  <input
                    type="number"
                    value={formData.subscription_amount}
                    onChange={(e) => setFormData({...formData, subscription_amount: parseFloat(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Subscription Status</label>
                  <select
                    value={formData.subscription_status}
                    onChange={(e) => setFormData({...formData, subscription_status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {modalMode === 'create' ? 'Create Dealership' : 'Update Dealership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDealership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedDealership.name}</h2>
                <p className="text-gray-600">{selectedDealership.city}, {selectedDealership.country}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-600">Company Name</label>
                    <p className="font-medium">{selectedDealership.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">License Number</label>
                    <p className="font-medium">{selectedDealership.license_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Country</label>
                    <p className="font-medium flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      {selectedDealership.country}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">City</label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedDealership.city}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Address</label>
                    <p className="font-medium">{selectedDealership.address || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Specialization</label>
                    <p className="font-medium">{selectedDealership.specialization || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDealership.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedDealership.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-600">Contact Person</label>
                    <p className="font-medium">{selectedDealership.contact_person || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedDealership.contact_email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedDealership.contact_phone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscription Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Subscription Details</h3>
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-600">Plan</label>
                    <p className="font-medium">{selectedDealership.subscription_plan || 'Free Trial'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Monthly Amount</label>
                    <p className="font-medium">${selectedDealership.subscription_amount || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDealership.subscription_status === 'Active' ? 'bg-green-100 text-green-800' : 
                      selectedDealership.subscription_status === 'Expired' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedDealership.subscription_status || 'Active'}
                    </span>
                  </div>
                  {selectedDealership.subscription_start_date && (
                    <div>
                      <label className="text-sm text-gray-600">Start Date</label>
                      <p className="font-medium">{new Date(selectedDealership.subscription_start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedDealership.next_payment_date && (
                    <div>
                      <label className="text-sm text-gray-600">Next Payment</label>
                      <p className="font-medium">{new Date(selectedDealership.next_payment_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedDealership.payment_method && (
                    <div>
                      <label className="text-sm text-gray-600">Payment Method</label>
                      <p className="font-medium">{selectedDealership.payment_method}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Accounts */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Accounts ({dealershipUsers.length})
                </h3>
                {dealershipUsers.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Role</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dealershipUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-2">{user.full_name}</td>
                            <td className="px-4 py-2">{user.email}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() => handlePasswordReset(user)}
                                className="text-orange-600 hover:text-orange-800 flex items-center gap-1 ml-auto"
                                title="Reset Password"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No user accounts found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Reset Password</h2>
              <button onClick={() => setShowPasswordReset(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordResetSubmit} className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Reset password for: <strong>{selectedUser.email}</strong>
                </p>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter new password (min 6 characters)"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
