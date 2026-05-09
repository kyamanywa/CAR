import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import {
  getMakes, createMake, updateMake, deleteMake,
  getModels, createModel, updateModel, deleteModel,
  getColors, createColor, updateColor, deleteColor
} from '../api';

export default function ReferenceData() {
  const [activeTab, setActiveTab] = useState('makes');
  
  // Makes State
  const [makes, setMakes] = useState([]);
  const [newMake, setNewMake] = useState('');
  const [editingMake, setEditingMake] = useState(null);
  
  // Models State
  const [models, setModels] = useState([]);
  const [newModel, setNewModel] = useState({ name: '', make_id: '' });
  const [editingModel, setEditingModel] = useState(null);
  
  // Colors State
  const [colors, setColors] = useState([]);
  const [newColor, setNewColor] = useState('');
  const [editingColor, setEditingColor] = useState(null);
  
  const [loading, setLoading] = useState(false);
  
  // Load data when tab changes
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'makes') {
        const response = await getMakes();
        setMakes(response.data.data);
      } else if (activeTab === 'models') {
        const [makesRes, modelsRes] = await Promise.all([getMakes(), getModels()]);
        setMakes(makesRes.data.data);
        setModels(modelsRes.data.data);
      } else if (activeTab === 'colors') {
        const response = await getColors();
        setColors(response.data.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ MAKES HANDLERS ============
  const handleAddMake = async () => {
    if (!newMake.trim()) return;
    
    try {
      await createMake({ name: newMake });
      setNewMake('');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create make');
    }
  };
  
  const handleUpdateMake = async (id, name) => {
    try {
      await updateMake(id, { name });
      setEditingMake(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update make');
    }
  };
  
  const handleDeleteMake = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    
    try {
      await deleteMake(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete make');
    }
  };
  
  // ============ MODELS HANDLERS ============
  const handleAddModel = async () => {
    if (!newModel.name.trim() || !newModel.make_id) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await createModel(newModel);
      setNewModel({ name: '', make_id: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create model');
    }
  };
  
  const handleUpdateModel = async (id, name, make_id) => {
    try {
      await updateModel(id, { name, make_id });
      setEditingModel(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update model');
    }
  };
  
  const handleDeleteModel = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    
    try {
      await deleteModel(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete model');
    }
  };
  
  // ============ COLORS HANDLERS ============
  const handleAddColor = async () => {
    if (!newColor.trim()) return;
    
    try {
      await createColor({ name: newColor });
      setNewColor('');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create color');
    }
  };
  
  const handleUpdateColor = async (id, name) => {
    try {
      await updateColor(id, { name });
      setEditingColor(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update color');
    }
  };
  
  const handleDeleteColor = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    
    try {
      await deleteColor(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete color');
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reference Data Management</h1>
        <p className="mt-2 text-gray-600">Manage vehicle makes, models, and colors for your inventory</p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('makes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'makes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vehicle Makes
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'models'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vehicle Models
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'colors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Colors
          </button>
        </nav>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {/* MAKES TAB */}
            {activeTab === 'makes' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    placeholder="Enter make name (e.g., Toyota)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMake()}
                  />
                  <button
                    onClick={handleAddMake}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Make
                  </button>
                </div>
                
                <div className="border rounded-lg divide-y">
                  {makes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No makes added yet. Add your first vehicle make above.
                    </div>
                  ) : (
                    makes.map((make) => (
                      <div key={make.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        {editingMake?.id === make.id ? (
                          <>
                            <input
                              type="text"
                              value={editingMake.name}
                              onChange={(e) => setEditingMake({ ...editingMake, name: e.target.value })}
                              className="flex-1 px-3 py-1 border border-gray-300 rounded"
                            />
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleUpdateMake(editingMake.id, editingMake.name)}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingMake(null)}
                                className="p-1 text-gray-600 hover:text-gray-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{make.name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingMake(make)}
                                className="p-1 text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMake(make.id, make.name)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* MODELS TAB */}
            {activeTab === 'models' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select
                    value={newModel.make_id}
                    onChange={(e) => setNewModel({ ...newModel, make_id: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Make</option>
                    {makes.map((make) => (
                      <option key={make.id} value={make.id}>{make.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="Enter model name (e.g., Camry)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddModel()}
                  />
                  <button
                    onClick={handleAddModel}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Model
                  </button>
                </div>
                
                <div className="border rounded-lg divide-y">
                  {models.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No models added yet. Add your first vehicle model above.
                    </div>
                  ) : (
                    models.map((model) => (
                      <div key={model.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        {editingModel?.id === model.id ? (
                          <>
                            <div className="flex-1 flex gap-2">
                              <select
                                value={editingModel.make_id}
                                onChange={(e) => setEditingModel({ ...editingModel, make_id: e.target.value })}
                                className="px-3 py-1 border border-gray-300 rounded"
                              >
                                {makes.map((make) => (
                                  <option key={make.id} value={make.id}>{make.name}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={editingModel.name}
                                onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                                className="flex-1 px-3 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleUpdateModel(editingModel.id, editingModel.name, editingModel.make_id)}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingModel(null)}
                                className="p-1 text-gray-600 hover:text-gray-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="font-medium">{model.name}</span>
                              <span className="text-gray-500 ml-2">({model.make_name})</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingModel(model)}
                                className="p-1 text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteModel(model.id, model.name)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* COLORS TAB */}
            {activeTab === 'colors' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="Enter color name (e.g., White Pearl)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddColor()}
                  />
                  <button
                    onClick={handleAddColor}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Color
                  </button>
                </div>
                
                <div className="border rounded-lg divide-y">
                  {colors.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No colors added yet. Add your first color above.
                    </div>
                  ) : (
                    colors.map((color) => (
                      <div key={color.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        {editingColor?.id === color.id ? (
                          <>
                            <input
                              type="text"
                              value={editingColor.name}
                              onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                              className="flex-1 px-3 py-1 border border-gray-300 rounded"
                            />
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleUpdateColor(editingColor.id, editingColor.name)}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingColor(null)}
                                className="p-1 text-gray-600 hover:text-gray-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{color.name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingColor(color)}
                                className="p-1 text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteColor(color.id, color.name)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
