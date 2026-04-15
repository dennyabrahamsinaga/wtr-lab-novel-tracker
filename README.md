# WTR Lab Novel Tracker

`WTR Lab Novel Tracker` is a Vercel-ready Next.js app for browsing released novels from `wtr-lab.com`, tracking favorites, and notifying users when favorite novels get new chapters.

Disclaimer: This is a fully AI-generated project.

## What it does

- Browse released novels with filters for search, tags, status, chapter count, and rating
- View novel detail pages with metadata, EN description, ID description when available, ratings, and review excerpts
- Save favorites per user profile
- Send push notifications for favorite novel chapter updates through Vercel Cron

Important: `wtr-lab.com/robots.txt` disallows crawling chapter pages, so this project does not fetch full chapter content.

## Stack

- `Next.js 16`
- `React 19`
- `Tailwind CSS 4`
- `Prisma + PostgreSQL`
- `NextAuth`
- `Vitest + Testing Library`

## Local development

1. Copy the env file:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Fill `.env`:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `GITHUB_ID` and `GITHUB_SECRET` if GitHub OAuth will be enabled
- `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` if push notifications will be enabled

4. Apply migrations:

```bash
npm run db:migrate
```

5. Start the app:

```bash
npm run dev
```

## Dataset build

The browse API can use generated novel metadata.

```bash
npm run dataset:build
```

## Push notifications

Generate VAPID keys:

```bash
npm run vapid:generate
```

Then set:

- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

`/api/cron/check-updates` is protected with `CRON_SECRET`.

For Vercel Hobby, use an external scheduler such as GitHub Actions because Hobby cron is limited. This repo includes a GitHub Actions workflow for 30-minute checks.

## Vercel deployment

Required production environment variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`

Optional, depending on enabled features:

- `NEXTAUTH_URL`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Notes:

- Use a managed PostgreSQL database for Vercel deployment.
- `docker-compose.yml` is only for local development.
- On Vercel Hobby, use the included GitHub Actions scheduler instead of Vercel Cron for 30-minute checks.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
