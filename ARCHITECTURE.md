# Muze Satwik Task Manager - Architecture Documentation

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MUSE SATWIK TASK MANAGER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   Browser    │◄──►│ Cloudflare   │◄──►│   Supabase   │◄──►│  Inngest │ │
│  │   (Next.js)  │    │   Pages      │    │  (PostgreSQL)│    │ (Jobs)   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘ │
│         │                   │                   │                   │      │
│         │                   │                   │                   │      │
│         ▼                   ▼                   ▼                   ▼      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        RESPONSIVE / PWA / OFFLINE                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │     Resend       │
                         │   (Emails)       │
                         └──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   Google APIs    │
                         │ (OAuth/Calendar) │
                         └──────────────────┘
```

---

## 🎯 Architectural Decisions

### 1. **Frontend: Next.js 14 (App Router) with Static Export**

| Decision | Rationale |
|----------|-----------|
| **Static Export (`output: 'export'`)** | Cloudflare Pages serves static assets globally with zero cold starts; no server runtime needed |
| **App Router + RSC** | React Server Components for data fetching; streaming for progressive hydration |
| **Tailwind CSS + Radix UI** | Utility-first styling + accessible, unstyled primitives; minimal bundle size |
| **Zustand + TanStack Query** | Lightweight global state + server state caching/synchronization |
| **PWA (Workbox)** | Offline-first: service worker caches shell + API responses; background sync |

**Trade-offs:**
- ✅ Zero server costs, global CDN, instant loads
- ❌ No dynamic server-side rendering (ISR not supported on Pages)
- ❌ Server Actions limited to edge-compatible APIs
- ❌ No middleware at request time (use edge functions via Inngest instead)

### 2. **Backend: Supabase (PostgreSQL + Auth + Realtime)**

| Decision | Rationale |
|----------|-----------|
| **PostgreSQL** | ACID compliance, JSONB for flexible metadata, mature ecosystem |
| **Supabase Auth** | Built-in OAuth (Google), JWT tokens, RLS integration, email/password |
| **Row Level Security (RLS)** | Database-enforced authorization; no application-layer bugs can leak data |
| **Realtime** | WebSocket subscriptions for live updates across tabs/devices |
| **Edge Functions (Deno)** | Future: move heavy computation to Supabase Edge Functions |

**Schema Highlights:**
```sql
-- Users extend auth.users via trigger
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks with RLS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority INTEGER DEFAULT 0,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  google_event_id TEXT,  -- For Calendar sync
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users only see their own tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);
```

### 3. **Background Jobs: Inngest**

| Decision | Rationale |
|----------|-----------|
| **Event-driven** | Decouples job triggering from execution; retries built-in |
| **Type-safe functions** | TypeScript SDK with Zod schemas for payload validation |
| **Cron schedules** | Declarative `cron` definitions in code; version-controlled |
| **Local dev server** | `inngest-cli dev` mirrors production locally |
| **Observability** | Dashboard shows execution traces, retries, errors |

**Key Functions:**
```typescript
// Sync task to Google Calendar
export const syncTaskToCalendar = inngest.createFunction(
  { id: 'sync-task-to-calendar', retries: 3 },
  { event: 'tasks/calendar.sync' },
  async ({ event, step }) => {
    const { taskId, userId } = event.data;
    const tokens = await step.run('get-tokens', () => getGoogleTokens(userId));
    const eventId = await step.run('create-event', () => 
      createCalendarEvent(tokens, taskId)
    );
    await step.run('update-task', () => 
      supabase.from('tasks').update({ google_event_id: eventId }).eq('id', taskId)
    );
  }
);

