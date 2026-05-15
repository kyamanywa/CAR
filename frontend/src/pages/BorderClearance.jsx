import { useState, useEffect } from 'react';
import { getBorderClearances, getBorderSummary, getBorderClearance } from '../api';
import { Shield, MapPin, FileCheck, X, Check, Clock, AlertCircle, Truck } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';

const BORDER_POINTS = ['Malaba', 'Busia', 'Mutukula', 'Katuna', 'Elegu'];

const CLEARANCE_STEPS = [
  { key: 'arrived_mombasa', label: 'Mombasa', icon: MapPin },
  { key: 'transit_to_border', label: 'Transit', icon: Truck },
  { key: 'at_border', label: 'Border', icon: Shield },
  { key: 'ura_declaration', label: 'URA', icon: FileCheck },
  { key: 'payment', label: 'Payment', icon: Check },
  { key: 'inspection', label: 'Inspection', icon: AlertCircle },
  { key: 'cleared', label: 'Cleared', icon: Check },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

export default function BorderClearance() {
  const [clearances, setClearances] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBorder, setFilterBorder] = useState('');
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const formatLocalMoney = (value) => formatCurrency(value, 'local_sales');

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterBorder]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterBorder) params.border_point = filterBorder;
      
      const [clearancesRes, summaryRes] = await Promise.all([
        getBorderClearances(params),
        getBorderSummary()
      ]);
      setClearances(clearancesRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (clearance) => {
    setSelectedClearance(clearance);
    setDetailLoading(true);
    try {
      const res = await getBorderClearance(clearance.id);
      setDetail(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStepStatus = (status) => {
    const statusMap = {
      'Pending': 2,
      'In Progress': 4,
      'Inspection': 5,
      'Cleared': 7,
      'Delivered': 8
    };
    return statusMap[status] || 0;
  };

  const statuses = ['Pending', 'In Progress', 'Inspection', 'Cleared', 'Delivered'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Border Clearance</h1>
          <p className="text-gray-500">URA customs clearance tracking</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterBorder}
            onChange={(e) => setFilterBorder(e.target.value)}
            className="input w-36"
          >
            <option value="">All Borders</option>
            {BORDER_POINTS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-36"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Border Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summary.map((border) => (
          <div 
            key={border.border_point} 
            className={`card cursor-pointer transition-all ${filterBorder === border.border_point ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilterBorder(filterBorder === border.border_point ? '' : border.border_point)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">{border.border_point}</h3>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total:</span>
              <span className="font-medium">{border.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-600">Pending:</span>
              <span>{border.pending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Cleared:</span>
              <span>{border.cleared}</span>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Order</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Border Point</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">URA Declaration</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Progress</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clearances.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No clearances found</td>
                </tr>
              ) : (
                clearances.map((c) => {
                  const stepIdx = getStepStatus(c.clearance_status);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium">{c.order_number}</p>
                        <p className="text-xs text-gray-500">{c.dealership_name}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span>{c.border_point}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">{c.ura_declaration_number || '-'}</td>
                      <td className="p-4">
                        <div className="flex gap-0.5">
                          {CLEARANCE_STEPS.map((step, idx) => (
                            <div
                              key={step.key}
                              className={`w-4 h-4 rounded-full ${idx < stepIdx ? 'bg-green-500' : 'bg-gray-200'}`}
                              title={step.label}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`badge ${
                          c.clearance_status === 'Cleared' || c.clearance_status === 'Delivered' ? 'badge-green' :
                          c.clearance_status === 'In Progress' || c.clearance_status === 'Inspection' ? 'badge-yellow' :
                          'badge-gray'
                        }`}>
                          {c.clearance_status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleViewDetail(c)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClearance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Clearance Details</h2>
                <p className="text-sm text-gray-500">{selectedClearance.order_number}</p>
              </div>
              <button onClick={() => setSelectedClearance(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {detailLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : detail ? (
                <div className="space-y-6">
                  {/* Progress Steps */}
                  <div className="flex justify-between">
                    {CLEARANCE_STEPS.map((step, idx) => {
                      const currentIdx = getStepStatus(detail.clearance_status);
                      const isComplete = idx < currentIdx;
                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            <step.icon className="w-4 h-4" />
                          </div>
                          <p className={`text-xs mt-1 ${isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Border Point</p>
                      <p className="font-medium">{detail.border_point}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">URA Declaration</p>
                      <p className="font-mono">{detail.ura_declaration_number || 'Pending'}</p>
                    </div>
                    {detail.customs_cleared_date && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Customs Cleared</p>
                        <p>{new Date(detail.customs_cleared_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {detail.inspection_date && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Inspection Date</p>
                        <p>{new Date(detail.inspection_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {detail.release_date && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Release Date</p>
                        <p>{new Date(detail.release_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Tax Info */}
                  {detail.total_tax_ugx && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Tax Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-600">Import Duty:</span> {formatLocalMoney(detail.import_duty_ugx)}</p>
                        <p><span className="text-gray-600">VAT:</span> {formatLocalMoney(detail.vat_ugx)}</p>
                        <p className="col-span-2 font-medium pt-2 border-t">
                          Total Tax: {formatLocalMoney(detail.total_tax_ugx)}
                        </p>
                      </div>
                    </div>
                  )}

                  {detail.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-gray-600">{detail.notes}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
