const db = require('./db');

const supplierId = 1;
const dealershipId = 1;
const customerId = 1;

const vehicleDefs = [
  {
    chassisNumber: 'DEMO-APR18-TY001',
    make: 'Toyota',
    model: 'Premio',
    year: 2021,
    color: 'Pearl White',
    engineCc: 1800,
    mileage: 42000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    purchasePriceUsd: 14800,
    status: 'Sold',
    createdAt: '2026-04-18 09:00:00'
  },
  {
    chassisNumber: 'DEMO-APR28-NS001',
    make: 'Nissan',
    model: 'X-Trail',
    year: 2020,
    color: 'Black',
    engineCc: 2000,
    mileage: 61000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'SUV',
    purchasePriceUsd: 21900,
    status: 'Sold',
    createdAt: '2026-04-28 11:20:00'
  },
  {
    chassisNumber: 'DEMO-MAY06-MZ001',
    make: 'Mazda',
    model: 'CX-5',
    year: 2022,
    color: 'Red',
    engineCc: 2200,
    mileage: 28000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'SUV',
    purchasePriceUsd: 27300,
    status: 'At Border',
    createdAt: '2026-05-06 08:40:00'
  }
];

const orderDefs = [
  {
    orderNumber: 'ORD-DEMO-APR18',
    totalAmountUsd: 14800,
    orderStatus: 'Delivered',
    createdAt: '2026-04-18 10:00:00',
    vehicleChassisNumber: 'DEMO-APR18-TY001',
    shippingStatus: 'Delivered',
    departureDate: '2026-04-19',
    estimatedArrival: '2026-04-30',
    actualArrival: '2026-04-28',
    deliveredDate: '2026-04-30',
    customsClearedDate: '2026-04-30'
  },
  {
    orderNumber: 'ORD-DEMO-APR28',
    totalAmountUsd: 21900,
    orderStatus: 'Delivered',
    createdAt: '2026-04-28 12:00:00',
    vehicleChassisNumber: 'DEMO-APR28-NS001',
    shippingStatus: 'Delivered',
    departureDate: '2026-04-29',
    estimatedArrival: '2026-05-08',
    actualArrival: '2026-05-06',
    deliveredDate: '2026-05-08',
    customsClearedDate: '2026-05-08'
  },
  {
    orderNumber: 'ORD-DEMO-MAY06',
    totalAmountUsd: 27300,
    orderStatus: 'At Border',
    createdAt: '2026-05-06 09:15:00',
    vehicleChassisNumber: 'DEMO-MAY06-MZ001',
    shippingStatus: 'In Transit',
    departureDate: '2026-05-07',
    estimatedArrival: '2026-05-20',
    actualArrival: null,
    deliveredDate: null,
    customsClearedDate: null
  }
];

const saleDefs = [
  {
    invoiceNumber: 'INV-DEMO-APR30',
    vehicleChassisNumber: 'DEMO-APR18-TY001',
    totalCostUgx: 55000000,
    sellingPriceUgx: 78000000,
    amountPaidUgx: 78000000,
    paymentStatus: 'Paid',
    saleDate: '2026-04-30 14:30:00'
  },
  {
    invoiceNumber: 'INV-DEMO-MAY09',
    vehicleChassisNumber: 'DEMO-APR28-NS001',
    totalCostUgx: 82000000,
    sellingPriceUgx: 101000000,
    amountPaidUgx: 60000000,
    paymentStatus: 'Partial',
    saleDate: '2026-05-09 16:00:00'
  }
];

function fetchOne(sql, params = []) {
  return db.query(sql, params).rows[0] || null;
}