// Daily digest email
export const dailyDigest = inngest.createFunction(
  { id: 'daily-digest', cron: '0 7 * * *' },  // 7 AM daily
  { event: 'cron/daily-digest' },
  async ({ event, step }) => {
    const users = await step.run('get-users', () => getUsersWithPendingTasks());
    for (const user of users) {
      await step.run(`send-${user.id}`, () => sendDigestEmail(user));
    }
  }
);
```

### 4. **Email: Resend**

| Decision | Rationale |
|----------|-----------|
| **React Email** | Components for emails; preview in browser; TypeScript support |
| **Domain verification** | DKIM/SPF/DMARC for deliverability |
| **Webhooks** | Track delivery, opens, clicks via Inngest |

### 5. **Google Integration**

| Component | Purpose |
|-----------|---------|
| **OAuth 2.0** | User authentication + consent for Calendar access |
| **Calendar API** | Bidirectional sync: tasks ↔ Calendar events |
| **Token storage** | Encrypted in Supabase `user_integrations` table |

---

## 🔄 Data Flow

### 1. **User Authentication Flow**

```
User → Next.js (Client) 
  → Supabase Auth (Google OAuth) 
  → Supabase returns JWT (access_token + refresh_token)
  → Client stores token in memory + httpOnly cookie
  → All API requests include Authorization: Bearer <token>
  → Supabase validates JWT → extracts user_id → RLS policies apply
```

### 2. **Task CRUD Flow**

```
Create Task:
Client → POST /api/tasks (Server Action)
  → Validate with Zod
  → Supabase.insert({ user_id: auth.uid(), ... })
  → RLS ensures user_id = auth.uid()
  → Return created task
  → Inngest.send('tasks/calendar.sync', { taskId, userId })
  → Optimistic UI update via TanStack Query

Update Task:
Client → PATCH /api/tasks/:id
  → Supabase.update().eq('id', id).eq('user_id', auth.uid())
  → Inngest.send('tasks/calendar.sync', { taskId, userId })
  → Realtime subscription updates other tabs

Delete Task:
Client → DELETE /api/tasks/:id
  → Supabase.delete().eq('id', id).eq('user_id', auth.uid())
  → Inngest.send('tasks/calendar.delete', { eventId })
```

### 3. **Google Calendar Sync Flow**

```
Task Created/Updated:
  Inngest Function: sync-task-to-calendar
    Step 1: Get Google OAuth tokens from Supabase (decrypt)
    Step 2: Call Google Calendar API (insert/update event)
    Step 3: Store google_event_id on task
    Step 4: If failed → retry with exponential backoff (max 3)

Calendar Webhook (Google → Inngest):
  Google pushes changes → Inngest endpoint → Event: calendar/event.changed
  Inngest Function: handle-calendar-webhook
    Step 1: Verify webhook signature
    Step 2: Find task by google_event_id
    Step 3: Update task from Calendar event data
    Step 4: Broadcast via Realtime
```

### 4. **Email Notification Flow**

```
Daily Digest (Cron 7 AM):
  Inngest Function: daily-digest
    Step 1: Query users with overdue/due-today tasks
    Step 2: For each user → render React Email template
    Step 3: Send via Resend API
    Step 4: Log delivery status

Task Reminder (Event-driven):
  Inngest Function: task-reminder
    Trigger: tasks/reminder (scheduled at task.due_date - 1hr)
    Step 1: Fetch task + user preferences
    Step 2: Send email/push notification
