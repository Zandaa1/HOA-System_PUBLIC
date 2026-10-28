# HOA System

Sanitized source snapshot of a Next.js / Supabase homeowners association management application. It includes property and resident management, billing, collections, amenities, water billing, maintenance and reporting interfaces. This export contains no original accounts, uploaded documents, financial records or community map boundary. Images are synthetic placeholders.

## Local setup

Requires Node.js 20.9+ (Node 22 recommended), npm, Docker and the Supabase CLI.

1. Run `npm ci`.
2. Run `npx supabase start` and `npx supabase db reset` to apply the reviewed migrations to a fresh local database. The migrations create schema, functions, permissions and generic application settings/reference types. They do not create residents or authentication accounts.
3. Copy `.env.example` to `.env.local`. Obtain the anonymous and service role keys from your **local** Supabase instance and fill the blank values. Keep the service role key on the server.
4. Load `.env.local` into your shell, set `DEMO_ADMIN_PASSWORD` to your own password of at least 12 characters, then run `npm run demo:admin`. This creates only `admin@example.test`, refuses non-local endpoints and does not print the password. Run once against a fresh database.
5. Run `npm run dev`, open `http://127.0.0.1:3000/auth/login`, sign in with the local account and complete setup with synthetic values.

Use only synthetic records. Configure outbound mail with a local mail catcher; the default SMTP fallback is localhost:1025. Map tiles/geocoding and QR image rendering may contact their public providers when those features are used. The map starts at synthetic coordinates near 0,0 with an empty boundary; draw a new demo boundary if needed. No production deployment or migration script is included.

## Validation and limits

`npx tsc --noEmit` checks TypeScript, and `npm run build` builds the app. The inherited Next.js configuration allows TypeScript build errors, so a successful build alone does not establish type safety. The remaining storage test can be run with `npx tsx tests/storage-local.test.ts`; original account-dependent tests were removed with their fixtures.

Database migration application, authentication, billing and device/browser workflows require local integration validation. Original credentials, production seeds, tunnel scripts, API fixtures, documents and AI workflow files are omitted. This snapshot is a source demonstration, not a verified production deployment. No additional license grant is provided here.
