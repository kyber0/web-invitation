# Cleveth Kate · Eighteen

A bespoke black-and-blue birthday invitation, with a silent envelope opening, responsive portrait layout, countdown, attire guide, four tradition lists, map directions, personal invitation links, seat-limited RSVP, and password-protected organizer page.

## Run locally

Requires Node.js 22.18 or newer. No package installation required.

1. Copy `.env.example` to `.env`.
2. Set a strong `ADMIN_PASSWORD` and a random `SESSION_SECRET` of at least 32 characters.
3. Run `npm start`.
4. Open `http://localhost:3000`; organizer page: `/admin`.

SQLite creates `data/invitation.sqlite` automatically. Back up this directory when using real guest data. `.env` and the database are ignored by Git. Organizer password is stored only in the local environment file, never in frontend code. Guest links contain random 192-bit tokens and must be shared privately.

## Environment

See `.env.example`: `HOST`, `PORT`, `APP_URL`, `DATABASE_PATH`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `RSVP_DEADLINE`, `COOKIE_SECURE`. The RSVP cutoff is November 19, 2026 at 11:59:59 PM in the Philippines. Seat counts and the cutoff are enforced on the server.

## Deploy

Use a persistent Node host with a durable disk for SQLite; this application cannot run on GitHub Pages. Set `APP_URL` to the HTTPS site URL, `HOST=0.0.0.0`, `COOKIE_SECURE=true`, and `DATABASE_PATH` to the persistent disk path. Supply secrets via your host's environment configuration. A hosted database provider has not been provisioned.

## Status

GitHub target: `kyber0/web-invitation`. Remote creation/push requires GitHub authentication and is not complete until verified. The initial organizer supports guest creation, search, invitation link copying, attendance totals, and CSV export. Guest editing, deletion, and organizer RSVP overrides are future work.

The original printed invitation is used only as a content reference. Review transcribed participant names before sending links. No music or digital check-in is included.
