import { useState, useEffect } from 'react';
import { getMyOrders } from '../api';
import { Building2, Package, DollarSign } from 'lucide-react';

export default function SupplierCustomers() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getMyOrders();
      const ordersData = res.data.data || [];
      setOrders(ordersData);
      
      // Group orders by customer (dealership)
      const customerMap = {};
      ordersData.forEach(order => {
        const customerName = order.dealership_name || order.bond_name || 'Unknown';
        if (!customerMap[customerName]) {
          customerMap[customerName] = {
            name: customerName,
            totalOrders: 0,
            totalVehicles: 0,
            totalValue: 0,
            lastOrderDate: order.order_date
          };
        }
        customerMap[customerName].totalOrders += 1;
        customerMap[customerName].totalVehicles += order.vehicle_count || 0;
        customerMap[customerName].totalValue += parseFloat(order.total_value || 0);
        if (new Date(order.order_date) > new Date(customerMap[customerName].lastOrderDate)) {
          customerMap[customerName].lastOrderDate = order.order_date;
        }
      });
      
      setCustomers(Object.values(customerMap));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Customers</h1>
        <p className="text-gray-600 mt-1">Dealerships and bonds purchasing from you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Customers</p>
              <p className="text-3xl font-bold mt-2">{customers.length}</p>
            </div>
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold mt-2">{orders.length}</p>
            </div>
            <Package className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-2">
                ${customers.reduce((sum, c) => sum + c.totalValue, 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Customer List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles Purchased</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.totalOrders}</td>
                  <td className="px-6 py-4 text-sm">{customer.totalVehicles}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    ${customer.totalValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No customers yet. Your customers will appear here when dealerships start ordering.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
