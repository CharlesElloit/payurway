# PayMyBills - Mobile Money Payment Interface

## Overview

PayMyBills is a streamlined mobile money payment platform that simplifies the way users send and receive payments via telecom mobile money services like **MTN Mobile Money** and **Airtel Money**. The platform eliminates the hassle of dialing USSD codes manually by providing a seamless, QR-code-based payment experience.

Users link their mobile money accounts once, authenticate during the initial setup, and enjoy frictionless payment processing thereafter. The system uses **QR codes as a one-way receiving mechanism** — payers scan the recipient's QR code using a dedicated scanner to initiate payment, while the recipient never needs to share sensitive account details.

## Key Features

- **Multi-Carrier Support**: Works with MTN Mobile Money, Airtel Money, and extensible to other carriers
- **One-Time Authentication**: Users authenticate once during account linking; subsequent payments require no re-authentication
- **QR Code Payments**: Recipients generate static/dynamic QR codes; payers scan them via a dedicated in-app scanner
- **Secure Account Linking**: Encrypted mobile money number linking with tokenized credentials
- **Payment History & Tracking**: Full transaction history with receipts and status tracking
- **Real-Time Notifications**: Push notifications for payment confirmations and requests
- **Offline QR Codes**: QR codes can be saved as images for offline acceptance

## Project Structure

```
backend/
├── README.md
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route handlers
│   ├── middleware/        # Auth, validation, error handling
│   ├── models/           # Database models
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   └── app.js            # Application entry point
├── migrations/           # Database migrations
├── seeds/                # Seed data
├── tests/                # Test suites
├── docs/                 # API documentation
├── .env.example          # Environment variable template
├── package.json          # Dependencies
└── Dockerfile            # Container configuration
```

---

## Technology Recommendations

### Recommended Language: **Node.js (JavaScript/TypeScript)**

**Why Node.js?**

| Criteria | Rationale |
|----------|-----------|
| **Async I/O** | Payment APIs are heavily I/O-bound; Node.js handles concurrent API calls to telecom providers efficiently |
| **Ecosystem** | Rich npm ecosystem with payment SDKs, QR code libraries, and HTTP clients |
| **Speed to Market** | JavaScript is widely known, enabling faster development cycles |
| **JSON Native** | REST APIs return JSON; Node.js handles JSON natively without conversion overhead |
| **Scalability** | Non-blocking event loop scales well for handling many simultaneous payment requests |

**Strong Alternative: Python (FastAPI/Django)**

Python is an excellent alternative if the team prefers it. FastAPI provides automatic OpenAPI documentation, type safety via Pydantic, and async support that rivals Node.js performance. Django adds a mature ORM and built-in admin panel.

### Recommended Architecture: **Modular Monolith with Service Layer**

For an MVP, a **modular monolith** is strongly recommended over microservices. A monolith reduces operational complexity, simplifies deployment, and can be decomposed into microservices later if scale demands it.

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  Mobile App (React Native / Flutter)                 │
│  Web App (React / Next.js)                           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  API GATEWAY                         │
│  Rate Limiting │ Auth │ Request Validation           │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               CONTROLLER LAYER                       │
│  AuthController │ PaymentController │ UserController │
│  QRController   │ WebhookController                 │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                SERVICE LAYER                         │
│  AuthService       │ PaymentService                 │
│  AccountService    │ QRCodeService                  │
│  NotificationService│ CarrierGatewayService         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              CARRIER GATEWAY LAYER                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ MTN MoMo API│  │Airtel Money │  │  (Future)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               DATA LAYER                             │
│  PostgreSQL │ Redis │ S3/Cloud Storage               │
└─────────────────────────────────────────────────────┘
```

### Database: **PostgreSQL**

- ACID compliance is critical for financial transactions
- Strong support for complex queries on transaction data
- JSONB columns for flexible metadata storage
- Row-level security for multi-tenant data isolation

### Cache Layer: **Redis**

- Session/token storage for fast auth checks
- Rate limiting counters
- QR code temporary data caching
- Real-time payment status polling

### Queue System: **BullMQ (Redis-backed)**

- Async processing of payment requests
- Retry logic for failed telecom API calls
- Webhook delivery queues
- Notification dispatch queues

---

## API Endpoints

### Authentication & User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new user account |
| `POST` | `/api/v1/auth/login` | User login (email/phone + OTP) |
| `POST` | `/api/v1/auth/verify-otp` | Verify OTP during registration/login |
| `POST` | `/api/v1/auth/refresh-token` | Refresh JWT access token |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token |

### Mobile Money Account Linking

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/accounts/link` | Link a mobile money number (triggers verification) |
| `POST` | `/api/v1/accounts/verify` | Verify ownership via micro-deposit or OTP |
| `GET` | `/api/v1/accounts` | List all linked accounts |
| `GET` | `/api/v1/accounts/:id` | Get details of a linked account |
| `DELETE` | `/api/v1/accounts/:id` | Unlink a mobile money account |
| `PATCH` | `/api/v1/accounts/:id/default` | Set a linked account as default |