```

---

## 🔐 Row Level Security (RLS) Deep Dive

### Why RLS?

Traditional apps enforce authorization in application code:
```typescript
// ❌ Vulnerable: forgot to check ownership
const task = await db.tasks.findById(id);
return task; // Any user can read any task!
```

With RLS, the **database** enforces it:
```sql
-- ✅ Impossible to bypass: enforced at storage layer
CREATE POLICY "Users own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);
```

### RLS Policies in This App

| Table | Policy | SQL |
|-------|--------|-----|
| `profiles` | Users read own profile | `auth.uid() = id` |
| `profiles` | Users update own profile | `auth.uid() = id` |
| `tasks` | Full CRUD own tasks | `auth.uid() = user_id` |
| `tasks` | Read shared tasks (future) | `user_id IN (SELECT shared_with FROM task_shares WHERE user_id = auth.uid())` |
| `user_integrations` | Full CRUD own integrations | `auth.uid() = user_id` |
| `notifications` | Read own notifications | `auth.uid() = user_id` |

### RLS with Service Role

Server-side admin operations (Inngest, cron) use `SUPABASE_SERVICE_ROLE_KEY`:
```typescript
// Bypasses RLS - use ONLY in trusted server environments
const admin = createClient(url, serviceRoleKey);
await admin.from('tasks').update({ ... }).eq('id', taskId);
```

**Security Rules:**
- ✅ Service role key **never** exposed to client
- ✅ Only used in Inngest functions, cron jobs, API routes with auth verification
- ✅ Audited: `grep -r "serviceRoleKey" --include="*.ts" --include="*.tsx"`

---

## ⚡ Background Job Architecture

### Inngest Function Categories

| Category | Functions | Trigger | Retry Policy |
|----------|-----------|---------|--------------|
| **Sync** | `sync-task-to-calendar`, `sync-calendar-to-task` | Event + Webhook | 3 retries, exp backoff |
| **Notifications** | `daily-digest`, `task-reminder`, `overdue-alert` | Cron + Event | 2 retries |
| **Maintenance** | `cleanup-old-notifications`, `refresh-expired-tokens` | Cron (daily) | 1 retry |
| **Analytics** | `aggregate-daily-stats` | Cron (nightly) | 1 retry |

### Reliability Patterns

```typescript
// 1. Idempotency: Use task ID as idempotency key
export const syncTask = inngest.createFunction(
  { id: 'sync-task', idempotency: 'taskId' }, // Prevents duplicate runs
  { event: 'tasks/sync' },
  async ({ event, step }) => { ... }
);

// 2. Checkpointing: Save progress for long-running jobs
export const bulkExport = inngest.createFunction(
  { id: 'bulk-export' },
  { event: 'tasks/export' },
  async ({ event, step }) => {
    const cursor = await step.run('get-cursor', () => getCursor(event.data.userId));
    const batch = await step.run('fetch-batch', () => fetchTasks(cursor));
    await step.run('process-batch', () => processBatch(batch));
    await step.run('save-cursor', () => saveCursor(batch.nextCursor));
    // If fails here, resumes from saved cursor
  }
);

// 3. Fan-out: Parallel execution with controlled concurrency
export const notifyTeam = inngest.createFunction(
  { id: 'notify-team', concurrency: 10 },
  { event: 'team/notify' },
  async ({ event, step }) => {
    const members = await step.run('get-members', () => getTeamMembers(event.data.teamId));
    await Promise.all(members.map(m => 
      step.run(`notify-${m.id}`, () => sendNotification(m))
    ));
  }
);
```

### Dead Letter Handling

Failed functions after max retries → Inngest dashboard → Manual replay or alert:
```typescript
// Alert on repeated failures
inngest.onFailure('sync-task-to-calendar', async ({ event, error }) => {
  await sendSlackAlert(`Calendar sync failed for task ${event.data.taskId}: ${error.message}`);
});
```

---

## 📈 Scaling Considerations

### Current Architecture Limits

| Component | Limit | Mitigation |
|-----------|-------|------------|
| **Cloudflare Pages** | 500 builds/month (free) | Upgrade to Pro ($20/mo) for unlimited |
| **Supabase** | 500MB DB, 2GB bandwidth (free) | Pro plan ($25/mo) for 8GB DB, 250GB bandwidth |
| **Inngest** | 100K function runs/mo (free) | Pay-per-use beyond free tier |
| **Resend** | 3K emails/mo (free) | $20/mo for 50K emails |
| **Google Calendar API** | 1M queries/day | Implement exponential backoff + caching |

### Horizontal Scaling Path

```
Phase 1 (Current):          Phase 2 (Growth):           Phase 3 (Scale):
─────────────────────       ─────────────────────       ─────────────────────
Cloudflare Pages            Cloudflare Pages             Cloudflare Pages
   │                            │                            │
Supabase (shared)        Supabase (dedicated)          Supabase (read replicas)
   │                            │                            │
Inngest (shared)         Inngest (dedicated)            Inngest (dedicated)
   │                            │                            │
Resend                   Resend + custom domain         Resend + dedicated IP
```

### Performance Optimizations

1. **Database Indexes**
```sql
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date) 
  WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_google_event ON tasks(google_event_id) 
  WHERE google_event_id IS NOT NULL;
