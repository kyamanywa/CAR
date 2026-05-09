import { useState, useEffect } from 'react';
import { getVehicles, getMakes, getVehicleHistory } from '../api';
import { Car, Search, Filter, X, MapPin, Ship, Shield, DollarSign } from 'lucide-react';

export default function Inventory() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [makes, setMakes] = useState([]);
  const [filters, setFilters] = useState({ status: '', make: '', search: '' });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchMakes();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [filters.status, filters.make]);

  const fetchMakes = async () => {
    try {
      const res = await getMakes();
      setMakes(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.make) params.make = filters.make;
      if (filters.search) params.search = filters.search;
      const res = await getVehicles(params);
      setVehicles(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVehicles();
  };

  const handleViewHistory = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setHistoryLoading(true);
    try {
      const res = await getVehicleHistory(vehicle.id);
      setHistory(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const statuses = ['Available', 'Ordered', 'In Transit', 'At Border', 'In Stock', 'Sold'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-gray-500">All vehicles across bonds</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by chassis, make, model..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input w-40"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filters.make}
            onChange={(e) => setFilters({ ...filters, make: e.target.value })}
            className="input w-40"
          >
            <option value="">All Makes</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Vehicle</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Chassis</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Location</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No vehicles found</td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Car className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{v.make} {v.model}</p>
                          <p className="text-sm text-gray-500">{v.year} • {v.color} • {v.engine_cc}cc</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm">{v.chassis_number}</td>
                    <td className="p-4">
                      <p className="text-sm">{v.dealership_name || v.foreign_bond_name || '-'}</p>
                      <p className="text-xs text-gray-500">{v.origin_country || '-'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        v.status === 'In Stock' || v.status === 'Available' ? 'badge-green' :
                        v.status === 'In Transit' ? 'badge-blue' :
                        v.status === 'At Border' ? 'badge-yellow' :
                        v.status === 'Sold' ? 'badge-gray' : 'badge-gray'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleViewHistory(v)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* History Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</h2>
                <p className="text-sm text-gray-500 font-mono">{selectedVehicle.chassis_number}</p>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {historyLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : history ? (
                <div className="space-y-4">
                  {/* Vehicle Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Vehicle Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-gray-500">Engine:</span> {history.vehicle.engine_cc}cc</p>
                      <p><span className="text-gray-500">Mileage:</span> {history.vehicle.mileage?.toLocaleString()} km</p>
                      <p><span className="text-gray-500">Fuel:</span> {history.vehicle.fuel_type}</p>
                      <p><span className="text-gray-500">Trans:</span> {history.vehicle.transmission}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3">
                    {history.vehicle.foreign_bond_name && (
                      <div className="flex items-start gap-3 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Origin: {history.vehicle.foreign_bond_name}</p>
                          <p className="text-sm text-gray-600">{history.vehicle.origin_country}</p>
                        </div>
                      </div>
                    )}

                    {history.order && (
                      <div className="flex items-start gap-3 p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded-r-lg">
                        <Car className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Ordered: {history.order.order_number}</p>
                          <p className="text-sm text-gray-600">Status: {history.order.order_status}</p>
                        </div>
                      </div>
                    )}

                    {history.shipping && (
                      <div className="flex items-start gap-3 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                        <Ship className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Shipped: {history.shipping.vessel_name}</p>
                          <p className="text-sm text-gray-600">BL: {history.shipping.bl_number}</p>
                          <p className="text-sm text-gray-600">{history.shipping.departure_port} → {history.shipping.arrival_port}</p>
                        </div>
                      </div>
                    )}

                    {history.clearance && (
                      <div className="flex items-start gap-3 p-3 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
                        <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Border: {history.clearance.border_point}</p>
                          <p className="text-sm text-gray-600">Status: {history.clearance.clearance_status}</p>
                        </div>
                      </div>
                    )}

                    {history.sale && (
                      <div className="flex items-start gap-3 p-3 border-l-4 border-purple-500 bg-purple-50 rounded-r-lg">
                        <DollarSign className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Sold to: {history.sale.customer_name}</p>
                          <p className="text-sm text-gray-600">Invoice: {history.sale.invoice_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500">No history available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
