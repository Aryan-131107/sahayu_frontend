# Sahāyu API Contract

> **Source of truth:** Current FastAPI backend
>
> **Purpose:** This document tells the frontend exactly how to communicate with the backend.
>
> **Important:** The current backend does **not yet have authentication**. Authentication and `/me` endpoints will be added in a later integration step. Do not invent those endpoints in the frontend until they are added here.

---

# 1. Base URLs

## Development

```text
http://127.0.0.1:8000
```

## Production

```text
TBD — will be updated after Render deployment
```

## Swagger

```text
http://127.0.0.1:8000/docs
```

---

# 2. Current Authentication Status

Current backend:

```text
Authentication: NOT IMPLEMENTED YET
```

Therefore, current endpoints do **not** require:

```text
Authorization: Bearer <token>
```

### Planned

We will later add authentication and change protected endpoints to use the authenticated user's identity instead of accepting customer/worker IDs from the frontend.

---

# 3. Standard Error Format

FastAPI errors currently use:

```json
{
  "detail": "Description of the error"
}
```

Common status codes:

```text
200  Success
201  Created
400  Bad Request
404  Not Found
409  Conflict
422  Validation Error
500  Server Error
```

---

# 4. System API

## GET /health

### Purpose

Check whether the API and PostgreSQL database are available.

### Request

No body or parameters.

### Response

```json
{
  "status": "healthy",
  "database": "connected",
  "postgres_version": "..."
}
```

---

## GET /

### Purpose

Basic API information.

### Response

```json
{
  "message": "Cooperative Gig Services API is running.",
  "docs": "/docs",
  "redoc": "/redoc",
  "health": "/health"
}
```

---

# 5. Skills API

## GET /skills

### Purpose

Return all skill categories.

### Request

No parameters.

### Response

```json
[
  {
    "skill_id": 1,
    "skill_name": "Electrician"
  }
]
```

---

# 6. Services API

## GET /services

### Purpose

Return all available services with their linked skill information.

### Request

No parameters.

### Response

```json
[
  {
    "service_id": 1,
    "service": "Fan Installation",
    "description": "Installation of ceiling and wall fans",
    "base_price": 400.0,
    "skill_id": 1,
    "skill": {
      "skill_id": 1,
      "skill_name": "Electrician"
    }
  }
]
```

---

## GET /services/{service_id}

### Purpose

Return one service by ID.

### Path parameter

```text
service_id: integer
```

### Example

```text
GET /services/1
```

### Response

```json
{
  "service_id": 1,
  "service": "Fan Installation",
  "description": "Installation of ceiling and wall fans",
  "base_price": 400.0,
  "skill_id": 1,
  "skill": {
    "skill_id": 1,
    "skill_name": "Electrician"
  }
}
```

---

# 7. Customer API

## POST /customers

### Purpose

Create a customer record.

### Authentication

Not implemented yet.

### Request body

```json
{
  "name": "Rahul Verma",
  "phone": "9876543210",
  "email": "rahul@example.com"
}
```

### Fields

```text
name   string   required   1–100 characters
phone  string   required   10–15 characters
email  string   optional   max 150 characters
```

### Response

```json
{
  "customer_id": 1,
  "name": "Rahul Verma",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "created_at": "2026-08-29T10:00:00"
}
```

---

## GET /customers/{customer_id}

### Purpose

Get a customer profile by ID.

### Path parameter

```text
customer_id: integer
```

### Example

```text
GET /customers/1
```

### Response

```json
{
  "customer_id": 1,
  "name": "Rahul Verma",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "created_at": "2026-08-29T10:00:00"
}
```

---

# 8. Worker API

## GET /workers

### Purpose

List workers.

### Query parameter

```text
active_only: boolean
```

Default:

```text
true
```

### Example

```text
GET /workers
GET /workers?active_only=false
```

### Response

```json
[
  {
    "worker_id": 1,
    "name": "Rajesh Kumar",
    "phone": "9876543210",
    "experience_years": 5,
    "latitude": 23.1815,
    "longitude": 79.9864,
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-08-20T10:00:00"
  }
]
```

---

## GET /workers/{worker_id}

### Purpose

Get one worker's profile.

### Path parameter

```text
worker_id: integer
```

### Example

```text
GET /workers/1
```

### Response

```json
{
  "worker_id": 1,
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "experience_years": 5,
  "latitude": 23.1815,
  "longitude": 79.9864,
  "is_verified": true,
  "is_active": true,
  "created_at": "2026-08-20T10:00:00"
}
```

