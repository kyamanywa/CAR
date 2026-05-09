# Car Tracking System - API Integration Guide

## Overview

The Car Tracking System provides a complete REST API for managing vehicle imports, orders, shipping, and subscriptions. This guide documents all available endpoints, authentication, and integration patterns.

**Base URL**: `http://localhost:3000/api`  
**Production**: Update to your production domain

## Table of Contents

1. [Authentication](#authentication)
2. [Common Response Format](#common-response-format)
3. [Dealership Endpoints](#dealership-endpoints)
4. [Supplier (Foreign Bond) Endpoints](#supplier-foreign-bond-endpoints)
5. [Import Order Endpoints](#import-order-endpoints)
6. [Shipping Endpoints](#shipping-endpoints)
7. [Border Clearance Endpoints](#border-clearance-endpoints)
8. [Subscription Endpoints](#subscription-endpoints)
9. [Error Handling](#error-handling)
10. [Webhook Integration](#webhook-integration)

---

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "dealership_manager",
    "dealership_id": 5,
    "subscription_status": "active"
  }
}
```

### Using the Token

Include JWT token in Authorization header for all authenticated requests:

```http
GET /api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Token Expiration**: 24 hours

---

## Common Response Format

### Success Response
```json
{
  "data": { /* resource data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { /* optional error details */ }
}
```

---

## Dealership Endpoints

### Get All Dealerships (Admin Only)

```http
GET /api/dealerships
Authorization: Bearer <token>
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "City Motors",
      "country": "Uganda",
      "city": "Kampala",
      "address": "Plot 123, Main St",
      "contact_person": "John Doe",
      "phone": "+256700000000",
      "email": "info@citymotors.com",
      "license_number": "LIC123",
      "subscription_status": "active",
      "subscription_plan": "professional",
      "created_at": "2024-01-15"
    }
  ]
}
```

### Create Dealership (Admin Only)

```http
POST /api/dealerships
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Dealership",
  "country": "Uganda",
  "city": "Kampala",
  "address": "Plot 456, New Road",
  "contact_person": "Jane Smith",
  "phone": "+256701234567",
  "email": "jane@dealership.com",
  "contact_phone": "+256701234567",
  "contact_email": "contact@dealership.com",
  "license_number": "LIC456",
  "subscription_plan": "professional",
  "subscription_amount": 199,
  "subscription_status": "active"
}
```

**Response**:
```json
{
  "message": "Dealership created successfully",
  "dealership_id": 5
}
```

### Get Dealership Details

```http
GET /api/dealerships/:id
Authorization: Bearer <token>
```

### Update Dealership

```http
PUT /api/dealerships/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "+256702345678",
  "subscription_status": "suspended"
}
```

---

## Supplier (Foreign Bond) Endpoints

### Register as Supplier (Public)

```http
POST /api/foreign-bonds/register
Content-Type: application/json

{
  "company_name": "Premium Motors",
  "country": "Japan",
  "city": "Tokyo",
  "contact_person": "Tanaka Corp",
  "phone": "+81312345678",
  "email": "info@premiumtoyota.jp",
  "contact_phone": "+81312345678",
  "contact_email": "sales@premiumtoyota.jp",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "message": "Registration successful",
  "foreign_bond_id": 3,
  "email": "info@premiumtoyota.jp",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Get All Suppliers (Admin Only)

```http
GET /api/foreign-bonds
Authorization: Bearer <admin_token>
```

### Get Supplier by ID

```http
GET /api/foreign-bonds/:id
Authorization: Bearer <token>
```

### Update Supplier Profile

```http
PUT /api/foreign-bonds/:id
Authorization: Bearer <supplier_token>
Content-Type: application/json

{
  "company_name": "Updated Company Name",
  "phone": "+81398765432",
  "country": "USA"
}
```

---

## Import Order Endpoints

### Create Order (Dealership Only)

Dealerships create orders requesting vehicles from suppliers.

```http
POST /api/import-orders
Authorization: Bearer <dealership_token>
Content-Type: application/json

{
  "foreign_bond_id": 3,
  "vehicle_ids": [1, 2, 3],
  "vehicle_quantities": {
    "1": 2,
    "2": 1,
    "3": 3
  },
  "total_amount_usd": 45000,
  "notes": "Please prioritize delivery in Q1"
}
```

**Response**:
```json
{
  "data": {
    "id": 42,
    "order_number": "ORD-12A34B",
    "foreign_bond_id": 3,
    "dealership_id": 5,
    "order_status": "Pending",
    "total_amount_usd": 45000,
    "created_at": "2024-01-28T10:30:00Z"
  }
}
```

**Workflow**: 
1. Dealership creates order (Pending)
2. Email notification sent to supplier
3. Supplier confirms or rejects order
4. System sends confirmation email to dealership

### Get My Orders

```http
GET /api/import-orders
Authorization: Bearer <token>
```

**Filters**:
- `status=Pending|Confirmed|Shipped|Delivered|Cancelled`
- `foreign_bond_id=<id>` (Admin only)

**Response**:
```json
{
  "data": [
    {
      "id": 42,
      "order_number": "ORD-12A34B",
      "foreign_bond_name": "Premium Motors",
      "dealership_name": "City Motors",
      "vehicle_count": 6,
      "total_amount_usd": 45000,
      "order_status": "Pending",
      "created_at": "2024-01-28"
    }
  ]
}
```

### Get Order Details

```http
GET /api/import-orders/:id
Authorization: Bearer <token>
```

**Response**:
```json
{
  "data": {
    "id": 42,
    "order_number": "ORD-12A34B",
    "vehicles": [
      {
        "id": 1,
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "ordered_quantity": 2,
        "purchase_price_usd": 8000
      }
    ],
    "total_units": 6,
    "calculated_total_amount": 45000,
    "order_status": "Pending"
  }
}
```

### Confirm Order (Supplier Only)

Supplier confirms order, triggering inventory reduction.

```http
PATCH /api/import-orders/:id/confirm
Authorization: Bearer <supplier_token>
```

**Response**:
```json
{
  "data": {
    "id": 42,
    "order_status": "Confirmed",
    "message": "Order confirmed and inventory updated"
  }
}
```

**Side Effects**:
- Vehicle quantities reduced
- Confirmation email sent to dealership
- Order moves to Confirmed status

### Update Order Status

```http
PATCH /api/import-orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Shipped"
}
```

**Valid Status Transitions**:
- Pending → Confirmed (supplier only)
- Confirmed → Shipped (supplier only)
- Shipped → At Border
- At Border → Cleared (with customs clearance)
- Cleared → Delivered

### Update Order Details

```http
PATCH /api/import-orders/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicle_ids": [1, 2, 3],
  "vehicle_quantities": { "1": 2, "2": 1, "3": 3 },
  "total_amount_usd": 50000,
  "notes": "Updated requirements"
}
```

### Delete Order (Pending Only)

```http
DELETE /api/import-orders/:id
Authorization: Bearer <dealership_token>
```

Only pending orders can be deleted. Deleting restores vehicle quantities.

---

## Shipping Endpoints

### Create Shipping Record

```http
POST /api/shipping
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_id": 42,
  "vessel_name": "MV Ocean Express",
  "bl_number": "BL123456789",
  "container_number": "CONT123456",
  "departure_port": "Yokohama",
  "arrival_port": "Mombasa",
  "estimated_arrival": "2024-02-15",
  "actual_arrival": null
}
```

**Response**:
```json
{
  "data": {
    "id": 1,
    "order_id": 42,
    "vessel_name": "MV Ocean Express",
    "shipping_status": "In Transit",
    "created_at": "2024-01-28"
  }
}
```

### Get Shipping Records

```http
GET /api/shipping?order_id=42&status=In Transit
Authorization: Bearer <token>
```

### Update Shipping Status

```http
PATCH /api/shipping/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Arrived",
  "actual_arrival": "2024-02-14"
}
```

---

## Border Clearance Endpoints

### Create Border Clearance Record

```http
POST /api/border-clearance
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_id": 42,
  "border_point": "Malaba",
  "ura_declaration_number": "URA123456",
  "inspector_name": "John Inspector",
  "clearance_status": "Pending",
  "notes": "Awaiting final inspection"
}
```

### Get Clearance Records

```http
GET /api/border-clearance?order_id=42
Authorization: Bearer <token>
```

### Update Clearance Status

```http
PATCH /api/border-clearance/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "clearance_status": "Cleared",
  "cleared_at": "2024-02-15T14:30:00Z"
}
```

---

## Subscription Endpoints

### Get Subscription Details

```http
GET /api/subscriptions
Authorization: Bearer <token>
```

**Response**:
```json
{
  "data": {
    "dealership_id": 5,
    "subscription_plan": "professional",
    "subscription_status": "active",
    "subscription_amount": 199,
    "billing_date": "2024-01-15",
    "renewal_date": "2024-02-15",
    "max_orders": 50,
    "max_users": 5
  }
}
```

### Initiate Payment (Mobile Money)

```http
POST /api/subscriptions/payment/mobile-money
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone_number": "+256700123456",
  "plan": "professional",
  "duration_months": 1
}
```

**Response**:
```json
{
  "success": true,
  "payment_url": "https://checkout.flutterwave.com/v3/hosted/...",
  "tx_ref": "TXN-5-1706430600000",
  "amount": 199
}
```

### Initiate Payment (Card)

```http
POST /api/subscriptions/payment/card
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@dealership.com",
  "plan": "professional",
  "duration_months": 1
}
```

### Verify Payment

```http
POST /api/subscriptions/verify-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "transaction_id": "1234567890"
}
```

---

## Inventory Endpoints

### Get Inventory

```http
GET /api/inventory?make=Toyota&model=Camry&status=Available
Authorization: Bearer <token>
```

### Get Reference Data

```http
GET /api/reference-data/makes
GET /api/reference-data/models?make_id=1
```

---

## Error Handling

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request format and required fields |
| 401 | Unauthorized | Invalid or expired token |
| 403 | Forbidden | Insufficient permissions for this operation |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Invalid status transition |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Contact support |

### Example Error Response

```json
{
  "error": "Cannot mark order 'At Border' without a shipping record",
  "details": {
    "order_id": 42,
    "current_status": "Confirmed",
    "required_for_transition": "shipping_record"
  }
}
```

---

## Webhook Integration

### Subscribe to Events

Events are sent to your configured webhook URL. Include in environment:
```
WEBHOOK_URL=https://your-domain.com/webhooks/cartrack
```

### Event Types

**Order Events**:
- `order.created` - New order created by dealership
- `order.confirmed` - Supplier confirmed order
- `order.shipped` - Order marked as shipped
- `order.cleared` - Customs clearance completed

**Payment Events**:
- `payment.success` - Subscription payment successful
- `payment.failed` - Subscription payment failed

### Webhook Payload

```json
{
  "event": "order.confirmed",
  "timestamp": "2024-01-28T10:30:00Z",
  "data": {
    "id": 42,
    "order_number": "ORD-12A34B",
    "dealership_id": 5,
    "order_status": "Confirmed",
    "total_amount_usd": 45000
  }
}
```

### Verifying Webhook Signature

```javascript
// Node.js example
const crypto = require('crypto');

function verifySignature(payload, signature) {
  const hash = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}
```

---

## Rate Limiting

- **General endpoints**: 60 requests per minute
- **Payment endpoints**: 10 requests per minute
- **Webhook retries**: 3 times with exponential backoff

---

## Best Practices

1. **Always include error handling** in your API calls
2. **Use pagination** for list endpoints (limit, offset)
3. **Cache reference data** (makes, models) with 1-hour TTL
4. **Retry failed requests** with exponential backoff
5. **Monitor webhook delivery** and implement retry logic
6. **Use webhooks** instead of polling for status updates
7. **Keep tokens secure** - never expose in logs or client-side code
8. **Implement request signing** for sensitive operations

---

## Support & Documentation

- **Documentation**: https://cartrack-ug.com/api-docs
- **Status Page**: https://status.cartrack-ug.com
- **Support Email**: support@cartrack-ug.com
- **API Issues**: GitHub Issues (private repo)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-28 | Initial API release |

