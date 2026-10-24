# Sysb International Task Management - Project & Conversation Context

> **Source**: Compiled and preserved from Previous Conversation (`ac71d249-2554-4511-89c5-2beddeb3b16a`)  
> **Last Updated**: October 24, 2026  
> **Company**: Sysb International  
> **Project**: Enterprise SaaS Task & Workforce Management Platform  

---

## 1. Product Overview & Current Identity
- **Product Name**: Sysb International Task Platform (formerly *TaskFlow* / *Muze Satwik Task Manager*)
- **Domain**: High-performance multi-tenant SaaS task & project management system with real-time updates, calendar integrations, and background job automation.
- **Client / Company**: **Sysb International**

---

## 2. Core Architecture & Tech Stack
- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS, Lucide Icons, Radix UI / shadcn components, React Query)
- **Backend / Database**: Supabase (PostgreSQL with Row Level Security - RLS, Database Triggers, Real-time Channels, Auth)
- **Background Jobs & Cron**: Inngest (`inngest/` for daily digest, recurring task spawning, deadline reminders, Google Calendar sync, webhook dispatchers)
- **Notifications**: Web Push (VAPID via Service Worker `public/sw.js`), Resend for email notifications
- **Deployment**: Cloudflare Pages / Vercel

---

## 3. Key Features Implemented to Date

### A. Role-Based Access Control (RBAC)
- **Roles**:
  - `admin`: Full visibility across all organizations, departments, managers, employees, and tasks.
  - `manager`: Oversees projects, manages assigned team members (employees), reviews tasks submitted for approval, creates and monitors recurring schedules.
  - `employee` / `doer`: Dedicated view focused on their assigned tasks, status updates (`todo` -> `in_progress` -> `review`), and personal productivity.
- **Workload Heatmap & Team Bandwidth**:
  - Located in [WorkloadHeatmap.tsx](file:///d:/Desktop/task-scheduler/src/components/dashboard/WorkloadHeatmap.tsx)
  - Capacity calculation based on active tasks and overdue counts.
  - Dynamic filtering by role (Managers vs Employees) and workload level (Available, Optimal, Overloaded).

### B. Daily Recurring Task Engine
- Managers/Admins can configure master tasks as daily recurring.
- Inngest background cron automatically spawns fresh daily task instances for the assignee.
- Pause / Resume controls with status badges.

### C. Organizations & Multi-Department Architecture
- Organizations and departments structure implemented via Supabase migration `007_add_organizations_departments.sql`.
- Organization switcher context ([OrganizationContext.tsx](file:///d:/Desktop/task-scheduler/src/contexts/OrganizationContext.tsx)).

### D. PWA & Web Push Notifications
- Service Worker registration ([sw.js](file:///d:/Desktop/task-scheduler/public/sw.js), [SWRegister.tsx](file:///d:/Desktop/task-scheduler/src/components/providers/SWRegister.tsx)).
- Push notification subscription management ([PushManager.tsx](file:///d:/Desktop/task-scheduler/src/components/pwa/PushManager.tsx), [push.ts](file:///d:/Desktop/task-scheduler/src/lib/push.ts)).

### E. Defensive Null-Safety & Client Stability
- Hardened all dashboard tables ([EmployeePerformanceTable.tsx](file:///d:/Desktop/task-scheduler/src/components/dashboard/EmployeePerformanceTable.tsx), [OverdueTable.tsx](file:///d:/Desktop/task-scheduler/src/components/dashboard/OverdueTable.tsx), [UpcomingDeadlines.tsx](file:///d:/Desktop/task-scheduler/src/components/dashboard/UpcomingDeadlines.tsx), [ProjectList.tsx](file:///d:/Desktop/task-scheduler/src/components/project/ProjectList.tsx)) to guarantee no client exceptions occur when users or fields are missing/unassigned.

### F. Theme System & Ergonomics
- Multiple curated visual color themes via [ColorThemeContext.tsx](file:///d:/Desktop/task-scheduler/src/contexts/ColorThemeContext.tsx) (Aurora, Ocean, Emerald, Sunset, Cyberpunk, Midnight, Ruby, Slate).
- Collapsible sidebar with keyboard shortcut (`Ctrl+B`) and quick toggle buttons.

---

## 4. User Preferences & Strict Guidelines

1. **Language & Tone**:
   - **Strict English Only**: This is a production enterprise SaaS product. No Hindi or Hinglish words anywhere in the UI, toasts, modal dialogues, or codebase.
   - Professional, concise, enterprise-grade terminology.

2. **Branding**:
   - Company: **Sysb International**
   - Must include animated startup/splash screen on initial launch with the Sysb International identity.
   - All legacy naming (*TaskFlow*, *Task Manager*, *Muze Satwik*) to be completely updated.

---

## 5. Active & Pending Tasks

1. **Sysb International Rebranding**:
   - [ ] Update [Sidebar.tsx](file:///d:/Desktop/task-scheduler/src/components/layout/Sidebar.tsx) & [Header.tsx](file:///d:/Desktop/task-scheduler/src/components/layout/Header.tsx) brand name & logos.
   - [ ] Update [layout.tsx](file:///d:/Desktop/task-scheduler/src/app/layout.tsx) metadata & titles.
   - [ ] Update [login/page.tsx](file:///d:/Desktop/task-scheduler/src/app/(auth)/login/page.tsx).
   - [ ] Update [manifest.json](file:///d:/Desktop/task-scheduler/public/manifest.json) & PWA configs.
   - [ ] Update Inngest configuration & notification email templates.

2. **Startup Logo Splash Animation**:
   - [ ] Implement a smooth, modern Sysb International logo animation splash component displayed during app loading / authentication verification.

3. **Hindi Words Elimination**:
   - [ ] Clean up [TaskDetail.tsx](file:///d:/Desktop/task-scheduler/src/components/task/TaskDetail.tsx) (remove `(Band Karein)`, `(Shuru Karein)`, `(Band Hai)`).
   - [ ] Audit remaining files to ensure 100% clean English text throughout.
