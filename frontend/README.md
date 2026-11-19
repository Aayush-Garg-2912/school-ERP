# School ERP Frontend

A enterprise-grade administrative and academic frontend for the School ERP System, built with **Next.js (App Router)** and **Ant Design (AntD)**.

---

## 🛠️ Tech Stack & Packages

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Library**: [Ant Design](https://ant.design/) (`antd`)
- **SSR Style Extraction**: `@ant-design/nextjs-registry`
- **Icons**: `@ant-design/icons`
- **HTTP Client**: [Axios](https://axios-http.com/) (with automatic token interceptor and refresh handling)
- **Date Utility**: `dayjs`

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.js              # Root layout with AntdRegistry & AuthProvider
│   │   ├── page.js                # Root redirect handler (/dashboard or /login)
│   │   ├── globals.css            # Clean resets & theme styling
│   │   ├── login/
│   │   │   └── page.js            # Authentication & sign-in portal
│   │   ├── register-chairman/
│   │   │   └── page.js            # School institution registration & onboarding
│   │   └── dashboard/
│   │       ├── layout.js          # Collapsible responsive Sider + Header with role-based menu
│   │       ├── page.js            # KPI metrics, quick actions, and recent notices
│   │       ├── students/
│   │       │   └── page.js        # Student admissions and directory
│   │       └── notices/
│   │           └── page.js        # Institutional notice board & circulars
│   ├── components/
│   │   ├── AntdConfigProvider.js  # Ant Design theme tokens and component styles
│   │   └── NotificationBell.js    # Unread counter badge and notification popover
│   ├── context/
│   │   └── AuthContext.js         # JWT auth session, user state, and RBAC helpers
│   └── lib/
│       └── api.js                 # Axios instance with 401 token refresh queue
├── .env.local                     # Environment variables (API base URL)
├── next.config.mjs                # Next.js transpilePackages & SSR configuration
└── package.json
```

---

## 🚀 Getting Started

### 1. Environment Configuration

The frontend connects to your Express API via `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 2. Start the Development Server

From the root directory:
```bash
npm run dev:frontend
```

Or directly inside the `frontend` folder:
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portal.