---

## GET /workers/search

### Purpose

Find active workers by exact skill name.

### Query parameter

```text
skill: string
```

### Example

```text
GET /workers/search?skill=Electrician
```

### Response

```json
[
  {
    "worker_id": 1,
    "name": "Rajesh Kumar",
    "phone": "9876543210",
    "experience_years": 5,
    "latitude": 23.1815,
    "longitude": 79.9864,
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-08-20T10:00:00"
  }
]
```

---

# 9. Worker Recommendation API

## GET /workers/recommend

### Purpose

This is the **main matching endpoint**.

It:

1. Finds the skill required by the service.
2. Finds active and available workers with that skill.
3. Calculates Haversine distance.
4. Gets worker average ratings.
5. Calculates the recommendation score.
6. Returns workers ranked by score.

### Query parameters

```text
service_id   integer   required
latitude     float     required
longitude    float     required
top_n        integer   optional, default 5, range 1–20
```

### Example

```text
GET /workers/recommend?service_id=1&latitude=23.1815&longitude=79.9864&top_n=5
```

### Response

```json
{
  "recommendations": [
    {
      "worker_id": 1,
      "name": "Rajesh Kumar",
      "experience_years": 5,
      "is_verified": true,
      "is_available": true,
      "distance_km": 1.82,
      "average_rating": 4.8,
      "recommendation_score": 0.91,
      "relevant_skill": "Electrician"
    }
  ]
}
```

### Important frontend rule

The frontend should use:

```text
recommendations
```

from the response.

Do NOT assume the response itself is a direct array.

### Recommendation score

Current backend uses:

```text
Distance       30%
Rating         25%
Experience     20%
Verification   15%
Availability   10%
```

The score is returned from `0.0` to `1.0`.

---

# 10. Worker Availability API

## PATCH /workers/{worker_id}/availability

### Purpose

Update whether a worker is currently available.

### Path parameter

```text
worker_id: integer
```

### Request body

```json
{
  "is_available": true
}
```

### Response

```json
{
  "worker_id": 1,
  "is_available": true,
  "updated_at": "2026-08-29T10:00:00"
}
```

### Important

Later, this endpoint should be protected so a worker can only change their own availability.

---

# 11. Booking API

## POST /bookings

### Purpose

Create a new service booking.

### Current authentication

Not implemented.

### Current request body

```json
{
  "customer_id": 1,
  "worker_id": 3,
  "service_id": 1,
  "service_lat": 23.1815,
  "service_lon": 79.9864,
  "amount": 400.0
}
```

### Fields

```text
customer_id   integer   required
worker_id     integer   required
service_id    integer   required
service_lat   float     optional
service_lon   float     optional
amount        float     required and > 0
```

### Response

```json
{
  "booking_id": 101,
  "customer_id": 1,
  "worker_id": 3,
  "service_id": 1,
  "booking_date": "2026-08-29",
  "service_lat": 23.1815,
  "service_lon": 79.9864,
  "status": "PENDING",
  "payment_status": "PENDING",
  "amount": 400.0
}
```

### Backend validations

Booking creation checks:

```text
✓ Customer exists
✓ Worker exists
✓ Service exists
✓ Worker has required skill
✓ Worker is active
✓ Worker is available
```

---

## GET /bookings/{booking_id}

### Purpose

Get one booking by ID.

### Example

```text
GET /bookings/101
```

### Response

```json
{
  "booking_id": 101,
  "customer_id": 1,
  "worker_id": 3,
  "service_id": 1,
  "booking_date": "2026-08-29",
  "service_lat": 23.1815,
  "service_lon": 79.9864,
  "status": "PENDING",
  "payment_status": "PENDING",
  "amount": 400.0
}
```

---

# 12. Booking Lifecycle APIs

The booking status flow is:

