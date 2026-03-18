# Subman - Subscription Management Platform

Subman is a production-focused web application for managing digital service subscriptions, subscriber communication workflows, role-based administration, and built-in 2FA tooling.

## Project Objectives

- Centralize subscriber and subscription operations in one dashboard.
- Provide fast daily operations (create, edit, renew, search, filter, export).
- Support role-based access with approval workflow for team members.
- Standardize communication payloads (copy / WhatsApp / Messenger).
- Offer in-browser MFA/2FA code generation without exposing secrets to external services.
- Keep deployment simple with Vite + Supabase + Vercel.

## Core Features

### 1) Authentication and Access Control

- Supabase Auth (email/password and Google OAuth).
- Profile roles and status workflow (`admin` / `user`, `pending` / `approved` / `rejected`).
- Row-level policies expected in Supabase for data isolation and admin capabilities.

### 2) Subscriber and Subscription Management

- Full CRUD for subscriptions.
- Dynamic service/category model:
  - ChatGPT: `go`, `pro`, `plus`, `business`
  - Grok: `supergrok`, `business`
  - Perplexity: `pro`, `enterprise pro`, `enterprise max`
  - Gemini: `pro`, `plus`, `ultra`
- Renewal workflow from row actions.
- Column visibility toggles and quick filters.

### 3) Subscription Credentials Section

- `Subscription Mail`
- `Subscription Password`
- `Secret ID` (Base32)
- One-click secret code generation from `Secret ID`.
- Copy action includes standardized sections and generated `Secret Code` with validity text.

### 4) Standardized Sharing

Single standardized payload used by:

- Copy tool button
- WhatsApp button
- Messenger button

Payload sections:

- `Subscription Details`
- `Subscription Credentials`
- `Subscriber Details`

### 5) 2FA/MFA Tool

- Public route support for MFA page (`/mfa`) in the app shell.
- Base32 secret input + generated code output.
- Current TOTP period is configured as **10 minutes** across the platform.
- Countdown and validity messaging included.

### 6) Analytics and Export

- Dashboard analytics with charts.
- Excel export (`.xlsx`) includes standardized fields aligned with copy payload sections.

## Full Stack and Technology

### Frontend

- React 19
- TypeScript
- Vite 7
- CSS (custom app styling)

### Data and Auth

- Supabase
  - Postgres database
  - Auth
  - Realtime subscriptions
  - RLS policies (configured in SQL setup)

### Visualization and File Export

- Recharts (analytics charts)
- xlsx (Excel export)

### Tooling and Quality

- ESLint 9
- TypeScript compiler (`tsc -b`)

### Deployment

- Vercel (production deployment)

## Project Structure

Key files:

- `src/App.tsx` - main application logic, views, actions, and workflows
- `src/App.css` - global and component styling
- `src/components/AnalyticsCharts.tsx` - charts layer
- `src/supabaseClient.ts` - Supabase client and shared types
- `supabase-setup.sql` - schema/policies bootstrap and migrations baseline

## Environment Variables

Create `.env.local` from `.env.example`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
VITE_SUPABASE_AUTH_REDIRECT_URL=http://localhost:5173
```

Important:

- Never expose service role keys in frontend (`VITE_`) variables.
- Keep management tokens/passwords only in secure local/server contexts.

## Local Development

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```

## Supabase Schema Notes

Application uses (at minimum):

- `profiles`
- `subscriptions`
- `settings`
- `notifications`

`subscriptions` should include operational and credentials fields used by UI, including:

- service metadata (`service`, `category`, `duration`)
- subscriber/contact data (`name`, `email`, `whatsapp`, `facebook`, `countrycode`)
- lifecycle and billing (`startdate`, `enddate`, `payment`, `workspace`)
- credentials (`subscriptionmail`, `subscriptionpassword`, `twofactorsecret`)

## Operational Notes

- Messenger prefilled text behavior can vary by client/browser; copy fallback is implemented.
- If DB credentials columns are missing in an environment, add them via migration before relying on centralized persistence.

## Security Recommendations

- Use RLS for all tables.
- Keep secrets and tokens out of repository files.
- Rotate any token that was ever shared in plaintext.
- Restrict admin-only actions via policies and role checks.
