const nodemailer = require('nodemailer');

// FREE EMAIL SERVICE - Use Gmail SMTP (100 emails/day FREE, no approval needed)
// Alternative: Use Ethereal Email for testing (fake SMTP, unlimited FREE)

const isDevelopment = process.env.NODE_ENV !== 'production';

// Create transporter
let transporter;

if (isDevelopment) {
  // Development: Use Ethereal Email (fake SMTP for testing)
  // All emails are captured but not sent - FREE and unlimited!
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'ethereal.user@ethereal.email', // Replace with your Ethereal credentials
      pass: 'ethereal.password'
    }
  });
} else {
  // Production: Use Gmail SMTP (100 emails/day FREE)
  // Setup: Enable "Less secure app access" or use App Password
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
}

// Email templates
const templates = {
  orderCreated: (order, dealership) => ({
    subject: `Order Confirmed: ${order.order_number}`,
    html: `
      <h2>Order Confirmed!</h2>
      <p>Dear ${dealership.name},</p>
      <p>Your order <strong>${order.order_number}</strong> has been successfully created.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Order Number: ${order.order_number}</li>
        <li>Total Vehicles: ${order.vehicle_count}</li>
        <li>Total Amount: $${order.total_amount_usd}</li>
        <li>Status: ${order.order_status}</li>
      </ul>
      <p>You'll receive updates as your order progresses.</p>
      <br>
      <p>Thank you for your business!</p>
    `
  }),

  orderShipped: (order, shipment, dealership) => ({
    subject: `Shipment En Route: ${order.order_number}`,
    html: `
      <h2>Your Order Has Shipped! 🚢</h2>
      <p>Dear ${dealership.name},</p>
      <p>Order <strong>${order.order_number}</strong> is now on its way!</p>
      <p><strong>Shipping Details:</strong></p>
      <ul>
        <li>Vessel: ${shipment.vessel_name}</li>
        <li>BL Number: ${shipment.bl_number || 'TBD'}</li>
        <li>Container: ${shipment.container_number || 'TBD'}</li>
        <li>From: ${shipment.departure_port}</li>
        <li>To: ${shipment.arrival_port}</li>
        <li>Estimated Arrival: ${shipment.estimated_arrival ? new Date(shipment.estimated_arrival).toLocaleDateString() : 'TBD'}</li>
      </ul>
      <p>Track your shipment in the system dashboard.</p>
    `
  }),

  orderAtBorder: (order, clearance, dealership) => ({
    subject: `Arrived at Border: ${order.order_number}`,
    html: `
      <h2>Shipment at Border Customs 🛃</h2>
      <p>Dear ${dealership.name},</p>
      <p>Order <strong>${order.order_number}</strong> has arrived at the border!</p>
      <p><strong>Clearance Details:</strong></p>
      <ul>
        <li>Border Point: ${clearance.border_point}</li>
        <li>URA Declaration: ${clearance.ura_declaration_number || 'Pending'}</li>
        <li>Status: ${clearance.clearance_status}</li>
      </ul>
      <p>We'll notify you once customs clearance is complete.</p>
    `
  }),

  orderCleared: (order, dealership) => ({
    subject: `Customs Cleared: ${order.order_number}`,
    html: `
      <h2>Customs Clearance Complete! ✅</h2>
      <p>Dear ${dealership.name},</p>
      <p>Great news! Order <strong>${order.order_number}</strong> has been cleared by customs.</p>
      <p>Your vehicles are ready for final delivery to your dealership.</p>
      <p>Expected delivery soon!</p>
    `
  }),

  orderDelivered: (order, dealership) => ({
    subject: `Delivered: ${order.order_number}`,
    html: `
      <h2>Order Delivered! 🎉</h2>
      <p>Dear ${dealership.name},</p>
      <p>Order <strong>${order.order_number}</strong> has been successfully delivered!</p>
      <p>Your ${order.vehicle_count} vehicle(s) are now in stock and ready for sale.</p>
      <p>Thank you for your business!</p>
    `
  }),
  orderConfirmedBySupplier: (order, supplier, dealership) => ({
    subject: `Order Confirmed by Supplier: ${order.order_number}`,
    html: `
      <h2>Order Confirmed by Supplier! ✅</h2>
      <p>Dear ${dealership.name},</p>
      <p>Great news! Supplier <strong>${supplier.company_name}</strong> has confirmed your order <strong>${order.order_number}</strong>.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Total Vehicles: ${order.vehicle_count}</li>
        <li>Total Amount: $${order.total_amount_usd}</li>
        <li>Status: ${order.order_status}</li>
      </ul>
      <p>Your order is being prepared for shipment. You'll receive shipping details soon.</p>
    `
  }),

  supplierOrderReceived: (order, dealership, supplier) => ({
    subject: `New Order Received: ${order.order_number}`,
    html: `
      <h2>New Order Received! 🛒</h2>
      <p>Dear ${supplier.company_name},</p>
      <p>You have received a new order from <strong>${dealership.name}</strong>!</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Order Number: ${order.order_number}</li>
        <li>Total Vehicles: ${order.vehicle_count}</li>
        <li>Total Amount: $${order.total_amount_usd}</li>
        <li>Dealership: ${dealership.name}</li>
        <li>Location: ${dealership.city}, ${dealership.country}</li>
      </ul>
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Review the order in your dashboard</li>
        <li>Confirm or reject within 48 hours</li>
        <li>Once confirmed, prepare for shipment</li>
      </ol>
      <p>Action required! Please log in to your dashboard to review this order.</p>
    `
  }),

  supplierOrderRejected: (order, supplier, dealership, reason) => ({
    subject: `Order Rejected: ${order.order_number}`,
    html: `
      <h2>Order Rejected</h2>
      <p>Dear ${dealership.name},</p>
      <p>Unfortunately, your order <strong>${order.order_number}</strong> has been rejected by ${supplier.company_name}.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact the supplier directly for more information or consider placing a new order.</p>
    `
  }),
  subscriptionExpiring: (dealership, daysLeft) => ({
    subject: `Subscription Expiring in ${daysLeft} Days`,
    html: `
      <h2>Subscription Renewal Reminder</h2>
      <p>Dear ${dealership.name},</p>
      <p>Your subscription will expire in <strong>${daysLeft} days</strong>.</p>
      <p>Please renew your subscription to continue using the system without interruption.</p>
      <p><a href="YOUR_WEBSITE/billing" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Now</a></p>
    `
  })
};