```

2. **Query Optimization**
- Use `select('id,title,status,due_date')` instead of `select('*')`
- Paginate with cursor-based pagination (`limit(50)` + `gt('created_at', cursor)`)
- Leverage PostgREST embedded resources for joins

3. **Caching Strategy**
```
Browser (SW Cache)     → 24h for static assets, 5min for API
Cloudflare CDN         → Cache-Control headers, purge on deploy
TanStack Query         → 5min staleTime, background refetch
Supabase Realtime      → Push updates, invalidate cache
```

4. **Bundle Size**
- Code-split by route (automatic with App Router)
- Dynamic import heavy components (Calendar, Charts)
- `next/bundle-analyzer` in CI to track regression

---

## 🛡️ Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Auth (JWT)                                            │
│  ├── Access Token: 1hr expiry, RS256, includes user_id, role   │
│  ├── Refresh Token: Rotating, stored in httpOnly cookie        │
│  ├── MFA: TOTP + WebAuthn (future)                             │
│  └── Session: Server-side revocation on password change        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHORIZATION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  Row Level Security (Database-enforced)                         │
│  ├── All tables: ENABLE ROW LEVEL SECURITY                     │
│  ├── Policies: auth.uid() = user_id                            │
│  ├── Service Role: Bypasses RLS (server-only)                  │
│  └── Future: Organization-level policies                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Protection

| Data | At Rest | In Transit | Access Control |
|------|---------|------------|----------------|
| User passwords | bcrypt (Supabase) | TLS 1.3 | Never exposed |
| OAuth tokens | AES-256 (Supabase Vault) | TLS 1.3 | Service role only |
| Task data | PostgreSQL (encrypted) | TLS 1.3 | RLS + JWT |
| Email content | Resend (encrypted) | TLS 1.3 | API key |

### API Security

- **CORS**: Restricted to `NEXT_PUBLIC_APP_URL` origins
- **Rate Limiting**: Cloudflare Pages built-in + Inngest concurrency limits
- **CSP**: `Content-Security-Policy` headers via `next.config.js`
- **Secrets**: All in environment variables; never in code

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌───────┐   ┌──────────────┐
│  Push   │──►│  Lint    │──►│Typecheck│──►│ Test  │──►│    Build     │
│ (main/  │   │ (ESLint) │   │ (tsc)   │   │(vitest)│   │(next build)  │
│ develop)│   └──────────┘   └─────────┘   └───────┘   └──────┬───────┘
└─────────┘                                                    │
                                                              ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐
│   Deploy     │   │   Deploy     │   │    Inngest Deploy        │
│  Preview     │   │ Production   │   │  (production only)       │
│ (develop/PR) │   │   (main)     │   │                          │
└──────────────┘   └──────────────┘   └──────────────────────────┘
```

### Quality Gates

| Gate | Tool | Threshold |
|------|------|-----------|
| Lint | ESLint + Prettier | 0 errors, 0 warnings |
| Types | TypeScript `strict: true` | 0 errors |
| Tests | Vitest + React Testing Library | >80% coverage |
| Build | Next.js static export | Success |
| Bundle | @next/bundle-analyzer | <500KB initial JS |

---

## 📊 Monitoring & Observability

### Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Build success rate | GitHub Actions | <95% |
| Page load (LCP) | Cloudflare Web Analytics | >2.5s |
| API error rate | Supabase logs + Inngest | >1% |
| Sync failure rate | Inngest dashboard | >5% |
| Email delivery rate | Resend webhooks | <98% |
| Auth success rate | Supabase Auth logs | <99% |

### Logging Strategy

```typescript
// Structured logging (pino)
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// In Inngest functions
step.run('critical-operation', async () => {
  logger.info({ taskId, userId }, 'Starting calendar sync');
  const result = await syncCalendar(taskId);
  logger.info({ taskId, eventId: result.id }, 'Calendar sync complete');
  return result;
});
```

### Error Tracking

- **Client**: Sentry (browser) for React errors
- **Server**: Inngest dashboard for function failures
- **Database**: Supabase logs for query errors
- **Email**: Resend webhooks for bounce/complaint tracking

