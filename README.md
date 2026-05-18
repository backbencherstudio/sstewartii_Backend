# Project Name

 Multi-vendor-food-ordering-delivery-app-backend built with **NestJS**, **Prisma**, and **PostgreSQL**.

This repository contains the backend source code, database schema, migrations, authentication flow, vendor/customer modules, product/menu management, order management, and supporting services.

---

## Tech Stack

- **Node.js**
- **NestJS**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **JWT Authentication**
- **Role-Based Access Control**
- **Multer/File Upload**
- **Redis + BullMQ** for background jobs
- **Docker** optional for local services

---

## Main Features

### Authentication

- User registration
- Email verification with OTP
- Login with access and refresh tokens
- Role-based authentication
- Vendor and customer account support
- Background OTP email queue using BullMQ

### Vendor

- Vendor profile setup
- Service area setup
- Operation hours setup
- Vendor online/offline status
- Vendor verification flow
- Menu/product management
- Gallery management
- Vendor insights and metrics

### Customer

- Customer home screen API
- Location-based vendor discovery
- Popular cuisines
- Category browsing
- Top picks
- Recommended vendors
- Favorite vendors and products

### Product/Menu

- Product creation with images
- Global seeded categories
- Cuisine support
- Size options
- Choice options
- Add-ons
- Product status update
- Soft delete support

### Orders

- Create order
- Order summary
- Order tracking
- Vendor pending orders
- Vendor active orders
- Accept order
- Ready for pickup
- Complete order
- Cancel order
- Order history
- Vendor/customer reporting

### Reviews and Favorites

- Favorite vendors
- Favorite products
- Vendor/truck reviews
- Food reviews
- Rating aggregation support

---

## Project Structure

```txt
src/
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── media/
│   ├── storage/
│   ├── queues/
│   └── utils/
│
├── modules/
│   ├── auth/
│   ├── customer/
|   |   └── cart/
│   ├── help-center/
│   ├── order/
│   ├── product/
│   ├── review/
│   ├── vendor/
|   |   ├── kyc/
|   |   ├── profile-setup-flow/
|   |   ├── vendor/
|   |   ├── vendor-verification/
│         
├── prisma/
│   └── prisma.service.ts
│
└── main.ts
```

Each module generally follows a clean architecture style:

```txt
module/
├── application/
├── domain/
│   └── interface/
├── infrastructure/
│   ├── repositories/
│   └── mapper/
└── presentation/
    ├── dto/
    └── controller.ts
```

---

## Prerequisites

Make sure you have installed:

```bash
node -v
npm -v
```

Recommended versions:

```txt
Node.js >= 20
npm >= 10
PostgreSQL >= 14
Redis >= 7
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/sahadat96/nestjs-multi-vendor-food-ordering-delivery-app-backend.git
cd YOUR_REPOSITORY
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the project root.

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/database_name?schema=public"

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Redis / Queue
REDIS_HOST=localhost
REDIS_PORT=6379

# Mail
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_mail_user
MAIL_PASS=your_mail_password
MAIL_FROM=no-reply@example.com

# Admin Seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=Super Admin

# File Upload / Media
MEDIA_BASE_URL=http://localhost:3000
UPLOAD_DIR=uploads
```
---

## Database Setup

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Seed database:

```bash
npx prisma db seed
```
---

## Redis Setup

Using Docker:

```bash
docker run --name multi-vendor-food-ordering-redis -p 6379:6379 -d redis:7
```

Check running containers:

```bash
docker ps
```

---

## Running the Application

Development:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

---

## Maintainer

Developed and maintained by:

```txt
Sahadat Hossain
sahadatsoftdev96@gmail.com
https://github.com/sahadat96
```
