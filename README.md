# HOA System

A Next.js and Supabase application for homeowners association management, including properties, residents, billing, collections, amenities, water billing, maintenance and reports.

## Setup

Requires Node.js 20.9+, npm, Docker and the Supabase CLI.

1. Run `npm ci`.
2. Run `npx supabase start` and `npx supabase db reset` to create the local database, functions, permissions and reference settings.
3. Copy `.env.example` to `.env.local` and fill in the keys from your local Supabase instance. Keep the service role key on the server.
4. Load `.env.local` into your shell, set `DEMO_ADMIN_PASSWORD` to a password of at least 12 characters, then run `npm run demo:admin`. This creates `admin@example.test` on a local endpoint only. Run it once against a fresh database.
5. Run `npm run dev` and open `http://127.0.0.1:3000/auth/login`.

The database starts without residents or authentication accounts. Configure local mail through an SMTP catcher on port 1025. Map tiles, geocoding and QR image rendering use external providers. The initial map coordinates and images are placeholders; configure the boundary and assets for your own installation.

## Checks

```sh
npx tsc --noEmit
npm run build
npx tsx tests/storage-local.test.ts
```

The Next.js configuration allows TypeScript errors during builds, so run the separate type check as well. Database migrations, authentication and billing need local integration testing. Keep credentials, financial records and uploaded documents out of version control.