### QR Code Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/qr/generate` | Generate a QR code for receiving payment |
| `GET` | `/api/v1/qr/:codeId` | Retrieve QR code data by ID |
| `POST` | `/api/v1/qr/scan` | Process a scanned QR code (payer action) |
| `GET` | `/api/v1/qr/history` | Get history of generated QR codes |
| `DELETE` | `/api/v1/qr/:codeId` | Revoke/deactivate a QR code |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/payments/initiate` | Initiate a payment (from scanned QR or manual) |
| `GET` | `/api/v1/payments/:id` | Get payment status and details |
| `GET` | `/api/v1/payments` | List user's payment history |
| `POST` | `/api/v1/payments/:id/cancel` | Cancel a pending payment |
| `POST` | `/api/v1/payments/request` | Request payment from another user |

### Webhooks (for Telecom Callbacks)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/webhooks/mtn` | MTN MoMo payment callback |
| `POST` | `/api/v1/webhooks/airtel` | Airtel Money payment callback |
| `POST` | `/api/v1/webhooks/status` | Payment status update callback |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notifications` | Get user notifications |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark notification as read |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all as read |
| `PUT` | `/api/v1/notifications/preferences` | Update notification settings |

### Admin (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/transactions` | View all transactions |
| `GET` | `/api/v1/admin/users` | View all users |
| `GET` | `/api/v1/admin/analytics` | Platform analytics |
| `POST` | `/api/v1/admin/carriers` | Add/manage carrier configurations |

---

## Payment Flow

### Receiving Payment (QR Code Flow)

```
RECEIVER                           SYSTEM                          PAYER
   │                                 │                               │
   ├── 1. Generate QR Code ─────────>│                               │
   │                                 ├── Store QR data (amount,      │
   │                                 │   receiver ID, expiry)        │
   │<── 2. Return QR Image ─────────┤                               │
   │                                 │                               │
   │   [Displays QR to payer]        │                               │
   │                                 │<── 3. Scan QR Code ──────────┤
   │                                 │                               │
   │                                 ├── 4. Decode & Validate ──────>│
   │                                 │                               │
   │                                 │<── 5. Confirm Payment ───────┤
   │                                 │                               │
   │                                 ├── 6. Call Carrier API ───────>│
   │                                 │   (MTN/Airtel)                │
   │                                 │                               │
   │                                 ├── 7. Process Payment ────────>│
   │                                 │                               │
   │<── 8. Notify Success ──────────┤                               │
   │                                 ├── 9. Notify Success ─────────>│
   │                                 │                               │
```

### Account Linking Flow