// Send email function
async function sendEmail(to, template, data) {
  try {
    const emailContent = templates[template](data, data.dealership || data);
    
    const info = await transporter.sendMail({
      from: '"Car Tracking System" <noreply@cartracking.com>',
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    });

    console.log('Email sent:', info.messageId);
    if (isDevelopment) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// Export functions
module.exports = {
  sendOrderCreated: (order, dealership, email) => 
    sendEmail(email, 'orderCreated', { order, dealership }),
  
  sendOrderShipped: (order, shipment, dealership, email) => 
    sendEmail(email, 'orderShipped', { order, shipment, dealership }),
  
  sendOrderAtBorder: (order, clearance, dealership, email) => 
    sendEmail(email, 'orderAtBorder', { order, clearance, dealership }),
  
  sendOrderCleared: (order, dealership, email) => 
    sendEmail(email, 'orderCleared', { order, dealership }),
  
  sendOrderDelivered: (order, dealership, email) => 
    sendEmail(email, 'orderDelivered', { order, dealership }),

  // Supplier notifications
  sendOrderConfirmedBySupplier: (order, supplier, dealership, email) =>
    sendEmail(email, 'orderConfirmedBySupplier', { order, supplier, dealership }),

  sendSupplierOrderReceived: (order, dealership, supplier, email) =>
    sendEmail(email, 'supplierOrderReceived', { order, dealership, supplier }),

  sendSupplierOrderRejected: (order, supplier, dealership, email, reason) =>
    sendEmail(email, 'supplierOrderRejected', { order, supplier, dealership, reason }),
  
  sendSubscriptionExpiring: (dealership, daysLeft, email) => 
    sendEmail(email, 'subscriptionExpiring', { dealership, daysLeft })
};
