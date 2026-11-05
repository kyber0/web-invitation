# Cleveth Kate · Eighteen

A bespoke black-and-blue birthday invitation with a silent envelope reveal, countdown, attire guide, tradition lists, personal guest links, seat-limited RSVP, and a private organizer page.

The guest theme is midnight galaxy, sapphire satin ribbons, and silver crystal ornaments. It includes animated stars, shooting stars, pointer stardust and constellation lines, a tilting framed portrait with full-screen viewing, scroll reveals, and celebratory star bursts. A persistent pause control and reduced-motion support keep the effects optional. Background animation stops while the page is hidden. Ribbon generation details are in `ASSETS.md`.

## Stack

Vercel serves the static website and Node.js API functions. Supabase Postgres stores invitations, attendance responses, and shared login throttling. No SQLite or runtime filesystem writes are used. The browser talks only to our API; the Supabase secret stays on the server.

## 1. Prepare Supabase

Create a Supabase project, then run `supabase/schema.sql` in its SQL Editor. It creates the guest table and login limiter, enables row-level security, and denies direct access by anonymous and authenticated browser roles. Only the server's secret key can access these tables. No public read policy is needed.

From your Supabase project's API settings, get the Project URL and server secret key (`sb_secret_...`). Legacy service-role JWTs are also supported through `SUPABASE_SERVICE_ROLE_KEY`, but new secret keys are preferred. Never put either secret in browser code, GitHub, or a variable with a public/client prefix.

## 2. Import into Vercel

Import `kyber0/web-invitation`, branch `main`, with the project root set to the repository root. Choose the **Other** framework preset, Node.js **22.x**, build command `npm run build`, and output directory `dist`. The tracked `vercel.json` configures API routing, the organizer route, and security headers. No dependency installation is required.

Add these environment variables to the Vercel project:

- `SUPABASE_URL`: your Supabase Project URL, for example `https://YOUR_PROJECT.supabase.co`.
- `SUPABASE_SECRET_KEY`: your server-only secret key.
- `APP_URL`: your exact canonical site origin, such as `https://your-invitation.vercel.app` (no trailing slash). Used for invitation links and origin validation.
- `ADMIN_PASSWORD`: at least 16 characters. You can reuse the generated local value in `.env`.
- `SESSION_SECRET`: at least 32 random characters. You can reuse the generated local value in `.env`.
- `RSVP_DEADLINE`: `2026-12-26T23:59:59+08:00`.
- `COOKIE_SECURE`: `true` for HTTPS deployment.

Use a separate Supabase project and matching `APP_URL` for Preview deployments to avoid changing production guest data. `HOST` and `PORT` are local-development variables and are not needed on Vercel. `DATABASE_PATH` is obsolete.

Deploy, then open `/admin` and sign in using `ADMIN_PASSWORD`. Create a test invitation and verify its personal link, attendance submission, response update, and appearance in the organizer. Redeploy after changing environment variables. Once a custom domain is configured, update `APP_URL` before sending guest links.

## Local development

Requires Node.js 22.18 or newer. Copy `.env.example` to `.env`, fill in your Supabase URL/key and organizer secrets, and run `npm start`. Open `http://localhost:3000`; organizer: `/admin`. For local development set `APP_URL=http://localhost:3000` and `COOKIE_SECURE=false`.

The `.env` file, old local database directory, build output, and original portrait backup are ignored by Git. Existing SQLite records are not automatically migrated; preserve `data/` if you entered real guests previously. New invitations are stored in Supabase.

## Verification

`npm test` runs integration tests against a local Supabase REST-contract fixture, including organizer authentication, shared login throttling, guest creation, RSVP edits, seat limits, deadline enforcement, serverless routing and parsed request bodies. `npm run build` generates the static deployment assets. Tests do not connect to a live Supabase project; the SQL schema and live Vercel deployment still require the smoke test above.

## Current scope

The organizer supports guest creation, search, invitation links, RSVP totals, and CSV export. Guest editing/deletion and organizer overrides are future work. Guest links use random 192-bit tokens and should be shared privately. Participant names were transcribed from the original invitation images and should be reviewed before sending links. No music or QR check-in is included.

## Interactive booklet

The guest invitation is a six-page booklet with a 3D page-turn transition, previous/next controls, chapter tabs, a ribbon shortcut to RSVP, keyboard arrows, and horizontal swipes. Each page scrolls independently for long participant lists or RSVP names. Vertical gestures remain available for scrolling, and form data is preserved when changing chapters. Direct chapter links preserve the personal invitation token. Reduced motion and the effects pause control disable page-turn animation. Without JavaScript enhancement, the invitation remains a normal scrolling document.

The booklet now occupies the full viewport with navigation overlaid at the edges. Chapters scroll internally when needed. All four debut tradition lists are displayed as open, numbered honor-roll cards; no accordion click is required.