function ensureVehicle(vehicle) {
  const existing = fetchOne('SELECT id FROM vehicles WHERE chassis_number = $1', [vehicle.chassisNumber]);

  if (!existing) {
    db.query(
      `INSERT INTO vehicles (
        chassis_number, make, model, year, color, engine_cc, mileage, fuel_type,
        transmission, body_type, purchase_price_usd, foreign_bond_id, dealership_id,
        status, quantity, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17
      )`,
      [
        vehicle.chassisNumber,
        vehicle.make,
        vehicle.model,
        vehicle.year,
        vehicle.color,
        vehicle.engineCc,
        vehicle.mileage,
        vehicle.fuelType,
        vehicle.transmission,
        vehicle.bodyType,
        vehicle.purchasePriceUsd,
        supplierId,
        dealershipId,
        vehicle.status,
        1,
        vehicle.createdAt,
        vehicle.createdAt
      ]
    );
  } else {
    db.query(
      `UPDATE vehicles
       SET make = $1,
           model = $2,
           year = $3,
           color = $4,
           engine_cc = $5,
           mileage = $6,
           fuel_type = $7,
           transmission = $8,
           body_type = $9,
           purchase_price_usd = $10,
           foreign_bond_id = $11,
           dealership_id = $12,
           status = $13,
           quantity = $14,
           created_at = $15,
           updated_at = $16
       WHERE chassis_number = $17`,
      [
        vehicle.make,
        vehicle.model,
        vehicle.year,
        vehicle.color,
        vehicle.engineCc,
        vehicle.mileage,
        vehicle.fuelType,
        vehicle.transmission,
        vehicle.bodyType,
        vehicle.purchasePriceUsd,
        supplierId,
        dealershipId,
        vehicle.status,
        1,
        vehicle.createdAt,
        vehicle.createdAt,
        vehicle.chassisNumber
      ]
    );
  }

  return fetchOne('SELECT id FROM vehicles WHERE chassis_number = $1', [vehicle.chassisNumber]).id;
}

