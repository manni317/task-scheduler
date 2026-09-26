# Muze Satwik Task Manager - Setup Guide

Complete step-by-step setup for deploying Muze Satwik Task Manager with Cloudflare Pages, Supabase, Inngest, and Resend.

---

## 📋 Prerequisites

- **GitHub account** (for repository and CI/CD)
- **Cloudflare account** (for Pages hosting)
- **Supabase account** (for database and auth)
- **Inngest account** (for background jobs)
- **Resend account** (for transactional emails)
- **Google Cloud Console** (for OAuth and Calendar API)
- **Node.js 20+** and **pnpm 9+** installed locally

---

## 1️⃣ Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose organization, enter:
   - **Name**: `muze-satwik-task-manager`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
3. Wait for project to provision (~2 minutes)

### 1.2 Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ *Keep secret!*

### 1.3 Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider:
   - **Client ID**: (from Google Cloud Console, step 5)
   - **Client Secret**: (from Google Cloud Console, step 5)
   - **Redirect URL**: `https://<your-domain>/api/auth/callback/google`
3. Enable **Email** provider (optional, for magic links)
4. Set **Site URL** in **Authentication** → **URL Configuration**:
   - Local: `http://localhost:3000`
   - Production: `https://muze-satwik-task-manager.pages.dev`

### 1.4 Run Database Migrations

```bash
# Install Supabase CLI
pnpm add -g supabase

# Login and link project
supabase login
supabase link --project-ref <your-project-ref>

# Push migrations
pnpm db:push
```

Or run migrations manually in **SQL Editor**:
1. Go to **SQL Editor** → **New Query**
2. Copy contents of `supabase/migrations/*.sql` files
3. Execute each migration

### 1.5 Enable Row Level Security (RLS)

RLS is enabled by default on all tables. Verify policies in **Authentication** → **Policies**.

---

## 2️⃣ Cloudflare Pages Setup

### 2.1 Create Pages Project

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. **Connect to Git** → Select your GitHub repository
3. Configure build settings:
   - **Project name**: `muze-satwik-task-manager`
   - **Production branch**: `main`
   - **Build command**: `pnpm build`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/` (or `task-scheduler` if in subdirectory)
4. Click **Save and Deploy**

### 2.2 Add Environment Variables

Go to **Settings** → **Environment variables** → Add for **Production** and **Preview**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | All |
| `INNGEST_SIGNING_KEY` | `signkey_...` | All |
| `INNGEST_EVENT_KEY` | `eventkey_...` | All |
| `RESEND_API_KEY` | `re_...` | All |
| `RESEND_FROM_EMAIL` | `Muze Satwik <noreply@domain.com>` | All |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | All |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | All |
| `NEXT_PUBLIC_APP_URL` | `https://muze-satwik-task-manager.pages.dev` | All |
| `CRON_SECRET` | (generate: `openssl rand -hex 32`) | All |
| `GOOGLE_CALENDAR_SCOPES` | `https://www.googleapis.com/auth/calendar.events` | All |
| `NEXT_PUBLIC_APP_NAME` | `Muze Satwik Task Manager` | All |
| `NEXT_PUBLIC_APP_DESCRIPTION` | `A beautiful, offline-first task manager...` | All |
| `NEXT_PUBLIC_APP_THEME_COLOR` | `#6366f1` | All |

### 2.3 Custom Domain (Optional)

1. Go to **Custom domains** → **Add custom domain**
2. Enter your domain (e.g., `tasks.yourdomain.com`)
3. Follow DNS verification steps
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

---

## 3️⃣ Inngest Setup

### 3.1 Create Inngest App

1. Go to [app.inngest.com](https://app.inngest.com) → **Create App**
2. Name: `muze-satwik-task-manager`
3. Copy **Signing Key** → `INNGEST_SIGNING_KEY`
4. Copy **Event Key** → `INNGEST_EVENT_KEY`

### 3.2 Configure Inngest Endpoint

1. Go to **Settings** → **Endpoints**
2. Add endpoint: `https://<your-domain>/api/inngest`
3. For local dev: Use `inngest-cli dev` (see Local Development)

### 3.3 Deploy Functions

```bash
# After deploying to Cloudflare Pages
pnpm inngest:deploy
```

---

## 4️⃣ Resend Setup

### 4.1 Create API Key

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. **Create API Key** → Name: `Muze Satwik Production`
3. Copy key → `RESEND_API_KEY`

### 4.2 Verify Domain

1. Go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `yourdomain.com`)
3. Add DNS records as instructed:
   - **DKIM** (TXT record)
   - **SPF** (TXT record)
   - **DMARC** (TXT record)
4. Wait for verification (can take up to 48 hours)

### 4.3 Configure Sender

Update `RESEND_FROM_EMAIL` with verified domain:
```
Muze Satwik <noreply@yourdomain.com>
```

---

## 5️⃣ Google OAuth & Calendar API

### 5.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. **Select Project** → **New Project** → `muze-satwik-task-manager`
3. Enable APIs:
   - **Google Calendar API**
   - **Google OAuth2 API**

### 5.2 Configure OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. **User Type**: External
3. Fill required fields:
   - **App name**: `Muze Satwik Task Manager`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. **Scopes**: Add `https://www.googleapis.com/auth/calendar.events`
