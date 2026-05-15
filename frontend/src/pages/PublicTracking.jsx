import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Clock, MapPin, Package, Truck, Ship, Flag, AlertCircle } from 'lucide-react';
import axios from 'axios';

const EVENT_ICONS = {
  DEPARTURE: Ship,
  PORT_ARRIVAL: Flag,
  CUSTOMS_CLEARANCE: Package,
  BORDER_CROSSING: MapPin,
  INLAND_TRANSIT: Truck,
  FINAL_DELIVERY: CheckCircle,
};

const EVENT_LABELS = {
  DEPARTURE: 'Departed Origin',
  PORT_ARRIVAL: 'Arrived at Port',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  BORDER_CROSSING: 'Border Crossing',
  INLAND_TRANSIT: 'In Transit',
  FINAL_DELIVERY: 'Delivered',
};

const STATUS_STYLES = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Shipped: 'bg-blue-100 text-blue-800',
  'At Border': 'bg-orange-100 text-orange-800',
  Cleared: 'bg-purple-100 text-purple-800',
  Delivered: 'bg-green-100 text-green-800',
};

export default function PublicTracking() {
  const { reference: urlRef } = useParams();
  const [reference, setReference] = useState(urlRef || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!reference.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.get(`/api/tracking/public/${encodeURIComponent(reference.trim())}`);
      setResult(res.data.data);
      navigate(`/track/${encodeURIComponent(reference.trim())}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Order not found. Please check your reference number.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if URL has a reference
  useState(() => {
    if (urlRef) handleSearch();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">CarTrack Uganda — Order Tracking</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Search form */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Vehicle Order</h1>
          <p className="text-gray-500">Enter your order reference number to see real-time shipment status</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-10">
          <input
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="e.g. ORD-2024-001234"
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button type="submit" disabled={loading || !reference.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div className="max-w-xl mx-auto mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Order summary card */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order Reference</p>
                  <p className="text-xl font-bold text-gray-900">{result.order.order_reference}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[result.order.order_status] || 'bg-gray-100 text-gray-700'}`}>
                  {result.order.order_status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t">
                {result.order.make && (
                  <div>
                    <p className="text-xs text-gray-400">Vehicle</p>
                    <p className="text-sm font-medium">{result.order.make} {result.order.model} {result.order.year}</p>
                  </div>
                )}
                {result.order.chassis_number && (
                  <div>
                    <p className="text-xs text-gray-400">Chassis</p>
                    <p className="text-sm font-medium">{result.order.chassis_number}</p>
                  </div>
                )}
                {result.order.current_location && (
                  <div>
                    <p className="text-xs text-gray-400">Current Location</p>
                    <p className="text-sm font-medium">{result.order.current_location}</p>
                  </div>
                )}
                {result.order.expected_delivery_date && (
                  <div>
                    <p className="text-xs text-gray-400">Expected Delivery</p>
                    <p className="text-sm font-medium">{new Date(result.order.expected_delivery_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking timeline */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="font-semibold text-gray-800 mb-5">Shipment Timeline</h2>
              {result.events.length === 0 ? (
                <div className="flex items-center gap-3 text-gray-400 py-4">
                  <Clock className="w-5 h-5" />
                  <p className="text-sm">No tracking events recorded yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {result.events.map((ev, i) => {
                      const Icon = EVENT_ICONS[ev.event_type] || MapPin;
                      const isLast = i === result.events.length - 1;
                      return (
                        <div key={i} className="relative flex gap-4">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isLast ? 'bg-blue-600' : 'bg-gray-100'}`}>
                            <Icon className={`w-5 h-5 ${isLast ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex flex-wrap justify-between items-start gap-1">
                              <p className="font-semibold text-gray-800">{EVENT_LABELS[ev.event_type] || ev.event_type}</p>
                              <p className="text-xs text-gray-400">{ev.event_date ? new Date(ev.event_date).toLocaleDateString() : ''}</p>
                            </div>
                            {ev.location && <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</p>}
                            {ev.description && <p className="text-sm text-gray-500 mt-1">{ev.description}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              Provided by {result.order.supplier_name || 'supplier'} · Managed by {result.order.dealership_name || 'dealership'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
