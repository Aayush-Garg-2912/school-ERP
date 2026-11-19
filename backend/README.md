# School ERP Backend

Backend for a multi-school School ERP with RBAC, authentication, academic, student, teacher, parent, attendance, fees, exams, results, timetable, leave, notice and notification modules.

## Setup

1. Copy `.env.example` to `.env` and set MongoDB/JWT values.
2. Install dependencies: `npm install`
3. Seed roles and permissions: `npm run seed`
4. Start development server: `npm run dev`
5. Health check: `GET /health`

## Authentication

- `POST /api/auth/register-chairman`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Access tokens use the configured short expiry. Refresh tokens are stored hashed and rotated on every refresh.

## Main modules

- School / Academic Year
- Classes / Sections / Subjects / Class Subjects
- Staff: Principal / Admin / Accountant
- Teachers + login accounts + assignments
- Students + login accounts
- Parents + child links
- Attendance
- Fee Structures / Student Fees / Payments / Refunds
- Exams / Exam Subjects
- Results / Publish / Report Card
- Timetable with class and teacher conflict checks
- Leave / Notice / Notifications
- Reports summary

## Important

The supplied project archive contained a backend only. A frontend/admin panel is not part of this archive and will be built after the backend is stable.