function ensureOrder(order, vehicleId) {
  const existing = fetchOne('SELECT id FROM import_orders WHERE order_number = $1', [order.orderNumber]);

  if (!existing) {
    db.query(
      `INSERT INTO import_orders (
        order_number, foreign_bond_id, dealership_id, total_amount_usd,
        order_status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        order.orderNumber,
        supplierId,
        dealershipId,
        order.totalAmountUsd,
        order.orderStatus,
        'Analytics demo flow',
        order.createdAt,
        order.createdAt
      ]
    );
  } else {
    db.query(
      `UPDATE import_orders
       SET foreign_bond_id = $1,
           dealership_id = $2,
           total_amount_usd = $3,
           order_status = $4,
           notes = $5,
           created_at = $6,
           updated_at = $7
       WHERE order_number = $8`,
      [
        supplierId,
        dealershipId,
        order.totalAmountUsd,
        order.orderStatus,
        'Analytics demo flow',
        order.createdAt,
        order.createdAt,
        order.orderNumber
      ]
    );
  }

  const orderId = fetchOne('SELECT id FROM import_orders WHERE order_number = $1', [order.orderNumber]).id;
  const existingLink = fetchOne('SELECT id FROM order_vehicles WHERE order_id = $1 AND vehicle_id = $2', [orderId, vehicleId]);

  if (!existingLink) {
    db.query(
      'INSERT INTO order_vehicles (order_id, vehicle_id, quantity, created_at) VALUES ($1, $2, $3, $4)',
      [orderId, vehicleId, 1, order.createdAt]
    );
  } else {
    db.query(
      'UPDATE order_vehicles SET quantity = $1, created_at = $2 WHERE id = $3',
      [1, order.createdAt, existingLink.id]
    );
  }

  const existingShipping = fetchOne('SELECT id FROM shipping WHERE order_id = $1', [orderId]);

  if (!existingShipping) {
    db.query(
      `INSERT INTO shipping (
        order_id, bl_number, container_number, vessel_name, departure_port,
        arrival_port, departure_date, estimated_arrival, actual_arrival,
        delivered_date, customs_cleared_date, shipping_status, border_point,
        final_destination, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16
      )`,
      [
        orderId,
        `BL-${order.orderNumber}`,
        `CONT-${order.orderNumber}`,
        'Demo Carrier',
        'Yokohama, Japan',
        'Kampala, Uganda',
        order.departureDate,
        order.estimatedArrival,
        order.actualArrival,
        order.deliveredDate,
        order.customsClearedDate,
        order.shippingStatus,
        'Malaba',
        'Kampala',
        order.createdAt,
        order.createdAt
      ]
    );
  } else {
    db.query(
      `UPDATE shipping
       SET bl_number = $1,
           container_number = $2,
           vessel_name = $3,
           departure_port = $4,
           arrival_port = $5,
           departure_date = $6,
           estimated_arrival = $7,
           actual_arrival = $8,
           delivered_date = $9,
           customs_cleared_date = $10,
           shipping_status = $11,
           border_point = $12,
           final_destination = $13,
           created_at = $14,
           updated_at = $15
       WHERE order_id = $16`,
      [
        `BL-${order.orderNumber}`,
        `CONT-${order.orderNumber}`,
        'Demo Carrier',
        'Yokohama, Japan',
        'Kampala, Uganda',
        order.departureDate,
        order.estimatedArrival,
        order.actualArrival,
        order.deliveredDate,
        order.customsClearedDate,
        order.shippingStatus,
        'Malaba',
        'Kampala',
        order.createdAt,
        order.createdAt,
        orderId
      ]
    );
  }
}

function ensureSale(sale) {
  const vehicle = fetchOne('SELECT id FROM vehicles WHERE chassis_number = $1', [sale.vehicleChassisNumber]);
  if (!vehicle) {
    throw new Error(`Vehicle not found for sale: ${sale.vehicleChassisNumber}`);
  }

  db.query(
    'UPDATE vehicles SET status = $1, dealership_id = $2, updated_at = $3 WHERE id = $4',
    ['Sold', dealershipId, sale.saleDate, vehicle.id]
  );

  const existing = fetchOne('SELECT id FROM local_sales WHERE invoice_number = $1', [sale.invoiceNumber]);
  if (!existing) {
    db.query(
      `INSERT INTO local_sales (
        invoice_number, vehicle_id, dealership_id, customer_id, total_cost_ugx,
        selling_price_ugx, amount_paid_ugx, payment_status, sale_date,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12
      )`,
      [
        sale.invoiceNumber,
        vehicle.id,
        dealershipId,
        customerId,
        sale.totalCostUgx,
        sale.sellingPriceUgx,
        sale.amountPaidUgx,
        sale.paymentStatus,
        sale.saleDate,
        'Analytics demo sale',
        sale.saleDate,
        sale.saleDate
      ]
    );
  } else {
    db.query(
      `UPDATE local_sales
       SET vehicle_id = $1,
           dealership_id = $2,
           customer_id = $3,
           total_cost_ugx = $4,
           selling_price_ugx = $5,
           amount_paid_ugx = $6,
           payment_status = $7,
           sale_date = $8,
           notes = $9,
           created_at = $10,
           updated_at = $11
       WHERE invoice_number = $12`,
      [
        vehicle.id,
        dealershipId,
        customerId,
        sale.totalCostUgx,
        sale.sellingPriceUgx,
        sale.amountPaidUgx,
        sale.paymentStatus,
        sale.saleDate,
        'Analytics demo sale',
        sale.saleDate,
        sale.saleDate,
        sale.invoiceNumber
      ]
    );
  }
}

async function main() {
  await db.dbReady;

  const vehicleIdsByChassis = {};
  for (const vehicle of vehicleDefs) {
    vehicleIdsByChassis[vehicle.chassisNumber] = ensureVehicle(vehicle);
  }

  for (const order of orderDefs) {
    ensureOrder(order, vehicleIdsByChassis[order.vehicleChassisNumber]);
  }

  for (const sale of saleDefs) {
    ensureSale(sale);
  }

  db.saveDb();

  console.log('Seeded analytics demo data successfully.');
  console.log(JSON.stringify({
    supplierId,
    dealershipId,
    orders: orderDefs.map((order) => order.orderNumber),
    sales: saleDefs.map((sale) => sale.invoiceNumber)
  }, null, 2));
}

main().catch((error) => {
  console.error('Failed to seed analytics demo data:', error);
  process.exit(1);
});