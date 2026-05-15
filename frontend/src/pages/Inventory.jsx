import { useState, useEffect, useMemo, useRef } from 'react';
import { getVehicles, getMakes, getVehicleHistory, updateVehicle, deleteVehicle, addDealershipVehicle, updateDealershipVehicle, deleteDealershipVehicle, uploadVehicleImage } from '../api';
import api from '../api';
import { Car, Search, X, MapPin, Ship, Shield, DollarSign, Download, SlidersHorizontal, Trash2, CheckSquare, Plus, Camera, Pencil } from 'lucide-react';
import { exportToExcel } from '../utils/exportData';
import { useAuth } from '../AuthContext';
import VehicleDetailModal from '../components/VehicleDetailModal';

const LOCAL_SOURCE_TYPES = [
  { value: 'local_purchase', label: 'Local Purchase' },
  { value: 'trade_in', label: 'Trade-In' },
  { value: 'auction', label: 'Auction' },
  { value: 'fleet', label: 'Fleet Disposal' },
];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'];
const TRANSMISSIONS = ['Automatic', 'Manual'];
const LOCAL_STATUSES = ['Available', 'Reserved', 'Sold'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
const BODY_TYPES = ['Sedan', 'SUV', 'Pickup / Double Cab', 'Hatchback', 'Station Wagon', 'Coupe', 'Van / Minivan', 'Bus / Minibus', 'Truck', 'Other'];
const EMPTY_LOCAL_FORM = {
  chassis_number: '', make: '', model: '', year: new Date().getFullYear(),
  color: '', engine_cc: '', fuel_type: 'Petrol', transmission: 'Automatic',
  body_type: '', mileage: '', acquisition_cost_ugx: '', sale_price_ugx: '',
  acquisition_source: '', source_type: 'local_purchase', condition: 'Good',
  quantity: 1, notes: '', status: 'Available', image_url: '',
};
const FALLBACK_COLORS = ['Black','White','Silver','Grey','Blue','Red','Green','Brown','Beige','Gold','Orange','Yellow','Maroon','Navy Blue','Pearl White','Champagne'];

export default function Inventory() {
  const { user } = useAuth();
  const isManager = user?.role === 'dealership_manager';
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [makes, setMakes] = useState([]);
  // Local vehicle add/edit form state
  const [allMakes, setAllMakes] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [editLocalVehicle, setEditLocalVehicle] = useState(null);
  const [localForm, setLocalForm] = useState(EMPTY_LOCAL_FORM);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileRef = useRef();
  const [filters, setFilters] = useState({ status: '', make: '', search: '' });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    condition: '',
    yearFrom: '',
    yearTo: '',
    mileageMax: '',
    priceMin: '',
    priceMax: '',
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    try {
      fetchMakes();
      // Load reference data for local vehicle form
      api.get('/reference-data/makes').then(r => setAllMakes(r.data?.data || [])).catch(() => {});
      api.get('/reference-data/models').then(r => setAllModels(r.data?.data || [])).catch(() => {});
      api.get('/reference-data/colors').then(r => {
        const fetched = r.data?.data || [];
        setColors(fetched.length > 0 ? fetched : FALLBACK_COLORS.map(n => ({ id: n, name: n })));
      }).catch(() => setColors(FALLBACK_COLORS.map(n => ({ id: n, name: n }))));
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, []);

  useEffect(() => {
    try {
      fetchVehicles();
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, [filters.status, filters.make]);

  const fetchMakes = async () => {
    try {
      const res = await getMakes();
      const rawMakes = res.data?.data || [];
      const normalizedMakes = rawMakes
        .map((m) => (typeof m === 'string' ? m : m?.name))
        .filter(Boolean);
      setMakes(normalizedMakes);
    } catch (error) {
      console.error('fetchMakes error:', error);
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
      setVehicles(res.data?.data || []);
    } catch (error) {
      console.error('fetchVehicles error:', error);
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
      setHistory(res.data?.data || {});
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory({});
    } finally {
      setHistoryLoading(false);
    }
  };

  const statuses = ['Available', 'Ordered', 'In Transit', 'At Border', 'In Stock', 'Sold'];

  // ── Local vehicle add/edit handlers ──
  const openLocalAdd = () => {
    setLocalForm(EMPTY_LOCAL_FORM);
    setImagePreview('');
    setLocalError('');
    setEditLocalVehicle(null);
    setShowLocalForm(true);
  };
  const openLocalEdit = (v) => {
    setLocalForm({
      chassis_number: v.chassis_number || '', make: v.make || '', model: v.model || '',
      year: v.year || new Date().getFullYear(), color: v.color || '', engine_cc: v.engine_cc || '',
      fuel_type: v.fuel_type || 'Petrol', transmission: v.transmission || 'Automatic',
      body_type: v.body_type || '', mileage: v.mileage || '',
      acquisition_cost_ugx: v.acquisition_cost_ugx || '', sale_price_ugx: v.sale_price_usd ? Math.round(v.sale_price_usd * 3800) : '',
      acquisition_source: v.acquisition_source || '', source_type: v.source_type || 'local_purchase',
      condition: v.condition || 'Good', quantity: v.quantity || 1,
      notes: v.notes || '', status: v.status || 'Available', image_url: v.image_url || '',
    });
    setImagePreview(v.image_url || '');
    setLocalError('');
    setEditLocalVehicle(v);
    setShowLocalForm(true);
  };
  const handleLocalImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const res = await uploadVehicleImage(file);
      const url = res.data?.data?.image_url;
      setLocalForm(f => ({ ...f, image_url: url }));
      setImagePreview(url);
    } catch (err) {
      setLocalError('Image upload failed: ' + (err.response?.data?.error || err.message));
    } finally { setImageUploading(false); }
  };
  const handleLocalChange = (field, value) => setLocalForm(f => ({ ...f, [field]: value }));
  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!localForm.chassis_number || !localForm.make || !localForm.model) {
      setLocalError('Chassis number, make, and model are required.');
      return;
    }
    setLocalSaving(true);
    try {
      if (editLocalVehicle) {
        await updateDealershipVehicle(editLocalVehicle.id, localForm);
      } else {
        await addDealershipVehicle(localForm);
      }
      setShowLocalForm(false);
      fetchVehicles();
    } catch (err) {
      setLocalError(err.response?.data?.error || 'Failed to save vehicle');
    } finally { setLocalSaving(false); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredVehicles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredVehicles.map(v => v.id)));
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map(id => updateVehicle(id, { status: bulkStatus })));
      await fetchVehicles();
      setSelected(new Set());
      setBulkStatus('');
    } catch (err) {
      console.error('Bulk status update failed', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} vehicle(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map(id => deleteVehicle(id)));
      await fetchVehicles();
      setSelected(new Set());
    } catch (err) {
      console.error('Bulk delete failed', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExport = () => {
    const toExport = filteredVehicles.filter(v => selected.has(v.id));
    exportToExcel(toExport.map(v => ({
      Chassis: v.chassis_number,
      Make: v.make,
      Model: v.model,
      Year: v.year,
      Color: v.color,
      Condition: v.condition,
      Status: v.status,
      'Purchase Price USD': v.purchase_price_usd,
      'Selling Price UGX': v.selling_price_ugx,
      'Bond/Dealer': v.bond_name || v.dealership_name || '',
    })), 'selected-vehicles', 'Selected Vehicles');
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (advFilters.condition && v.condition !== advFilters.condition) return false;
      if (advFilters.yearFrom && v.year < parseInt(advFilters.yearFrom)) return false;
      if (advFilters.yearTo && v.year > parseInt(advFilters.yearTo)) return false;
      if (advFilters.mileageMax && v.mileage > parseInt(advFilters.mileageMax)) return false;
      if (advFilters.priceMin && (v.selling_price_ugx || 0) < parseFloat(advFilters.priceMin)) return false;
      if (advFilters.priceMax && (v.selling_price_ugx || 0) > parseFloat(advFilters.priceMax)) return false;
      return true;
    });
  }, [vehicles, advFilters]);

  const advancedActive = Object.values(advFilters).some(Boolean);

  const inventoryStats = useMemo(() => {
    const fmt = (n) => 'UGX ' + Math.round(n).toLocaleString();
    const available = vehicles.filter(v => v.status === 'Available' || v.status === 'In Stock');
    const sold      = vehicles.filter(v => v.status === 'Sold');
    const inTransit = vehicles.filter(v => ['Ordered','In Transit','At Border'].includes(v.status));
    const totalValue     = vehicles.reduce((s, v) => s + (v.selling_price_ugx || 0), 0);
    const availableValue = available.reduce((s, v) => s + (v.selling_price_ugx || 0), 0);
    const soldValue      = sold.reduce((s, v) => s + (v.selling_price_ugx || 0), 0);
    const transitValue   = inTransit.reduce((s, v) => s + (v.selling_price_ugx || 0), 0);
    
    // Calculate total UNITS (sum of quantities)
    const totalUnits = vehicles.reduce((sum, v) => sum + (parseInt(v.quantity) || 1), 0);
    const availableUnits = available.reduce((sum, v) => sum + (parseInt(v.quantity) || 1), 0);
    const soldUnits = sold.reduce((sum, v) => sum + (parseInt(v.quantity) || 1), 0);
    const transitUnits = inTransit.reduce((sum, v) => sum + (parseInt(v.quantity) || 1), 0);
    const vehicleTypes = vehicles.length;
    
    return { fmt, available, sold, inTransit, totalValue, availableValue, soldValue, transitValue,
             totalUnits, availableUnits, soldUnits, transitUnits, vehicleTypes };
  }, [vehicles]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-gray-500">All vehicles — imported &amp; locally acquired</p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={openLocalAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus size={15} /> Add Local Vehicle
            </button>
          )}
          <button
            onClick={() => exportToExcel(vehicles.map(v => ({
              Chassis: v.chassis_number,
              Make: v.make,
              Model: v.model,
              Year: v.year,
              Color: v.color,
              Status: v.status,
              'Purchase Price USD': v.purchase_price_usd,
              'Selling Price UGX': v.selling_price_ugx,
              'Bond/Dealer': v.bond_name || v.dealership_name || '',
            })), 'inventory-export', 'Inventory')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Inventory Value Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Total Portfolio</p>
          <p className="text-xl font-bold text-blue-800">{inventoryStats.fmt(inventoryStats.totalValue)}</p>
          <p className="text-sm text-blue-600 mt-1">{inventoryStats.totalUnits} units in {inventoryStats.vehicleTypes} vehicle types</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Available Stock</p>
          <p className="text-xl font-bold text-green-800">{inventoryStats.fmt(inventoryStats.availableValue)}</p>
          <p className="text-sm text-green-600 mt-1">{inventoryStats.availableUnits} units ready to sell</p>
        </div>
        <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Sold Value</p>
          <p className="text-xl font-bold text-gray-800">{inventoryStats.fmt(inventoryStats.soldValue)}</p>
          <p className="text-sm text-gray-500 mt-1">{inventoryStats.soldUnits} units sold</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200">
          <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mb-1">In Transit / Pipeline</p>
          <p className="text-xl font-bold text-yellow-800">{inventoryStats.fmt(inventoryStats.transitValue)}</p>
          <p className="text-sm text-yellow-600 mt-1">{inventoryStats.transitUnits} units on the way</p>
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
            {makes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
          <button
            type="button"
            onClick={() => setAdvancedOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${advancedActive ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal size={14} />
            Filters{advancedActive ? ` (${Object.values(advFilters).filter(Boolean).length})` : ''}
          </button>
        </form>

        {/* Advanced filters panel */}
        {advancedOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Condition</label>
              <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={advFilters.condition} onChange={e => setAdvFilters(f => ({...f, condition: e.target.value}))}>
                <option value="">Any</option>
                <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Year from</label>
              <input type="number" placeholder="2000" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={advFilters.yearFrom} onChange={e => setAdvFilters(f => ({...f, yearFrom: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Year to</label>
              <input type="number" placeholder={new Date().getFullYear()} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={advFilters.yearTo} onChange={e => setAdvFilters(f => ({...f, yearTo: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Max mileage (km)</label>
              <input type="number" placeholder="e.g. 100000" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={advFilters.mileageMax} onChange={e => setAdvFilters(f => ({...f, mileageMax: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Min price (UGX)</label>
              <input type="number" placeholder="e.g. 5000000" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={advFilters.priceMin} onChange={e => setAdvFilters(f => ({...f, priceMin: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Max price (UGX)</label>
              <input type="number" placeholder="e.g. 50000000" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={advFilters.priceMax} onChange={e => setAdvFilters(f => ({...f, priceMax: e.target.value}))} />
            </div>
            {advancedActive && (
              <div className="col-span-full flex justify-end">
                <button onClick={() => setAdvFilters({ condition:'', yearFrom:'', yearTo:'', mileageMax:'', priceMin:'', priceMax:'' })}
                  className="text-xs text-red-600 hover:underline">Clear advanced filters</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-5 bg-gray-600" />
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="bg-gray-800 text-white text-sm rounded-lg px-2 py-1 border border-gray-600"
            >
              <option value="">Change status...</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || bulkLoading}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              Apply
            </button>
          </div>
          <div className="w-px h-5 bg-gray-600" />
          <button onClick={handleBulkExport} className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300">
            <Download size={14} /> Export
          </button>
          {user?.role === 'admin' && (
            <>
              <div className="w-px h-5 bg-gray-600" />
              <button onClick={handleBulkDelete} disabled={bulkLoading} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-40">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          <div className="w-px h-5 bg-gray-600" />
          <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

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
                <th className="w-10 p-4">
                  <input
                    type="checkbox"
                    checked={filteredVehicles.length > 0 && selected.size === filteredVehicles.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600"
                  />
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Vehicle</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Chassis</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Location</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Qty</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    {vehicles.length === 0 ? 'No vehicles found' : `No vehicles match the current filters (${vehicles.length} total)`}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className={`hover:bg-gray-50 ${selected.has(v.id) ? 'bg-blue-50' : ''}`}>
                    <td className="w-10 p-4">
                      <input
                        type="checkbox"
                        checked={selected.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </td>
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
                    <td className="p-4 text-center">
                      <span className={`inline-block font-semibold text-sm px-2 py-0.5 rounded-full ${
                        (v.quantity || 1) > 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                      }`}>{v.quantity || 1}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`badge ${
                          v.status === 'In Stock' || v.status === 'Available' ? 'badge-green' :
                          v.status === 'In Transit' ? 'badge-blue' :
                          v.status === 'At Border' ? 'badge-yellow' :
                          v.status === 'Sold' ? 'badge-gray' : 'badge-gray'
                        }`}>
                          {v.status}
                        </span>
                        {v.condition && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                            v.condition === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                            v.condition === 'Good' ? 'bg-blue-100 text-blue-700' :
                            v.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{v.condition}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleViewHistory(v)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Enhanced Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleDetailModal 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
        />
      )}

      {/* ── Add / Edit Local Vehicle Modal ── */}
      {showLocalForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editLocalVehicle ? 'Edit Local Vehicle' : 'Add Local Vehicle'}
              </h2>
              <button onClick={() => setShowLocalForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {localError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{localError}</div>}
            <form onSubmit={handleLocalSubmit} className="space-y-4">
              {/* Photo upload */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Photo</label>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="preview" className="h-32 rounded-lg object-cover" />
                    <button type="button" onClick={() => { setLocalForm(f => ({ ...f, image_url: '' })); setImagePreview(''); }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={imageUploading}
                    className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500">
                    <Camera className="h-5 w-5" />
                    {imageUploading ? 'Uploading…' : 'Click to upload photo'}
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleLocalImageChange} />
              </div>
              {/* Source */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Source Type *</label>
                  <select value={localForm.source_type} onChange={e => handleLocalChange('source_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {LOCAL_SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Source / Seller</label>
                  <input value={localForm.acquisition_source} onChange={e => handleLocalChange('acquisition_source', e.target.value)}
                    placeholder="e.g. John Motors, Auction Uganda"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              {/* Identifiers */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Chassis No. *</label>
                  <input value={localForm.chassis_number} onChange={e => handleLocalChange('chassis_number', e.target.value)}
                    placeholder="VIN / Chassis"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Make *</label>
                  <select value={localForm.make} onChange={e => { handleLocalChange('make', e.target.value); handleLocalChange('model', ''); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Select Make</option>
                    {allMakes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Model *</label>
                  <select value={localForm.model} onChange={e => handleLocalChange('model', e.target.value)}
                    disabled={!localForm.make}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                    <option value="">Select Model</option>
                    {allModels.filter(m => {
                      const mk = allMakes.find(mk => mk.name === localForm.make);
                      return mk ? m.make_id === mk.id : true;
                    }).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                  <input type="number" min="1980" max={new Date().getFullYear() + 1}
                    value={localForm.year} onChange={e => handleLocalChange('year', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                  <select value={localForm.color} onChange={e => handleLocalChange('color', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Select Color</option>
                    {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mileage (km)</label>
                  <input type="number" value={localForm.mileage} onChange={e => handleLocalChange('mileage', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fuel Type</label>
                  <select value={localForm.fuel_type} onChange={e => handleLocalChange('fuel_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Transmission</label>
                  <select value={localForm.transmission} onChange={e => handleLocalChange('transmission', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {TRANSMISSIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Engine (cc)</label>
                  <input type="number" value={localForm.engine_cc} onChange={e => handleLocalChange('engine_cc', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Acquisition Cost (UGX)</label>
                  <input type="number" value={localForm.acquisition_cost_ugx} onChange={e => handleLocalChange('acquisition_cost_ugx', e.target.value)}
                    placeholder="How much you paid"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Asking Price (UGX)</label>
                  <input type="number" value={localForm.sale_price_ugx} onChange={e => handleLocalChange('sale_price_ugx', e.target.value)}
                    placeholder="What you will sell for"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              {/* Status / condition / body / qty */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select value={localForm.status} onChange={e => handleLocalChange('status', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {LOCAL_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Condition</label>
                  <select value={localForm.condition} onChange={e => handleLocalChange('condition', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Body Type</label>
                  <select value={localForm.body_type} onChange={e => handleLocalChange('body_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {BODY_TYPES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Qty in Stock</label>
                  <input type="number" min="1" value={localForm.quantity} onChange={e => handleLocalChange('quantity', parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={localForm.notes} onChange={e => handleLocalChange('notes', e.target.value)}
                  rows={2} placeholder="Condition notes, history, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLocalForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={localSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {localSaving ? 'Saving…' : editLocalVehicle ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
