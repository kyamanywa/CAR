const db = require('../db');

/**
 * Audit log middleware — records mutating requests (POST/PUT/PATCH/DELETE).
 * Attach after auth middleware on routes you want to audit.
 * Usage: router.post('/', auth, auditLog('vehicles'), handler)
 */
function auditLog(resource) {
  return async (req, res, next) => {
    // Intercept the response to capture status + result
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Fire-and-forget: don't block the response
      setImmediate(async () => {
        try {
          const userId = req.user?.id || null;
          const action = methodToAction(req.method);
          const resourceId = req.params?.id || (body?.data?.id) || null;
          const details = buildDetails(req, body);
          const status = res.statusCode < 400 ? 'success' : 'failure';

          await db.query(
            `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'))`,
            [userId, action, resource, String(resourceId || ''), details, req.ip, status]
          );
        } catch (e) {
          // Never crash the app due to audit logging
          console.error('Audit log error:', e.message);
        }
      });
      return originalJson(body);
    };
    next();
  };
}

function methodToAction(method) {
  switch (method) {
    case 'POST':   return 'create';
    case 'PUT':    return 'update';
    case 'PATCH':  return 'update';
    case 'DELETE': return 'delete';
    default:       return method.toLowerCase();
  }
}

function buildDetails(req, responseBody) {
  // Strip sensitive fields from body before storing
  const safeBody = { ...req.body };
  delete safeBody.password;
  delete safeBody.password_hash;
  delete safeBody.token;
  delete safeBody.card_number;
  delete safeBody.cvv;

  const details = {
    method: req.method,
    path: req.originalUrl,
    params: req.params,
    body: safeBody,
  };

  // If response has an id, record it
  if (responseBody?.data?.id) details.created_id = responseBody.data.id;

  return JSON.stringify(details).slice(0, 2000); // cap at 2kb
}

module.exports = auditLog;
