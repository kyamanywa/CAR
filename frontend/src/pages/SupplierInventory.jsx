import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X, Package, DollarSign, Calendar, MapPin, Edit2, Save, ChevronDown, ChevronRight, Filter, Trash2 } from 'lucide-react';
import { getMyVehicles, updateMyVehicle, deleteMyVehicle, getMakes, getModels, getColors } from '../api';

export default function SupplierInventory() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'list'
  const [expandedMakes, setExpandedMakes] = useState({});
  const [expandedModels, setExpandedModels] = useState({});
  const [sortBy, setSortBy] = useState('make');
  const [filterColor, setFilterColor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Reference data
  const [makes, setMakes] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);

  useEffect(() => {
    loadVehicles();
    loadReferenceData();
  }, []);
  
  // Filter models when make changes in edit form
  useEffect(() => {
    if (editForm?.make) {
      const makeObj = makes.find(m => m.name === editForm.make);
      if (makeObj) {
        const modelsForMake = allModels.filter(m => m.make_id === makeObj.id);
        setFilteredModels(modelsForMake);
      } else {
        setFilteredModels([]);
      }
    } else {
      setFilteredModels([]);
    }
  }, [editForm?.make, makes, allModels]);
  
  const loadReferenceData = async () => {
    try {
      const [makesRes, modelsRes, colorsRes] = await Promise.all([
        getMakes(),
        getModels(),
        getColors()
      ]);
      setMakes(makesRes.data.data);
      setAllModels(modelsRes.data.data);
      setColors(colorsRes.data.data);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await getMyVehicles();
      setVehicles(res.data.data || []);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.chassis_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase());
    const matchesColor = !filterColor || v.color?.toLowerCase() === filterColor.toLowerCase();
    const matchesStatus = !filterStatus || v.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesColor && matchesStatus;
  });

  // Group vehicles by make (case-insensitive)
  const groupedByMake = filteredVehicles.reduce((acc, vehicle) => {
    const make = vehicle.make ? vehicle.make.charAt(0).toUpperCase() + vehicle.make.slice(1).toLowerCase() : 'Unknown';
    if (!acc[make]) acc[make] = [];
    acc[make].push(vehicle);
    return acc;
  }, {});

  // Group by make and model (case-insensitive)
  const groupedByMakeAndModel = filteredVehicles.reduce((acc, vehicle) => {
    const make = vehicle.make ? vehicle.make.charAt(0).toUpperCase() + vehicle.make.slice(1).toLowerCase() : 'Unknown';
    const model = vehicle.model ? vehicle.model.toUpperCase() : 'Unknown';
    if (!acc[make]) acc[make] = {};
    if (!acc[make][model]) acc[make][model] = [];
    acc[make][model].push(vehicle);
    return acc;
  }, {});
  
  // Calculate totals
  const totalRecords = filteredVehicles.length;
  const totalUnits = filteredVehicles.reduce((sum, v) => sum + (parseInt(v.quantity) || 1), 0);

  const uniqueColors = [...new Set(vehicles.map(v => v.color).filter(Boolean))];
  const uniqueStatuses = [...new Set(vehicles.map(v => v.status).filter(Boolean))];

  const toggleMake = (make) => {
    setExpandedMakes(prev => ({ ...prev, [make]: !prev[make] }));
  };

  const toggleModel = (make, model) => {
    const key = `${make}-${model}`;
    setExpandedModels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEditClick = (vehicle) => {
    setEditMode(true);
    setEditForm({
      ...vehicle,
      purchase_price: vehicle.purchase_price_usd || vehicle.purchase_price || 0,
      sale_price: vehicle.sale_price_usd || vehicle.sale_price || 0
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    // If make changes, reset model
    if (name === 'make') {
      setEditForm(prev => ({ ...prev, make: value, model: '' }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateMyVehicle(selectedVehicle.id, {
        ...editForm,
        purchase_price: parseFloat(editForm.purchase_price),
        sale_price: parseFloat(editForm.sale_price),
        quantity: parseInt(editForm.quantity) || 1
      });
      alert('Vehicle updated successfully!');
      setEditMode(false);
      setSelectedVehicle(null);
      loadVehicles();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update vehicle');
    }
  };

  const handleDelete = async (vehicleId, vehicleName) => {
    if (!confirm(`Are you sure you want to delete ${vehicleName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteMyVehicle(vehicleId);
      alert('Vehicle deleted successfully!');
      loadVehicles();
      setSelectedVehicle(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Inventory</h1>
          <p className="text-gray-600 mt-1">
            {vehicles.length} records • {vehicles.reduce((sum, v) => sum + (parseInt(v.quantity) || 1), 0)} units total
            {filteredVehicles.length !== vehicles.length && ` • ${filteredVehicles.length} records showing`}
          </p>
        </div>
        <button
          onClick={() => navigate('/supplier/add-vehicle')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Vehicle
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by chassis, make, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          <select 
            value={filterColor} 
            onChange={(e) => setFilterColor(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Colors</option>
            {uniqueColors.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <div className="flex gap-2 border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-1 rounded ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
            >
              Grouped
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Grouped View */}
      {viewMode === 'grouped' ? (
        <div className="space-y-4">
          {Object.keys(groupedByMakeAndModel).sort().map(make => {
            const makeVehicles = Object.values(groupedByMakeAndModel[make]).flat();
            const totalQuantity = makeVehicles.reduce((sum, v) => sum + (v.quantity || 1), 0);
            const totalValue = makeVehicles.reduce((sum, v) => sum + parseFloat(v.sale_price_usd || v.sale_price || 0), 0);
            
            return (
              <div key={make} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Make Header */}
                <div 
                  onClick={() => toggleMake(make)}
                  className="p-4 bg-blue-50 border-b cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {expandedMakes[make] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <div>
                      <h3 className="text-xl font-bold">{make}</h3>
                      <p className="text-sm text-gray-600">{totalQuantity} units • ${totalValue.toLocaleString()} total value</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{Object.keys(groupedByMakeAndModel[make]).length}</p>
                    <p className="text-xs text-gray-500">Models</p>
                  </div>
                </div>

                {/* Models under this Make */}
                {expandedMakes[make] && (
                  <div className="divide-y">
                    {Object.keys(groupedByMakeAndModel[make]).sort().map(model => {
                      const modelVehicles = groupedByMakeAndModel[make][model];
                      const modelQuantity = modelVehicles.reduce((sum, v) => sum + (v.quantity || 1), 0);
                      const modelKey = `${make}-${model}`;
                      
                      return (
                        <div key={modelKey}>
                          {/* Model Header */}
                          <div 
                            onClick={() => toggleModel(make, model)}
                            className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {expandedModels[modelKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <div>
                                <h4 className="font-semibold">{model}</h4>
                                <p className="text-sm text-gray-600">{modelQuantity} units available</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {modelVehicles.length} variants
                            </span>
                          </div>

                          {/* Individual Vehicles */}
                          {expandedModels[modelKey] && (
                            <div className="bg-white">
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Chassis</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {modelVehicles.map(vehicle => (
                                    <tr 
                                      key={vehicle.id}
                                      onClick={() => setSelectedVehicle(vehicle)}
                                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                      <td className="px-4 py-3 text-sm font-mono">{vehicle.chassis_number}</td>
                                      <td className="px-4 py-3 text-sm">{vehicle.year}</td>
                                      <td className="px-4 py-3 text-sm">{vehicle.color || 'N/A'}</td>
                                      <td className="px-4 py-3 text-sm font-semibold">{vehicle.quantity || 1}</td>
                                      <td className="px-4 py-3 text-sm font-semibold">${parseFloat(vehicle.sale_price_usd || vehicle.sale_price || 0).toLocaleString()}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          vehicle.status === 'Available' ? 'bg-green-100 text-green-800' :
                                          vehicle.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {vehicle.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">My Vehicles</h2>
            <p className="text-sm text-gray-500 mt-1">Showing {filteredVehicles.length} of {vehicles.length} total vehicles</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chassis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr 
                    key={vehicle.id} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-blue-600">{vehicle.chassis_number}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{vehicle.make} {vehicle.model}</td>
                    <td className="px-6 py-4 text-sm">{vehicle.year}</td>
                    <td className="px-6 py-4 text-sm">{vehicle.color || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{vehicle.quantity || 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${parseFloat(vehicle.sale_price_usd || vehicle.sale_price || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === 'Available' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No vehicles found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{editMode ? 'Edit Vehicle' : `${selectedVehicle.make} ${selectedVehicle.model}`}</h2>
                <p className="text-gray-600 mt-1">Year: {selectedVehicle.year}</p>
              </div>
              <button
                onClick={() => { setSelectedVehicle(null); setEditMode(false); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!editMode ? (
                <>
              {/* Status Badge */}
              <div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 ${
                  selectedVehicle.status === 'Available' ? 'bg-green-100 text-green-800' :
                  selectedVehicle.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Package className="w-4 h-4" />
                  {selectedVehicle.status}
                </span>
                {selectedVehicle.quantity > 1 && (
                  <span className="ml-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {selectedVehicle.quantity} units in stock
                  </span>
                )}
              </div>

              {/* Vehicle Identification */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Chassis Number</p>
                  <p className="text-lg font-mono font-bold mt-1">{selectedVehicle.chassis_number}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Engine Number</p>
                  <p className="text-lg font-mono font-bold mt-1">{selectedVehicle.engine_number || 'N/A'}</p>
                </div>
              </div>

              {/* Pricing Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-orange-600">Purchase Cost</p>
                    <p className="text-xl font-bold mt-1">${parseFloat(selectedVehicle.purchase_price_usd || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Sale Price</p>
                    <p className="text-xl font-bold mt-1">${parseFloat(selectedVehicle.sale_price_usd || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Expected Profit</p>
                    <p className="text-xl font-bold mt-1 text-green-600">
                      ${(parseFloat(selectedVehicle.sale_price_usd || 0) - parseFloat(selectedVehicle.purchase_price_usd || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Make</p>
                    <p className="font-semibold">{selectedVehicle.make}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Model</p>
                    <p className="font-semibold">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Year</p>
                    <p className="font-semibold">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Color</p>
                    <p className="font-semibold">{selectedVehicle.color || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Steering</p>
                    <p className="font-semibold">{selectedVehicle.steering || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fuel Type</p>
                    <p className="font-semibold">{selectedVehicle.fuel_type || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Location & Dates */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location & Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold">{selectedVehicle.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Added Date
                    </p>
                    <p className="font-semibold">
                      {selectedVehicle.created_at ? new Date(selectedVehicle.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {selectedVehicle.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedVehicle.notes}</p>
                </div>
              )}
              </>
              ) : (
                /* Edit Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Chassis Number</label>
                      <input type="text" name="chassis_number" value={editForm.chassis_number} onChange={handleEditChange} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Engine Number</label>
                      <input type="text" name="engine_number" value={editForm.engine_number || ''} onChange={handleEditChange} className="w-full border rounded px-3 py-2" placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Make</label>
                      <select
                        name="make"
                        value={editForm.make}
                        onChange={handleEditChange}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select Make</option>
                        {makes.map((make) => (
                          <option key={make.id} value={make.name}>{make.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Model</label>
                      <select
                        name="model"
                        value={editForm.model}
                        onChange={handleEditChange}
                        disabled={!editForm.make}
                        className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
                      >
                        <option value="">Select Model</option>
                        {filteredModels.map((model) => (
                          <option key={model.id} value={model.name}>{model.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Year</label>
                      <input type="number" name="year" value={editForm.year} onChange={handleEditChange} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Color</label>
                      <select
                        name="color"
                        value={editForm.color || ''}
                        onChange={handleEditChange}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select Color</option>
                        {colors.map((color) => (
                          <option key={color.id} value={color.name}>{color.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Purchase Price ($)</label>
                      <input type="number" name="purchase_price" value={editForm.purchase_price} onChange={handleEditChange} className="w-full border rounded px-3 py-2" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sale Price ($)</label>
                      <input type="number" name="sale_price" value={editForm.sale_price} onChange={handleEditChange} className="w-full border rounded px-3 py-2" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Quantity in Stock</label>
                      <input type="number" name="quantity" value={editForm.quantity || 1} onChange={handleEditChange} className="w-full border rounded px-3 py-2" min="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select name="status" value={editForm.status} onChange={handleEditChange} className="w-full border rounded px-3 py-2">
                        <option value="Available">Available</option>
                        <option value="ordered">Ordered</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between gap-3">
              <button
                onClick={() => handleDelete(selectedVehicle.id, `${selectedVehicle.make} ${selectedVehicle.model}`)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedVehicle(null); setEditMode(false); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  {editMode ? 'Cancel' : 'Close'}
                </button>
                {editMode ? (
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => handleEditClick(selectedVehicle)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Vehicle
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
