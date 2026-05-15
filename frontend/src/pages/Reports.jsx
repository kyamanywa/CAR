import { useState, useEffect } from 'react';
import { getFinancialSummary, getInventoryReport, getImportOrdersReport } from '../api';
import { useAuth } from '../AuthContext';
import { formatCurrency, getCurrencyConfig } from '../utils/currencyUtils';
import { exportToExcel } from '../utils/exportData';
import { Download } from 'lucide-react';

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('financial');
  const [financialData, setFinancialData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'financial') {
        const res = await getFinancialSummary(dateRange);
        setFinancialData(res.data.data);
      } else if (activeTab === 'inventory') {
        const res = await getInventoryReport();
        setInventoryData(res.data.data);
      } else if (activeTab === 'orders') {
        const res = await getImportOrdersReport();
        setOrdersData(res.data.data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const localCode = getCurrencyConfig('local_sales').code;
  const importCode = getCurrencyConfig('import_orders').code;
  const formatMoney = (amount) => formatCurrency(amount, 'local_sales');
  const formatMoneyUSD = (amount) => formatCurrency(amount, 'import_orders');

  const handleExportFinancial = () => {
    if (!financialData) return;
    const rows = [{
      'Total Sales': financialData.summary.total_sales,
      [`Revenue (${localCode})`]: financialData.summary.total_revenue,
      [`Cost (${localCode})`]: financialData.summary.total_cost,
      [`Profit (${localCode})`]: financialData.summary.total_profit,
      'Paid': financialData.summary.paid_count,
      'Pending': financialData.summary.pending_count,
    }];
    exportToExcel(rows, 'Financial_Summary');
  };

  const handleExportInventory = () => {
    if (!inventoryData) return;
    const rows = (inventoryData.vehicles || []).map(v => ({
      Make: v.make, Model: v.model, Year: v.year, Chassis: v.chassis_number,
      Color: v.color, Status: v.status, Condition: v.condition,
      [`Cost (${importCode})`]: v.purchase_price_usd, Mileage: v.mileage,
    }));
    exportToExcel(rows, 'Inventory_Report');
  };

  const handleExportOrders = () => {
    if (!ordersData) return;
    const rows = (ordersData.orders || []).map(o => ({
      'Order Ref': o.order_reference, Status: o.status,
      [`Total Cost (${importCode})`]: o.total_cost_usd,
      'Vehicles': o.vehicle_count, Date: o.created_at,
    }));
    exportToExcel(rows, 'Import_Orders_Report');
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'bond_manager' 
              ? 'View your bond\'s performance reports' 
            : 'View comprehensive business reports'}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => {
              if (activeTab === 'financial') handleExportFinancial();
              else if (activeTab === 'inventory') handleExportInventory();
              else if (activeTab === 'orders') handleExportOrders();
            }}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Download size={15} /> Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      <div className="mb-6 border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-4 px-1 border-b-2 font-medium ${
              activeTab === 'financial'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Financial Summary
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 px-1 border-b-2 font-medium ${
              activeTab === 'inventory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Inventory Report
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-1 border-b-2 font-medium ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Import Orders
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <>
          {activeTab === 'financial' && financialData && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total Sales</div>
                  <div className="text-2xl font-bold">{financialData.summary.total_sales}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total Revenue</div>
                  <div className="text-2xl font-bold">{formatMoney(financialData.summary.total_revenue)}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total Profit</div>
                  <div className="text-2xl font-bold text-green-600">{formatMoney(financialData.summary.total_profit)}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Avg Profit/Sale</div>
                  <div className="text-2xl font-bold">{formatMoney(financialData.summary.avg_profit_per_sale)}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Status</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Count</th>
                      <th className="px-4 py-2 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {financialData.paymentBreakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.payment_status}</td>
                        <td className="px-4 py-3 text-right">{item.count}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(item.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Top Selling Vehicles</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Make & Model</th>
                      <th className="px-4 py-2 text-right">Sales Count</th>
                      <th className="px-4 py-2 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {financialData.topVehicles.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.make} {item.model}</td>
                        <td className="px-4 py-3 text-right">{item.sales_count}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(item.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && inventoryData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Inventory by Status</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Count</th>
                      <th className="px-4 py-2 text-right">Total Value ({importCode})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventoryData.byStatus.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.status}</td>
                        <td className="px-4 py-3 text-right">{item.count}</td>
                        <td className="px-4 py-3 text-right">{formatMoneyUSD(item.total_value_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Inventory by Make</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Make</th>
                      <th className="px-4 py-2 text-right">Count</th>
                      <th className="px-4 py-2 text-right">Avg Price ({importCode})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventoryData.byMake.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.make}</td>
                        <td className="px-4 py-3 text-right">{item.count}</td>
                        <td className="px-4 py-3 text-right">{formatMoneyUSD(item.avg_price_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && ordersData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Orders by Status</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Count</th>
                      <th className="px-4 py-2 text-right">Total Value ({importCode})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ordersData.byStatus.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.order_status}</td>
                        <td className="px-4 py-3 text-right">{item.count}</td>
                        <td className="px-4 py-3 text-right">{formatMoneyUSD(item.total_value_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Orders by Foreign Bond</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Bond Name</th>
                      <th className="px-4 py-2 text-left">Country</th>
                      <th className="px-4 py-2 text-right">Order Count</th>
                      <th className="px-4 py-2 text-right">Total Value ({importCode})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ordersData.byForeignBond.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.bond_name}</td>
                        <td className="px-4 py-3">{item.country}</td>
                        <td className="px-4 py-3 text-right">{item.order_count}</td>
                        <td className="px-4 py-3 text-right">{formatMoneyUSD(item.total_value_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