```
USER                               SYSTEM                    CARRIER API
 │                                     │                          │
 ├── 1. Submit MM Number ────────────>│                          │
 │                                     ├── 2. Send verification  ──>│
 │                                     │   request (micro-deposit │
 │                                     │   or OTP)                │
 │<── 3. Prompt for Verification ─────┤                          │
 │                                     │                          │
 ├── 4. Submit Verification Code ────>│                          │
 │                                     ├── 5. Verify OTP ────────>│
 │                                     │                          │
 │                                     │<── 6. Confirm ───────────┤
 │                                     │                          │
 │                                     ├── 7. Generate API token  │
 │                                     │   (store encrypted)      │
 │<── 8. Account Linked ─────────────┤                          │
```

---

## Security Considerations

| Concern | Implementation |
|---------|----------------|
| **Data Encryption** | AES-256 for data at rest; TLS 1.3 for data in transit |
| **API Authentication** | JWT access tokens (15min) + refresh tokens (7 days) |
| **OTP Verification** | 6-digit OTP with 5-minute expiry and 3-attempt lock |
| **QR Code Security** | Time-limited QR codes (5-10 min expiry), single-use tokens |
| **Rate Limiting** | 100 requests/min per user; stricter limits on auth endpoints |
| **Carrier Credentials** | Stored encrypted in database; decrypted only at runtime |
| **Payment Verification** | Double-verification via carrier callback + status polling |
| **Input Validation** | Schema validation on all inputs (Joi/Zod) |
| **SQL Injection Prevention** | Parameterized queries via ORM (Prisma/Sequelize) |
| **Logging** | Structured logging for audit trails; no sensitive data in logs |

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/paymybills

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# MTN Mobile Money API
MTN_API_KEY=your_mtn_api_key
MTN_API_URL=https://proxy.momoapi.mtn.com
MTN_SUBSCRIPTION_KEY=your_subscription_key
MTN_CALLBACK_URL=https://yourdomain.com/api/v1/webhooks/mtn

# Airtel Money API
AIRTEL_API_KEY=your_airtel_api_key
AIRTEL_API_URL=https://openapi.airtel.africa
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
AIRTEL_CALLBACK_URL=https://yourdomain.com/api/v1/webhooks/airtel

# OTP Service
OTP_PROVIDER=twilio  # or africastalking, termii
OTP_EXPIRY=300

# QR Code
QR_CODE_EXPIRY=600
QR_CODE_SECRET=your_qr_signing_secret

# File Storage
AWS_S3_BUCKET=paymybills-qr-codes
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0
- npm or yarn

### Installation

```bash
# Clone and navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npx prisma migrate dev  # if using Prisma
# OR
npx sequelize-cli db:migrate  # if using Sequelize

# Seed initial data
npm run seed

# Start development server
npm run dev
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

---

## Recommended Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| **ORM** | Prisma | Type-safe, auto-generated migrations |
| **Validation** | Zod | TypeScript-first schema validation |
| **QR Generation** | `qrcode` + `qr-scanner` | Generate + scan QR codes |
| **HTTP Client** | Axios | For carrier API calls |
| **Queue** | BullMQ | Redis-backed job queues |
| **Logger** | Pino | Fast, structured JSON logging |
| **Auth** | `jsonwebtoken` + `bcryptjs` | JWT tokens + password hashing |
| **Notifications** | Firebase Admin | Push notifications |
| **SMS/OTP** | Termii or Africa's Talking | African-focused OTP delivery |

---

## Future Considerations

1. **Microservices Migration**: When scale requires it, decompose into independent services (Auth, Payment, Notification, Carrier Gateway)
2. **Multiple Region Support**: Support carriers in other African countries (Safaricom M-Pesa, etc.)
3. **Merchant Tools**: Business accounts with invoicing, bulk payments, and analytics
4. **Webhooks for Third-Party Integration**: Allow external systems to subscribe to payment events
5. **Offline Mode**: Cache QR codes for offline payment acceptance with later reconciliation
6. **AI-Powered Fraud Detection**: ML models to detect suspicious transaction patterns
7. **Web3 Integration**: Future consideration for crypto-to-mobile-money on/off ramps

---

## License

Private - All rights reserved.
