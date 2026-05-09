import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Car, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      // Redirect based on role
      if (userData.role === 'foreign_bond_user') {
        navigate('/supplier/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Car className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Car Tracking System</h1>
          <p className="text-gray-500 mt-1">Uganda Import Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@cartracking.ug"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-600 hover:underline font-medium">
              Register here
            </a>
          </p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center mb-2">Demo credentials:</p>
          <div className="space-y-1 text-xs text-gray-600">
            <p className="text-center"><strong>👑 Admin:</strong> admin@cartracking.ug / admin123</p>
            <p className="text-center"><strong>🏪 Dealership:</strong> manager@kpmmotors.ug / bond123</p>
            <p className="text-center font-semibold mt-2">🏭 Suppliers (password: supplier123):</p>
            <div className="text-center space-y-0.5 text-[10px]">
              <p>supplier@tokyoauto.jp (Japan 🇯🇵)</p>
              <p>supplier@osakamotors.jp (Japan 🇯🇵)</p>
              <p>supplier@dubaiautozone.ae (UAE 🇦🇪)</p>
              <p>supplier@sharjahcars.ae (UAE 🇦🇪)</p>
              <p>supplier@ukautotraders.co.uk (UK 🇬🇧)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
