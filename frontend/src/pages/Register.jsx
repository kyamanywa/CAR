import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Car, Building2, Globe, Mail, Lock, User, MapPin, Phone } from 'lucide-react';
import { countries } from '../data/countries';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState('dealership'); // 'dealership' or 'supplier'
  const [formData, setFormData] = useState({
    business_name: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    license_number: '',
    contact_person: '',
    specialization: '',
    admin_email: '',
    admin_password: '',
    confirm_password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.admin_password !== formData.confirm_password) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const endpoint = accountType === 'supplier' 
        ? '/foreign-bonds/register' 
        : '/dealerships/register';
      
      await api.post(endpoint, formData);
      alert('Registration successful! You can now login with your email.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left side - Branding */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <Car className="w-12 h-12" />
              <h1 className="text-3xl font-bold">CarTrack Global</h1>
            </div>
            <h2 className="text-2xl font-semibold mb-4">
              {accountType === 'supplier' ? 'Supplier Registration' : 'Dealership Registration'}
            </h2>
            <p className="text-blue-100 mb-6">
              {accountType === 'supplier' 
                ? 'Join our global network of vehicle suppliers and reach dealerships worldwide.'
                : 'Join thousands of car dealerships worldwide managing their inventory with our platform.'}
            </p>
            <ul className="space-y-3">
              {accountType === 'supplier' ? (
                <>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>List your vehicle inventory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Receive orders from dealerships</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Track shipments and sales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Global marketplace access</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Track vehicles from import to sale</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Manage customers and orders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Real-time analytics and reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Multi-user support</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Right side - Registration Form */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Account</h2>
            <p className="text-gray-600 mb-4">
              Register your {accountType === 'supplier' ? 'supplier company' : 'dealership'} in minutes
            </p>

            {/* Account Type Selector */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setAccountType('dealership')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  accountType === 'dealership'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🏪 Dealership (Buyer)
              </button>
              <button
                type="button"
                onClick={() => setAccountType('supplier')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  accountType === 'supplier'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🏭 Supplier (Seller)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Business Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ABC Motors Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Country *
                  </label>
                  <select
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Kampala"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+256 700 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="info@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              {accountType === 'supplier' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select specialization</option>
                    <option value="Japanese Vehicles">Japanese Vehicles</option>
                    <option value="European Vehicles">European Vehicles</option>
                    <option value="American Vehicles">American Vehicles</option>
                    <option value="Luxury Cars">Luxury Cars</option>
                    <option value="Commercial Vehicles">Commercial Vehicles</option>
                    <option value="All Types">All Types</option>
                  </select>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Admin Account</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Your Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@company.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={formData.admin_password}
                      onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Confirm *
                    </label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-blue-600 hover:underline font-medium">
                  Login here
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
