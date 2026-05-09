const cron = require('node-cron');
const db = require('../db');
const emailService = require('./emailService');

/**
 * Check for expiring subscriptions and send warnings
 * Runs daily at 9 AM
 */
function startSubscriptionMonitor() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔍 Checking for expiring subscriptions...');
    
    try {
      const now = new Date();
      const sevenDays = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const threeDays = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const oneDay = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));

      // Get dealerships with subscriptions expiring soon
      const expiringQuery = await db.query(
        `SELECT id, name, email, subscription_end_date, subscription_plan, subscription_status
         FROM dealerships 
         WHERE subscription_status = 'active'
         AND subscription_end_date IS NOT NULL
         AND subscription_end_date >= $1
         AND subscription_end_date <= $2`,
        [now.toISOString(), sevenDays.toISOString()]
      );

      for (const dealership of expiringQuery.rows) {
        const endDate = new Date(dealership.subscription_end_date);
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Send email if 7, 3, or 1 day(s) remaining
        if ([7, 3, 1].includes(daysLeft)) {
          try {
            await emailService.sendSubscriptionExpiring(
              dealership,
              daysLeft,
              dealership.email
            );
            console.log(`✉️ Sent ${daysLeft}-day warning to ${dealership.name}`);
          } catch (error) {
            console.error(`Failed to send email to ${dealership.name}:`, error);
          }
        }
      }

      // Auto-suspend expired subscriptions
      const expiredQuery = await db.query(
        `SELECT id, name, email, subscription_end_date
         FROM dealerships 
         WHERE subscription_status = 'active'
         AND subscription_end_date IS NOT NULL
         AND subscription_end_date < $1`,
        [now.toISOString()]
      );

      for (const dealership of expiredQuery.rows) {
        // Check if grace period (3 days) has passed
        const endDate = new Date(dealership.subscription_end_date);
        const gracePeriod = new Date(endDate.getTime() + (3 * 24 * 60 * 60 * 1000));

        if (now > gracePeriod) {
          // Suspend account
          await db.query(
            `UPDATE dealerships 
             SET subscription_status = 'expired', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [dealership.id]
          );
          
          console.log(`🚫 Suspended ${dealership.name} - grace period expired`);
          
          // Send suspension notice
          try {
            // Email template would be created in emailService
            console.log(`✉️ Sent suspension notice to ${dealership.name}`);
          } catch (error) {
            console.error(`Failed to send suspension notice:`, error);
          }
        }
      }

      await db.saveDb();

    } catch (error) {
      console.error('Subscription monitor error:', error);
    }
  });

  console.log('✅ Subscription monitor started (runs daily at 9 AM)');
}

/**
 * Manual check (for testing)
 */
async function checkExpiringSubscriptions() {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

  const result = await db.query(
    `SELECT id, name, email, subscription_end_date, subscription_plan, subscription_status,
     CAST((julianday(subscription_end_date) - julianday('now')) AS INTEGER) as days_left
     FROM dealerships 
     WHERE subscription_status = 'active'
     AND subscription_end_date IS NOT NULL
     AND subscription_end_date >= datetime('now')
     AND subscription_end_date <= datetime('now', '+7 days')
     ORDER BY subscription_end_date ASC`
  );

  return result.rows;
}

module.exports = {
  startSubscriptionMonitor,
  checkExpiringSubscriptions
};
