import { X, Car, Calendar, MapPin, FileText, Shield, Wrench, DollarSign, TrendingUp, Tag, Package, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function VehicleDetailModal({ vehicle, onClose }) {
  if (!vehicle) return null;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A';
  const formatCurrency = (amount, currency = 'UGX') => 
    amount ? `${currency} ${Number(amount).toLocaleString()}` : 'N/A';

  // Per-car profitability fallback chain for both dealership (UGX) and supplier (USD) records.
  const ugxSale = Number(vehicle.target_selling_price_ugx || vehicle.selling_price_ugx || vehicle.sale_price_ugx || 0);
  const ugxCost = Number(vehicle.cost_per_unit_ugx || vehicle.total_landed_cost_ugx || 0);
  const usdSale = Number(vehicle.sale_price_usd || 0);
  const usdCost = Number(vehicle.purchase_price_usd || 0);
  const useUGXProfit = ugxSale > 0 && ugxCost > 0;
  const useUSDProfit = !useUGXProfit && usdSale > 0 && usdCost > 0;
  const profitCurrency = useUGXProfit ? 'UGX' : (useUSDProfit ? 'USD' : null);
  const perCarCost = useUGXProfit ? ugxCost : (useUSDProfit ? usdCost : 0);
  const perCarSale = useUGXProfit ? ugxSale : (useUSDProfit ? usdSale : 0);
  const perCarProfit = perCarSale - perCarCost;
  const perCarMarginPct = perCarSale > 0 ? (perCarProfit / perCarSale) * 100 : 0;
  const carQty = Number(vehicle.quantity || 1);
  const totalProfitAllUnits = perCarProfit * carQty;

  const sections = [
    {
      title: 'Vehicle Specifications',
      icon: Car,
      color: 'blue',
      fields: [
        { label: 'Make', value: vehicle.make },
        { label: 'Model', value: vehicle.model },
        { label: 'Year', value: vehicle.year },
        { label: 'VIN/Chassis', value: vehicle.chassis_number || vehicle.vin },
        { label: 'Engine Number', value: vehicle.engine_number },
        { label: 'Color', value: vehicle.color },
        { label: 'Body Type', value: vehicle.body_type },
        { label: 'Engine Size', value: vehicle.engine_cc ? `${vehicle.engine_cc}cc` : null },
        { label: 'Fuel Type', value: vehicle.fuel_type },
        { label: 'Transmission', value: vehicle.transmission },
        { label: 'Drive Type', value: vehicle.drive_type },
        { label: 'Mileage', value: vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : null },
        { label: 'Seating Capacity', value: vehicle.seating_capacity },
        { label: 'Doors', value: vehicle.doors },
        { label: 'Weight', value: vehicle.weight_kg ? `${vehicle.weight_kg} kg` : null },
        { label: 'Dimensions', value: vehicle.dimensions },
      ]
    },
    {
      title: 'Delivery & Timing',
      icon: Calendar,
      color: 'green',
      fields: [
        { label: 'Expected Delivery', value: formatDate(vehicle.expected_delivery_date) },
        { label: 'Actual Delivery', value: formatDate(vehicle.actual_delivery_date) },
        { label: 'Received Date', value: formatDate(vehicle.received_date) },
        { label: 'Days in Inventory', value: vehicle.days_in_inventory || 0, suffix: ' days' },
        { label: 'Created', value: formatDate(vehicle.created_at) },
        { label: 'Last Updated', value: formatDate(vehicle.updated_at) },
      ]
    },
    {
      title: 'Location & Storage',
      icon: MapPin,
      color: 'purple',
      fields: [
        { label: 'Warehouse Location', value: vehicle.warehouse_location },
        { label: 'Parking Bay', value: vehicle.parking_bay },
        { label: 'Current Location', value: vehicle.current_location_details },
        { label: 'Origin Country', value: vehicle.origin_country },
        { label: 'Supplier/Bond', value: vehicle.foreign_bond_name || vehicle.dealership_name },
      ]
    },
    {
      title: 'Documentation & Compliance',
      icon: FileText,
      color: 'indigo',
      fields: [
        { label: 'Import Permit Status', value: vehicle.import_permit_status },
        { label: 'Import Permit No.', value: vehicle.import_permit_number },
        { label: 'Import Permit Date', value: formatDate(vehicle.import_permit_date) },
        { label: 'Registration Status', value: vehicle.registration_status },
        { label: 'Registration No.', value: vehicle.registration_number },
        { label: 'Registration Date', value: formatDate(vehicle.registration_date) },
        { label: 'Ownership Docs Status', value: vehicle.ownership_docs_status },
        { label: 'Logbook Number', value: vehicle.logbook_number },
        { label: 'Logbook Received', value: formatDate(vehicle.logbook_received_date) },
      ]
    },
    {
      title: 'Insurance',
      icon: Shield,
      color: 'cyan',
      fields: [
        { label: 'Insurance Provider', value: vehicle.insurance_provider },
        { label: 'Policy Number', value: vehicle.insurance_policy_number },
        { label: 'Start Date', value: formatDate(vehicle.insurance_start_date) },
        { label: 'Expiry Date', value: formatDate(vehicle.insurance_expiry_date) },
        { label: 'Premium', value: formatCurrency(vehicle.insurance_premium_ugx) },
      ]
    },
    {
      title: 'Condition & Inspection',
      icon: CheckCircle,
      color: 'emerald',
      fields: [
        { label: 'Overall Condition', value: vehicle.condition },
        { label: 'Exterior Condition', value: vehicle.exterior_condition },
        { label: 'Interior Condition', value: vehicle.interior_condition },
        { label: 'Mechanical Condition', value: vehicle.mechanical_condition },
        { label: 'Tire Condition', value: vehicle.tire_condition },
        { label: 'Last Inspection', value: formatDate(vehicle.last_inspection_date) },
        { label: 'Next Inspection Due', value: formatDate(vehicle.next_inspection_due) },
        { label: 'Inspection Score', value: vehicle.inspection_score ? `${vehicle.inspection_score}/10` : null },
        { label: 'Inspector', value: vehicle.inspector_name },
        { label: 'Has Defects', value: vehicle.has_defects ? 'Yes' : 'No' },
        { label: 'Defects List', value: vehicle.defects_list },
        { label: 'Requires Repair', value: vehicle.requires_repair ? 'Yes' : 'No' },
      ]
    },
    {
      title: 'Service & Maintenance',
      icon: Wrench,
      color: 'orange',
      fields: [
        { label: 'Last Service Date', value: formatDate(vehicle.last_service_date) },
        { label: 'Last Service Type', value: vehicle.last_service_type },
        { label: 'Next Service Due', value: formatDate(vehicle.next_service_due_date) },
        { label: 'Next Service (km)', value: vehicle.next_service_due_km ? `${Number(vehicle.next_service_due_km).toLocaleString()} km` : null },
        { label: 'Total Repair Cost', value: formatCurrency(vehicle.total_repair_cost_ugx) },
        { label: 'Pending Repairs', value: vehicle.pending_repairs },
      ]
    },
    {
      title: 'Per-Car Profitability',
      icon: TrendingUp,
      color: 'emerald',
      fields: [
        { label: 'Cost Per Car', value: profitCurrency ? formatCurrency(perCarCost, profitCurrency) : null },
        { label: 'Sale Price Per Car', value: profitCurrency ? formatCurrency(perCarSale, profitCurrency) : null },
        { label: 'Profit Per Car', value: profitCurrency ? formatCurrency(perCarProfit, profitCurrency) : null, highlight: true },
        { label: 'Margin Per Car', value: profitCurrency ? `${perCarMarginPct.toFixed(2)}%` : null },
        { label: 'Quantity', value: carQty },
        { label: 'Total Profit (All Units)', value: profitCurrency ? formatCurrency(totalProfitAllUnits, profitCurrency) : null },
      ]
    },
    {
      title: 'Financial Details',
      icon: DollarSign,
      color: 'green',
      fields: [
        { label: 'FOB Price', value: formatCurrency(vehicle.fob_price_usd, 'USD') },
        { label: 'Purchase Price', value: formatCurrency(vehicle.purchase_price_usd, 'USD') },
        { label: 'Shipping Cost', value: formatCurrency(vehicle.shipping_cost_usd, 'USD') },
        { label: 'Insurance Cost', value: formatCurrency(vehicle.insurance_cost_usd, 'USD') },
        { label: 'Freight Charges', value: formatCurrency(vehicle.freight_charges_usd, 'USD') },
        { label: 'Import Duty', value: formatCurrency(vehicle.import_duty_ugx) },
        { label: 'VAT', value: formatCurrency(vehicle.vat_ugx) },
        { label: 'Environmental Levy', value: formatCurrency(vehicle.environmental_levy_ugx) },
        { label: 'Infrastructure Levy', value: formatCurrency(vehicle.infrastructure_levy_ugx) },
        { label: 'Withholding Tax', value: formatCurrency(vehicle.withholding_tax_ugx) },
        { label: 'Total Taxes', value: formatCurrency(vehicle.total_taxes_ugx) },
        { label: 'Clearing Agent Fee', value: formatCurrency(vehicle.clearing_agent_fee_ugx) },
        { label: 'Inland Transport', value: formatCurrency(vehicle.transport_inland_ugx) },
        { label: 'Storage Fees', value: formatCurrency(vehicle.storage_fees_ugx) },
        { label: 'Registration Fees', value: formatCurrency(vehicle.registration_fees_ugx) },
        { label: 'Other Costs', value: formatCurrency(vehicle.other_costs_ugx) },
        { label: 'Total Landed Cost', value: formatCurrency(vehicle.total_landed_cost_ugx), highlight: true },
        { label: 'Cost Per Unit', value: formatCurrency(vehicle.cost_per_unit_ugx) },
      ]
    },
    {
      title: 'Pricing Strategy',
      icon: TrendingUp,
      color: 'teal',
      fields: [
        { label: 'Min Selling Price', value: formatCurrency(vehicle.min_selling_price_ugx) },
        { label: 'Target Selling Price', value: formatCurrency(vehicle.target_selling_price_ugx || vehicle.selling_price_ugx) },
        { label: 'Max Discount', value: vehicle.max_discount_percentage ? `${vehicle.max_discount_percentage}%` : null },
        { label: 'Projected Profit', value: vehicle.target_selling_price_ugx && vehicle.total_landed_cost_ugx 
          ? formatCurrency(vehicle.target_selling_price_ugx - vehicle.total_landed_cost_ugx) : null },
        { label: 'Projected Margin', value: vehicle.target_selling_price_ugx && vehicle.total_landed_cost_ugx
          ? `${(((vehicle.target_selling_price_ugx - vehicle.total_landed_cost_ugx) / vehicle.target_selling_price_ugx) * 100).toFixed(2)}%`
          : null },
      ]
    },
    {
      title: 'Marketing & Sales',
      icon: Tag,
      color: 'pink',
      fields: [
        { label: 'Listing Status', value: vehicle.listing_status },
        { label: 'Listed Date', value: formatDate(vehicle.listing_date) },
        { label: 'Featured', value: vehicle.is_featured ? 'Yes' : 'No' },
        { label: 'Hot Deal', value: vehicle.is_hot_deal ? 'Yes' : 'No' },
        { label: 'Views Count', value: vehicle.views_count || 0 },
        { label: 'Inquiries', value: vehicle.inquiries_count || 0 },
        { label: 'Reserved', value: vehicle.is_reserved ? 'Yes' : 'No' },
        { label: 'Reserved By', value: vehicle.reserved_by },
        { label: 'Reserved Until', value: formatDate(vehicle.reserved_until) },
        { label: 'Deposit Paid', value: formatCurrency(vehicle.deposit_paid_ugx) },
      ]
    },
    {
      title: 'Shipping Information',
      icon: Package,
      color: 'sky',
      fields: [
        { label: 'Container Number', value: vehicle.container_number },
        { label: 'BL Number', value: vehicle.bl_number },
        { label: 'Vessel Name', value: vehicle.vessel_name },
        { label: 'Port of Loading', value: vehicle.port_of_loading },
        { label: 'Port of Discharge', value: vehicle.port_of_discharge },
        { label: 'Estimated Arrival', value: formatDate(vehicle.estimated_arrival_date) },
        { label: 'Supplier Invoice No.', value: vehicle.supplier_invoice_number },
        { label: 'Supplier Invoice Date', value: formatDate(vehicle.supplier_invoice_date) },
        { label: 'Purchase Order No.', value: vehicle.purchase_order_number },
      ]
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {vehicle.chassis_number || vehicle.vin} • 
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                vehicle.status === 'Available' || vehicle.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                vehicle.status === 'Sold' ? 'bg-gray-100 text-gray-700' :
                'bg-blue-100 text-blue-800'
              }`}>
                {vehicle.status}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Vehicle Image */}
        {vehicle.image_url && (
          <div className="px-6 pt-4">
            <img src={vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} 
              className="w-full h-64 object-cover rounded-lg" />
          </div>
        )}

        {/* Content Sections */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            const visibleFields = section.fields.filter(f => f.value && f.value !== 'N/A' && f.value !== 'No' && f.value !== '0 days');
            
            if (visibleFields.length === 0) return null;

            return (
              <div key={section.title} className="border rounded-lg overflow-hidden">
                <div className={`bg-${section.color}-50 px-4 py-3 border-b flex items-center gap-2`}>
                  <Icon className={`w-5 h-5 text-${section.color}-600`} />
                  <h3 className={`font-semibold text-${section.color}-900`}>{section.title}</h3>
                  <span className="ml-auto text-sm text-gray-500">{visibleFields.length} fields</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleFields.map((field, idx) => (
                    <div key={idx} className={field.highlight ? 'col-span-full' : ''}>
                      <p className="text-xs text-gray-500 mb-1">{field.label}</p>
                      <p className={`font-medium ${field.highlight ? 'text-lg text-green-700' : 'text-gray-900'}`}>
                        {field.value}{field.suffix || ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          {vehicle.notes && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-yellow-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-yellow-900">Notes</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{vehicle.notes}</p>
              </div>
            </div>
          )}

          {vehicle.internal_notes && (
            <div className="border rounded-lg overflow-hidden border-red-200">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Internal Notes (Private)</h3>
              </div>
              <div className="p-4 bg-red-50">
                <p className="text-sm text-red-900 whitespace-pre-wrap">{vehicle.internal_notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Quantity: <span className="font-semibold">{vehicle.quantity || 1}</span> units
              {vehicle.days_in_inventory > 0 && (
                <span className="ml-4">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {vehicle.days_in_inventory} days in stock
                </span>
              )}
            </div>
            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
