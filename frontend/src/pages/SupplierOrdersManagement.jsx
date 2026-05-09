import { useState, useEffect } from 'react';
import { CheckCircle, Truck, Eye, AlertCircle, Clock, Package } from 'lucide-react';
import api from '../api';

export default function SupplierOrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/import-orders');
      setOrders(res.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId) => {
    if (!confirm('Confirm this order? This will reduce your inventory.')) return;
    
    try {
      setActionInProgress(true);
      await api.patch(`/import-orders/${orderId}/confirm`);
      alert('Order confirmed successfully!');
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to confirm order');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleMarkShipped = async (orderId) => {
    if (!confirm('Mark this order as shipped?')) return;
    
    try {
      setActionInProgress(true);
      await api.patch(`/import-orders/${orderId}/status`, { status: 'Shipped' });
      alert('Order marked as shipped!');
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update order');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Shipped': 'bg-purple-100 text-purple-800',
      'At Border': 'bg-orange-100 text-orange-800',
      'Cleared': 'bg-green-100 text-green-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Shipped':
        return <Truck className="w-4 h-4" />;
      case 'Delivered':
        return <Package className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(o => o.order_status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders Received</h1>
          <p className="text-gray-600">Manage orders from dealerships</p>
        </div>
        <div className="text-3xl font-bold text-blue-600">{orders.length}</div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-blue-600 mb-2" />
          <p className="text-gray-600">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">Order #{order.order_number}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusBadge(order.order_status)}`}>
                        {getStatusIcon(order.order_status)}
                        {order.order_status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">From: {order.dealership_name}</p>
                    <p className="text-gray-500 text-sm">Created: {new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetails(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Vehicles</p>
                    <p className="text-lg font-semibold">{order.vehicle_count || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Total Amount</p>
                    <p className="text-lg font-semibold">${order.total_amount_usd?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Status</p>
                    <p className="text-lg font-semibold">{order.order_status}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.order_status === 'Pending' && (
                    <button
                      onClick={() => handleConfirmOrder(order.id)}
                      disabled={actionInProgress}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Confirm Order
                    </button>
                  )}
                  {order.order_status === 'Confirmed' && (
                    <button
                      onClick={() => handleMarkShipped(order.id)}
                      disabled={actionInProgress}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      <Truck className="w-4 h-4 inline mr-2" />
                      Mark as Shipped
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetails(true);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Order #{selectedOrder.order_number} Details</h2>
              <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="font-semibold mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Order Number</p>
                    <p className="font-semibold">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadge(selectedOrder.order_status)}`}>
                      {selectedOrder.order_status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-600">Dealership</p>
                    <p className="font-semibold">{selectedOrder.dealership_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-semibold text-lg">${selectedOrder.total_amount_usd?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Vehicle Count</p>
                    <p className="font-semibold">{selectedOrder.vehicle_count || 0}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-gray-700 text-sm p-3 bg-gray-50 rounded">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedOrder.order_status === 'Pending' && (
                  <button
                    onClick={() => {
                      handleConfirmOrder(selectedOrder.id);
                      setShowDetails(false);
                    }}
                    disabled={actionInProgress}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Confirm Order
                  </button>
                )}
                {selectedOrder.order_status === 'Confirmed' && (
                  <button
                    onClick={() => {
                      handleMarkShipped(selectedOrder.id);
                      setShowDetails(false);
                    }}
                    disabled={actionInProgress}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Mark as Shipped
                  </button>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
