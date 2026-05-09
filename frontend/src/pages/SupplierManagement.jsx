import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Users, Building2, X } from 'lucide-react';
import api from '../api';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    address: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    license_number: '',
    specialization: '',
    subscription_plan: 'Free Trial',
    subscription_amount: 0,
    subscription_status: 'Active',
    admin_email: '',
    admin_password: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/foreign-bonds');
      setSuppliers(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedSupplier(null);
    setFormData({
      name: '',
      country: '',
      city: '',
      address: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      license_number: '',
      specialization: '',
      admin_email: '',
      admin_password: ''
    });
    setShowModal(true);
  };

  const handleEdit = (supplier) => {
    setModalMode('edit');
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      country: supplier.country,
      city: supplier.city || '',
      address: supplier.address || '',
      contact_person: supplier.contact_person || '',
      contact_email: supplier.contact_email || '',
      contact_phone: supplier.contact_phone || '',
      license_number: supplier.license_number || '',
      specialization: supplier.specialization || '',
      admin_email: '',
      admin_password: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        // Create new supplier with account - map 'name' to 'business_name' for backend
        const payload = {
          ...formData,
          business_name: formData.name
        };
        await api.post('/foreign-bonds/register', payload);
        alert('Supplier created successfully with user account!');
      } else {
        // Update existing supplier
        await api.put(`/foreign-bonds/${selectedSupplier.id}`, formData);
        alert('Supplier updated successfully!');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (error) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier? This will also delete all associated user accounts.')) return;
    try {
      await api.delete(`/foreign-bonds/${id}`);
      alert('Supplier deleted successfully!');
      fetchSuppliers();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete supplier';
      alert(errorMsg);
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Management</h1>
          <p className="text-gray-600">Manage foreign bonds (vehicle suppliers)</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Supplier
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
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-gray-500">{supplier.license_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{supplier.city}, {supplier.country}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{supplier.contact_person}</div>
                    <div className="text-xs text-gray-500">{supplier.contact_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium">{supplier.subscription_plan || 'Free Trial'}</div>
                    <div className="text-xs text-gray-500">${supplier.subscription_amount || 0}/month</div>
                    {supplier.next_payment_date && (
                      <div className="text-xs text-gray-400">Next: {new Date(supplier.next_payment_date).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      supplier.subscription_status === 'Active' ? 'bg-green-100 text-green-800' : 
                      supplier.subscription_status === 'Expired' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {supplier.subscription_status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">
                {modalMode === 'create' ? 'Add New Supplier' : 'Edit Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
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
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Specialization</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select specialization</option>
                    <option value="Japanese Vehicles">Japanese Vehicles</option>
                    <option value="European Vehicles">European Vehicles</option>
                    <option value="American Vehicles">American Vehicles</option>
                    <option value="Luxury Cars">Luxury Cars</option>
                    <option value="Commercial Vehicles">Commercial Vehicles</option>
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
                        'Starter': 199,
                        'Professional': 499,
                        'Enterprise': 999
                      };
                      setFormData({...formData, subscription_plan: plan, subscription_amount: amounts[plan] || 0});
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Free Trial">Free Trial</option>
                    <option value="Starter">Starter ($199/month)</option>
                    <option value="Professional">Professional ($499/month)</option>
                    <option value="Enterprise">Enterprise ($999/month)</option>
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

                {modalMode === 'create' && (
                  <>
                    <div className="col-span-2 border-t pt-4">
                      <h3 className="font-semibold mb-2">User Account (for supplier login)</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Admin Email *</label>
                      <input
                        type="email"
                        required={modalMode === 'create'}
                        value={formData.admin_email}
                        onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password *</label>
                      <input
                        type="password"
                        required={modalMode === 'create'}
                        value={formData.admin_password}
                        onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {modalMode === 'create' ? 'Create Supplier & Account' : 'Update Supplier'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
