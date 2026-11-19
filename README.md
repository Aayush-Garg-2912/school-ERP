# 🏫 School ERP System

A modern, enterprise-grade School Enterprise Resource Planning (ERP) platform built with **Next.js 16**, **Express.js**, and **MongoDB**. Designed for comprehensive academic administration, student lifecycle management, fee collection with automated WhatsApp slips, daily roll calls, grading, and role-tailored dashboards.

---

## 🌟 Key Features

- **Multi-Role RBAC (7 Roles, 88 Permissions)**:
  - `Chairman`: Institutional executive oversight, KPI metrics, and analytics.
  - `Principal`: Full school operations, approvals, and notices.
  - `Admin`: Admissions, staff directory, class setups, and curriculum.
  - `Accountant`: Fee heads, collection counter, receipt generation, and dues tracking.
  - `Teacher`: Attendance roll call, marks entry, class timetable, and leaves.
  - `Student`: Personal attendance logs, report cards, class schedule, and circulars.
  - `Parent`: Unified multi-child monitor (Aarav, Aditya, Pari), fee dues, and transcripts.

- **💬 WhatsApp Communications & Broadcast Hub**:
  - **Automated Birthday Engine**: Daily detection of student and staff celebrants with one-click bulk greeting dispatch.
  - **Automated Fee Receipts**: Instant WhatsApp payment receipt generated and dispatched upon fee collection.
  - **Bulk Fee Due Reminders**: Class-wise and section-wise reminders to parents with pending dues.
  - **Audience Targeting**: Broadcast to individual recipients, entire classes, all staff, or whole school.
  - **Live Preview & wa.me**: In-app mobile screen chat preview with direct Click-to-Chat links.

- **🎓 Academics & Classroom Management**:
  - Academic sessions, class sections with capacity limits, and subject curriculum.
  - Daily period timetable scheduler with clash prevention.
  - Daily roll call attendance with automatic 75% exam eligibility tracking.
  - Exam scheduling, marks entry, and printable digital report cards.

- **💰 Finance & Accounts**:
  - Flexible fee structures (Tuition, Lab, Sports, Annual).
  - Student fee ledgers (Payable, Paid, Due).
  - Multi-method collection counter (Cash, UPI, Card, Bank Transfer).
  - Official printed and WhatsApp fee receipts with unique numbers (`REC-XXXXXX`).

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Ant Design (antd 5), Axios, Day.js.
- **Backend**: Node.js, Express.js 5, Mongoose 9, JWT Authentication (dual access/refresh token rotation), Bcrypt.js, Helmet, Rate-Limiting.
- **Database**: MongoDB (Local or MongoDB Atlas).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local instance or MongoDB Atlas URI)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run seed:full   # Seeds 1,000+ students, classes, faculty, fee records
npm run dev         # Starts server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev         # Starts Next.js app on http://localhost:3000
```

---

## 🔑 Demo Login Credentials

All demo accounts use the standard password: **`Password123!`**

| Role | Name | Email / Login ID | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Chairman** | Dr. Vikram Singhania | `chairman@school.edu` | `Password123!` | Executive school analytics |
| **Principal** | Dr. Shailesh Verma | `principal@school.edu` | `Password123!` | Operational administration |
| **Admin** | Rajesh Sharma | `admin@school.edu` | `Password123!` | Full admin & admissions |
| **Accountant** | Alok Bansal | `accountant@school.edu` | `Password123!` | Fee counter & ledger |
| **Teacher** | Ananya Sen | `teacher@school.edu` | `Password123!` | Attendance & marks |
| **Student** | Aarav Sharma | `student@school.edu` | `Password123!` | Student personal portal |
| **Parent** | Ramesh Sharma | `parent@school.edu` | `Password123!` | Multi-child monitor |

---

## 📦 Deployment Instructions

- **Frontend**: Deploy on [Vercel](https://vercel.com) by pointing to the `frontend/` directory with `NEXT_PUBLIC_API_URL`.
- **Backend**: Deploy on [Render](https://render.com) or [Railway](https://railway.app) pointing to `backend/` directory.
- **Database**: Connect to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) M0 Free cluster.

---

## 📄 License
ISC License