---

## 🔮 Future Architecture Evolution

### Near Term (3-6 months)
- [ ] **Supabase Edge Functions** for image processing, PDF generation
- [ ] **Web Push API** for native push notifications (via Inngest)
- [ ] **Shared tasks/workspaces** with invitation flow
- [ ] **Full-text search** with pgvector for semantic task search

### Medium Term (6-12 months)
- [ ] **Multi-region Supabase** for lower latency globally
- [ ] **Event sourcing** for task history/audit log
- [ ] **AI integration** (task suggestions, natural language input)
- [ ] **Native mobile** (React Native + Expo, shared codebase)

### Long Term (12+ months)
- [ ] **Plugin system** for third-party integrations
- [ ] **Real-time collaboration** (CRDTs for concurrent editing)
- [ ] **Offline-first sync engine** (custom or ElectricSQL)
- [ ] **Self-hosted option** (Docker Compose + documentation)

---

## 📁 Repository Structure

```
task-scheduler/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── icons/                      # PWA icons (SVG placeholders)
│   │   ├── icon-*.svg
│   │   └── shortcut-*.svg
│   └── screenshots/                # PWA store screenshots
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth routes (login, callback)
│   │   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── api/                    # API routes (Inngest, webhooks)
│   │   ├── layout.tsx              # Root layout + providers
│   │   └── page.tsx                # Landing page
│   ├── components/                 # React components
│   │   ├── ui/                     # Base UI (Button, Input, etc.)
│   │   ├── tasks/                  # Task-specific components
│   │   ├── calendar/               # Calendar components
│   │   └── providers/              # Context providers
│   ├── lib/                        # Utilities & config
│   │   ├── supabase/               # Supabase clients (client/server)
│   │   ├── inngest/                # Inngest client + functions
│   │   ├── google/                 # Google API clients
│   │   ├── email/                  # Resend + React Email templates
│   │   ├── utils.ts                # Shared utilities (cn, formatters)
│   │   └── validations.ts          # Zod schemas
│   ├── hooks/                      # Custom React hooks
│   │   ├── useTasks.ts
│   │   ├── useAuth.ts
│   │   └── useCalendarSync.ts
│   ├── store/                      # Zustand stores
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── types/                      # TypeScript types
│   │   ├── supabase.ts             # Generated from Supabase
│   │   ├── tasks.ts
│   │   └── google.ts
│   └── styles/                     # Global styles
│       └── globals.css
├── supabase/
│   ├── migrations/                 # SQL migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_integrations.sql
│   └── seed.sql                    # Development seed data
├── inngest/
│   └── functions/                  # Inngest function definitions
│       ├── calendar-sync.ts
│       ├── notifications.ts
│       └── maintenance.ts
├── .env.example                    # Environment template
├── wrangler.toml                   # Cloudflare Pages config
├── next.config.js                  # Next.js config (static export)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── SETUP.md                        # This setup guide
└── ARCHITECTURE.md                 # This file
```

---

## 📝 Decision Log

| Date | Decision | Context | Alternatives Considered |
|------|----------|---------|------------------------|
| 2026-09-23 | Static export on Cloudflare Pages | Cost, performance, simplicity | Vercel (ISR), Netlify, AWS Amplify |
| 2026-09-23 | Supabase for auth + DB + RLS | Integrated auth+DB, RLS, generous free tier | Firebase, PlanetScale + Clerk, Neon + Auth.js |
| 2026-09-23 | Inngest for background jobs | Type-safe, local dev, cron, observability | BullMQ (Redis), Temporal, Cloudflare Queues |
| 2026-09-23 | Resend for email | React Email, great DX, deliverability | SendGrid, Postmark, Nodemailer + SMTP |
| 2026-09-23 | Google Calendar API (not CalDAV) | Rich API, webhooks, OAuth integration | CalDAV, Microsoft Graph, Cronofy |
| 2026-09-23 | PWA with Workbox | Offline-first, installable, no app store | Native apps, Capacitor, Tauri |

---

*Architecture version: 1.0*
*Last updated: September 2026*
*Next review: December 2026*