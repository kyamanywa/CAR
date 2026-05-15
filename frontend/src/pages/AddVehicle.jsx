import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X } from 'lucide-react';
import { addMyVehicle, getMakes, getModels, getColors, uploadVehicleImage } from '../api';

export default function AddVehicle() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    chassis_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    engine_cc: '',
    fuel_type: 'petrol',
    transmission: 'automatic',
    mileage: '',
    condition: 'Good',
    purchase_price: '',
    sale_price: '',
    quantity: 1,
    notes: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  
  // Reference data
  const [makes, setMakes] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  
  // Load reference data on mount
  useEffect(() => {
    loadReferenceData();
  }, []);
  
  // Filter models when make changes
  useEffect(() => {
    if (formData.make) {
      const makeObj = makes.find(m => m.name === formData.make);
      if (makeObj) {
        const modelsForMake = allModels.filter(m => m.make_id === makeObj.id);
        setFilteredModels(modelsForMake);
      } else {
        setFilteredModels([]);
      }
    } else {
      setFilteredModels([]);
    }
  }, [formData.make, makes, allModels]);
  
  const loadReferenceData = async () => {
    try {
      const [makesRes, modelsRes, colorsRes] = await Promise.all([
        getMakes(),
        getModels(),
        getColors()
      ]);
      setMakes(makesRes.data.data || []);
      setAllModels(modelsRes.data.data || []);
      setColors(colorsRes.data.data || []);
    } catch (error) {
      console.error('Error loading reference data:', error);
      setError('Failed to load reference data. Please refresh the page.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If make changes, reset model
    if (name === 'make') {
      setFormData(prev => ({ ...prev, make: value, model: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Upload immediately so we have the URL ready
    setImageUploading(true);
    try {
      const res = await uploadVehicleImage(file);
      setFormData(prev => ({ ...prev, image_url: res.data.data.image_url }));
    } catch (err) {
      setError('Image upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await addMyVehicle(formData);
      navigate('/supplier/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/supplier/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold">Add New Vehicle</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Vehicle Identification */}
        <div>
          <h2 className="text-xl font-bold mb-4">Vehicle Identification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Chassis Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="chassis_number"
                value={formData.chassis_number}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., JN1TANT32U0000123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Make <span className="text-red-500">*</span>
              </label>
              <select
                name="make"
                value={formData.make}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Make</option>
                {makes.map((make) => (
                  <option key={make.id} value={make.name}>{make.name}</option>
                ))}
              </select>
              {makes.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No makes available. Add makes in Reference Data first.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                disabled={!formData.make}
                className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
              >
                <option value="">Select Model</option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.name}>{model.name}</option>
                ))}
              </select>
              {!formData.make && (
                <p className="text-xs text-gray-500 mt-1">Select a make first</p>
              )}
              {formData.make && filteredModels.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No models available for this make. Add models in Reference Data first.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                min="1980"
                max={new Date().getFullYear() + 1}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Specifications */}
        <div>
          <h2 className="text-xl font-bold mb-4">Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <select
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Color</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.name}>{color.name}</option>
                ))}
              </select>
              {colors.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No colors available. Add colors in Reference Data first.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Engine CC</label>
              <input
                type="number"
                name="engine_cc"
                value={formData.engine_cc}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., 2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fuel Type</label>
              <select
                name="fuel_type"
                value={formData.fuel_type}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transmission</label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="cvt">CVT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mileage (km)</label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., 45000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <select
                name="condition"
                value={formData.condition || 'Good'}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h2 className="text-xl font-bold mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Purchase Price (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Your cost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Sale Price (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="sale_price"
                value={formData.sale_price}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Your selling price"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Quantity in Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="How many of this vehicle do you have?"
              />
              <p className="text-sm text-gray-500 mt-1">Number of identical vehicles in your inventory</p>
            </div>
          </div>
        </div>

        {/* Vehicle Photos */}
        <div>
          <h2 className="text-xl font-bold mb-4">Vehicle Photo</h2>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Vehicle preview"
                className="w-64 h-44 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
              {imageUploading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
                  <span className="text-sm text-gray-700">Uploading...</span>
                </div>
              )}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center w-64 h-44 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition">
              <Camera className="w-10 h-10 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload photo</span>
              <span className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Additional Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="4"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Any additional information about the vehicle..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Adding...' : 'Add Vehicle'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/supplier/dashboard')}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
