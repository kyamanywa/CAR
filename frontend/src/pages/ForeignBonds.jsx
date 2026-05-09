import { useState, useEffect } from 'react';
import { getForeignBonds, getForeignBondVehicles } from '../api';
import { Building2, MapPin, Car, Mail, Phone, X } from 'lucide-react';

export default function ForeignBonds() {
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedBond, setSelectedBond] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  useEffect(() => {
    fetchBonds();
  }, [filter]);

  const fetchBonds = async () => {
    try {
      const params = filter ? { country: filter } : {};
      const res = await getForeignBonds(params);
      setBonds(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInventory = async (bond) => {
    setSelectedBond(bond);
    setVehiclesLoading(true);
    try {
      const res = await getForeignBondVehicles(bond.id, { status: 'Available' });
      setVehicles(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setVehiclesLoading(false);
    }
  };

  const countries = ['Japan', 'UAE', 'UK'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Foreign Bonds</h1>
          <p className="text-gray-500">Car yards and suppliers from Japan, UAE, UK</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bonds.map((bond) => (
            <div key={bond.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{bond.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{bond.city}, {bond.country}</span>
                    </div>
                  </div>
                </div>
                <span className={`badge ${bond.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                  {bond.status}
                </span>
              </div>

              {bond.specialization && (
                <p className="text-sm text-gray-600 mb-3">{bond.specialization}</p>
              )}

              <div className="space-y-2 text-sm text-gray-500 mb-4">
                {bond.contact_person && (
                  <p><strong>Contact:</strong> {bond.contact_person}</p>
                )}
                {bond.contact_email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{bond.contact_email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    <strong>{bond.available_count || 0}</strong> available / {bond.total_vehicles || 0} total
                  </span>
                </div>
                <button
                  onClick={() => handleViewInventory(bond)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Inventory
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory Modal */}
      {selectedBond && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedBond.name}</h2>
                <p className="text-sm text-gray-500">Available Inventory</p>
              </div>
              <button onClick={() => setSelectedBond(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {vehiclesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : vehicles.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No available vehicles</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Vehicle</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Chassis</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Specs</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Price (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <p className="font-medium">{v.make} {v.model}</p>
                          <p className="text-sm text-gray-500">{v.year} • {v.color}</p>
                        </td>
                        <td className="p-3 text-sm font-mono">{v.chassis_number}</td>
                        <td className="p-3 text-sm text-gray-500">
                          {v.engine_cc}cc • {v.mileage?.toLocaleString()} km
                        </td>
                        <td className="p-3 text-right font-medium">
                          ${v.purchase_price_usd?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