```text
PENDING
   ↓
ACCEPTED
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

Cancellation is allowed from:

```text
PENDING → CANCELLED
ACCEPTED → CANCELLED
```

---

## PATCH /bookings/{booking_id}/accept

### Purpose

Worker accepts a pending booking.

### Response

Returns the updated booking.

### Side effect

Worker availability becomes:

```text
false
```

---

## PATCH /bookings/{booking_id}/start

### Purpose

Worker starts an accepted booking.

### Required current status

```text
ACCEPTED
```

### New status

```text
IN_PROGRESS
```

---

## PATCH /bookings/{booking_id}/complete

### Purpose

Complete an in-progress booking.

### Required current status

```text
IN_PROGRESS
```

### New status

```text
COMPLETED
```

### Side effects

```text
Worker availability → true
Payment status → PAID
```

---

## PATCH /bookings/{booking_id}/cancel

### Purpose

Cancel a booking.

### Allowed current states

```text
PENDING
ACCEPTED
```

### New status

```text
CANCELLED
```

If the booking was already accepted, worker availability becomes:

```text
true
```

---

# 13. Reviews API

## POST /reviews

### Purpose

Submit a rating and review for a completed booking.

### Request body

```json
{
  "booking_id": 101,
  "customer_id": 1,
  "rating": 5.0,
  "review": "Excellent work, very professional!"
}
```

### Validation

```text
rating: 1.0–5.0
booking must exist
booking must be COMPLETED
booking must belong to customer_id
booking cannot already have a review
```

### Response

```json
{
  "review_id": 1,
  "booking_id": 101,
  "rating": 5.0,
  "review": "Excellent work, very professional!"
}
```

---

## GET /workers/{worker_id}/reviews

### Purpose

Get reviews and current average rating for a worker.

### Example

```text
GET /workers/3/reviews
```

### Response

```json
{
  "worker_id": 3,
  "worker_name": "Rajesh Kumar",
  "average_rating": 4.8,
  "total_reviews": 25,
  "reviews": [
    {
      "review_id": 1,
      "booking_id": 101,
      "rating": 5.0,
      "review": "Excellent work!"
    }
  ]
}
```

---

# 14. Frontend → Backend Main Flow

The frontend should eventually follow this flow:

```text
Customer
   ↓
GET /services
   ↓
Customer selects service
   ↓
GET /workers/recommend
   ↓
Display ranked workers
   ↓
GET /workers/{worker_id}
   ↓
Display worker details
   ↓
POST /bookings
   ↓
Booking created
   ↓
GET /bookings/{booking_id}
   ↓
Display booking status
```

Worker flow:

```text
Worker
   ↓
GET /workers/{worker_id}
   ↓
PATCH /workers/{worker_id}/availability
   ↓
GET /bookings/...       ← planned endpoint
   ↓
PATCH /bookings/{id}/accept
   ↓
PATCH /bookings/{id}/start
   ↓
PATCH /bookings/{id}/complete
```

---

# 15. Endpoints To Be Added Before Frontend Integration

These are **NOT current endpoints**. They are required for the planned authenticated frontend.

## Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

## Customer

```text
GET /customers/me
```

## Worker

```text
GET /workers/me
PATCH /workers/me/availability
```

## Customer bookings

```text
GET /bookings/customer/me
```

## Worker bookings

```text
GET /bookings/worker/me
```

These should be added only after we implement authentication.

---

# 16. Important Contract Rules

### Rule 1

Frontend must not directly access PostgreSQL.

```text
React → FastAPI → PostgreSQL
```

### Rule 2

Frontend must not invent endpoint names.

If an endpoint is not in this contract, ask the backend developer first.

### Rule 3

Backend changes that affect request/response formats must update this file.

### Rule 4

IDs are integers:

```text
customer_id
worker_id
service_id
booking_id
skill_id
```

### Rule 5

Booking statuses are uppercase:

```text
PENDING
ACCEPTED
IN_PROGRESS
COMPLETED
CANCELLED
```

### Rule 6

Recommendation response is wrapped:

```json
{
  "recommendations": [...]
}
```

not:

```json
[...]
```

---

# 17. Environment Variables

## Frontend

```env
VITE_API_URL=http://127.0.0.1:8000
```

Production will later become:

```env
VITE_API_URL=https://YOUR-RENDER-BACKEND.onrender.com
```

## Backend

Keep database credentials and secrets in `.env`.

Never put secrets in this contract or GitHub.

---

# 18. Contract Status

Current:

```text
✓ Services API
✓ Skills API
✓ Customers API
✓ Workers API
✓ Worker search
✓ Worker recommendation
✓ Worker availability
✓ Booking creation
✓ Booking lifecycle
✓ Reviews
✓ Health check

✗ Authentication
✗ Current-user endpoints
✗ Customer booking list
✗ Worker booking list
✗ Worker dashboard API
```

Next backend work:

```text
1. Authentication
2. User/profile mapping
3. /customers/me
4. /workers/me
5. /bookings/customer/me
6. /bookings/worker/me
7. Secure protected endpoints
```