5. **Test users**: Add your email for testing
6. **Publish App** (when ready for production)

### 5.3 Create OAuth Credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. **Application type**: Web application
3. **Name**: `Muze Satwik Web Client`
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://muze-satwik-task-manager.pages.dev/api/auth/callback/google` (preview)
   - `https://yourdomain.com/api/auth/callback/google` (production)
5. **Create** → Copy **Client ID** and **Client Secret**

---

## 6️⃣ DNS Configuration

### 6.1 Cloudflare Pages (Automatic)

If using `*.pages.dev` subdomain: **No DNS config needed** — Cloudflare handles it.

### 6.2 Custom Domain

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `tasks` | `muze-satwik-task-manager.pages.dev` | ✅ Proxied |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` | DNS only |
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` | DNS only |
| TXT | `resend._domainkey` | (DKIM from Resend) | DNS only |

### 6.3 Email DNS (Resend)

Add all records provided by Resend in **Domains** → **DNS Records**.

---

## 7️⃣ GitHub Secrets Configuration

Go to **Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Pages edit permission) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `INNGEST_SIGNING_KEY` | `signkey_...` |
| `INNGEST_EVENT_KEY` | `eventkey_...` |
| `RESEND_API_KEY` | `re_...` |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |
| `NEXT_PUBLIC_APP_URL` | `https://muze-satwik-task-manager.pages.dev` |
| `CRON_SECRET` | (from step 2.2) |

### Get Cloudflare API Token

1. Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token** → **Custom token**
3. Permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Zone** → **Zone Settings** → **Read** (for custom domains)
4. Copy token → `CLOUDFLARE_API_TOKEN`
5. Account ID found on **Overview** page → `CLOUDFLARE_ACCOUNT_ID`

---

## 8️⃣ Local Development Setup

### 8.1 Clone and Install

```bash
git clone https://github.com/yourusername/muze-satwik-task-manager.git
cd muze-satwik-task-manager
pnpm install
```

### 8.2 Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your local values
```

### 8.3 Start Supabase Local (Optional)

```bash
supabase start
# Updates .env.local with local keys
```

### 8.4 Start Development Servers

**Terminal 1 - Next.js:**
```bash
pnpm dev
```

**Terminal 2 - Inngest (for background jobs):**
```bash
pnpm inngest:dev
# Opens Inngest dev server at http://localhost:8288
```

**Terminal 3 - Supabase Studio (if using local):**
```bash
supabase studio
```

### 8.5 Test OAuth Locally

1. Add `http://localhost:3000/api/auth/callback/google` to Google OAuth redirect URIs
2. Start dev server: `pnpm dev`
3. Visit `http://localhost:3000` and sign in with Google

---

## 9️⃣ Verification Checklist

### Pre-Deployment
- [ ] All environment variables set in Cloudflare Pages
- [ ] All GitHub secrets configured
- [ ] Supabase migrations applied
- [ ] Google OAuth redirect URIs include all environments
- [ ] Resend domain verified
- [ ] Inngest endpoint configured

### Post-Deployment
- [ ] Preview deployment works (`develop` branch)
- [ ] Production deployment works (`main` branch)
- [ ] Google OAuth sign-in works
- [ ] Calendar sync works (create task → appears in Google Calendar)
- [ ] Email notifications send (test via Inngest dashboard)
- [ ] PWA installs correctly (check manifest.json loads)
- [ ] Offline mode works (disable network in DevTools)
- [ ] Background jobs process (check Inngest dashboard)

---

## 🔧 Troubleshooting

### Build Fails on Cloudflare Pages
- Check **Build logs** in Pages dashboard
- Ensure `output: 'export'` in `next.config.js`
- Verify all env vars are set (no undefined at build time)

### OAuth Redirect Mismatch
- Verify exact redirect URI in Google Console matches deployed URL
- Check trailing slashes: `/api/auth/callback/google` vs `/api/auth/callback/google/`

### Inngest Functions Not Triggering
- Verify `INNGEST_SIGNING_KEY` matches in Cloudflare and Inngest
- Check endpoint URL in Inngest settings matches `/api/inngest`
- Check function logs in Inngest dashboard

### Emails Not Sending
- Verify Resend domain status: **Verified**
- Check `RESEND_FROM_EMAIL` uses verified domain
- Check Inngest function logs for send errors

### RLS Policy Errors
- Verify user is authenticated (`auth.uid()` not null)
- Check policy SQL in Supabase **Authentication** → **Policies**
- Test with service role key bypasses RLS

---

## 📚 Useful Commands

```bash
# Local development
pnpm dev                 # Next.js dev server
pnpm inngest:dev         # Inngest local dev server
supabase studio          # Local Supabase dashboard

# Database
pnpm db:push             # Push migrations to remote
pnpm db:generate         # Generate TypeScript types
pnpm db:reset            # Reset local database

# Deployment
pnpm deploy:preview      # Deploy to preview branch
pnpm deploy:production   # Deploy to production branch

# Testing
pnpm test                # Run all tests
pnpm typecheck           # TypeScript check
pnpm lint                # ESLint check
```

---

## 🆘 Support

- **Documentation**: See `ARCHITECTURE.md` for system design
- **Issues**: GitHub Issues for bugs
- **Discord**: Community support (link in README)

---

*Last updated: September 2026*