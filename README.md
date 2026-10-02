# pnp-backend

**NestJS + MySQL + TypeORM** API serving `pnp-web`, and eventually `pnp-admin`/`pnp-mobile` plus
the Institution, Franchise, and Investor portals described in the project scope (`PNP Sports League
- Web Portal & Application Development - Quotation - Reserved Final - Mr Paras Mishra.pdf`). This
README is both the status of what's built and the architecture plan for what isn't yet — treat the
unbuilt parts as the brief for the next phase.

---

## 0. What's built right now

A **single NestJS app** (not yet split into the multi-app "monorepo mode" described in §3 — see the
note there) covering school + player onboarding end to end:

- `POST /api/schools` — insert a school as unverified, email a verification link to the school's
  own address with a recap of what was submitted, respond with a "check your email" message.
- `GET /api/schools/verify?token=...` — verifies the school (48h token expiry), returns a small
  HTML confirmation page. Once verified, the school appears in the player dropdown.
- `GET /api/schools` — verified schools only (`id`, `publicId`, `name`, `city`) — this is what
  `PlayerOnboardForm`'s school dropdown fetches live.
- `POST /api/players` — insert a player as unverified (school must exist **and** be verified),
  email a verification link with a recap, respond with a "check your email" message.
- `GET /api/players/verify?token=...` — same pattern as schools.

**Unique IDs — pattern, not random:** every school/player gets a public ID shaped
`{PREFIX}-{YY}-{SEQ}`, e.g. `SCH-26-000001`, `PLY-26-000042` (see `src/common/public-id.util.ts`).
`PREFIX` names the entity type, `YY` is the two-digit registration year, `SEQ` is the row's own
MySQL auto-increment id zero-padded to 6 digits — unique and gap-free for free, no separate counter
table, no collision risk, and still sortable/human-readable (unlike a UUID). Composed right after
insert, once the DB has assigned the id, then written back onto the row.

**Existing schools are seeded, not fabricated:** `scripts/seed-schools.ts` inserts the same list
already in `pnp-web/src/data/partnerSchools.js` as pre-verified rows (`source: 'seed'`). Only the
name is seeded — principal/contact fields stay `null` rather than inventing placeholder people (see
`pnp-web/GUIDELINES.md` §7), until that school submits the real form or an admin fills them in.

**Local dev:**

```bash
cp .env.example .env             # then fill in RESEND_API_KEY
docker compose up -d             # local MySQL on :3306
npm install
npm run migration:run
npm run seed:schools
npm run dev                      # http://localhost:4000/api
```

**Production:** runs on an E2E Networks VM (`151.185.58.48`, reverse-proxied by nginx as
`api.pnpsports.in` with a Let's Encrypt cert), as a systemd service (`pnp-backend`) under a
Capistrano-style `releases/` + `current` symlink + `shared/.env` layout — `.env` is never touched
by a deploy. **CI/CD:** `.github/workflows/backend-deploy.yml` — on every push to `main` touching
`pnp-backend/**`, it builds + typechecks, then (on `main` only) ships a new release over SSH,
installs deps, builds, runs migrations, swaps the `current` symlink, restarts the service, and
health-checks the live endpoint before finishing; a failure at any step leaves the previous release
running untouched (see `pnp-backend/deploy/deploy-remote.sh` for the actual deploy logic, which
runs on the server). Pull requests touching `pnp-backend/**` get the build+typecheck job only, no
deploy. Deploy secrets (`DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`) live
in the repo's GitHub Actions secrets — the deploy key is scoped to a dedicated keypair (not anyone's
personal key), and the `deploy` user's passwordless sudo is scoped to exactly
`systemctl restart|status|is-active pnp-backend`, nothing broader.

`pnp-web` needs `VITE_API_URL` pointed at this backend (see `pnp-web/.env.example`) — this API is
a **separate deployment** from the site's Cloudflare Worker (`pnp-web/worker/index.js`, which still
owns `/api/waitlist` only), not merged into it. Hosting for this backend is not decided yet (§6).

**Deliberate scope decision:** this is one Nest app with feature modules
(`institutions`, `players`, `notifications`, `common`), not the full multi-app gateway/iam/etc.
split described in §3 below — that structure is real infrastructure (Docker Compose, inter-service
REST, a hosting decision) that two onboarding forms don't justify yet. Auth/IAM, tournaments,
matches, franchises, investors, and finance are **not built**. Splitting into true multi-app mode
and adding `iam`/`gateway` is the natural next step once more of §3's scope actually starts.

---

## 1. Scope source

Five portals + a mobile app, all sharing this backend:

| Portal | Primary actors | Core capabilities |
|---|---|---|
| **Public/Player Web** (`pnp-web`, exists) | Player, Viewer/Guest | Onboarding, player profile/portfolio, browse/apply to tournaments, search/follow, dashboard, live match viewing |
| **Admin** (`pnp-admin`, placeholder) | Super Admin, Ops | Governance over all portals, match engine, scoring, streaming, finance/revenue, investor data room, analytics |
| **Institutions** | Principal/HOD | Bulk player onboarding, fee mgmt, participation tracking, comms |
| **Franchise** | Owner/Manager | Team/player mgmt, sponsorships, payments, match ops, contracts |
| **Investor** | Investor | KYC, portfolio, ROI dashboards, data room |
| **Mobile** (`pnp-mobile`, placeholder) | Player, Fan | Live scores, streaming, points table, push notifications, payments |

Real-time scoring is WebSocket-based; live streaming is YouTube API-based (embed + schedule, not
self-hosted streaming infra); the payment gateway is Razorpay.

---

## 2. Roles & permissions (IAM) — not built yet

| Role | Scope | Notes |
|---|---|---|
| `SUPER_ADMIN` | Global | Platform config, feature flags, all portals |
| `ADMIN` / `MATCH_OPERATOR` | Global (sub-scoped by permission) | Match engine, scoring, streaming ops |
| `INSTITUTION_ADMIN` | Own `institutionId` | Principal/HOD — bulk player mgmt, own fee/comms |
| `FRANCHISE_OWNER` / `FRANCHISE_MANAGER` | Own `franchiseId` | Team, sponsorship, contracts, payments |
| `INVESTOR` | Own `investorId` | Read-heavy: portfolio, reports, data room |
| `PLAYER` | Own profile | Public site + mobile |
| `VIEWER` (guest/fan) | Own account | Lowest privilege, mobile-first |
| `UMPIRE` | Assigned matches only | Scoped scoring input, assigned by Admin |
| `COACH` | Contact-only in v1 | No login yet — matches `ParticipateForm`'s `coachName`/`coachMobile`, not an account |

Auth is planned as JWT (access + refresh), with OTP (email/mobile) verification — this fulfils the
"email = username, mobile = password" note already sitting in `PlayerOnboardForm`'s footer copy.
**Today**, school/player "verification" is a simpler email-link confirmation (see §0) — it proves
the email address is real, it is not an authentication system. Social login is phase 2, per the
scope doc. Every institution/franchise/investor-scoped role will be enforced via **row-level
scoping** (an `institutionId`/`franchiseId`/`investorId` claim in the JWT, checked by guards) — role
name alone will not be sufficient authorization.

---

## 3. Service breakdown (target shape — not built yet, see §0 for what exists today)

Structured as **one NestJS monorepo using Nest's own multi-app "monorepo mode"**: each bounded
context is a real, independently-runnable Nest app sharing `libs/`, so it's microservices-capable
(own `Dockerfile`, own scaling, own deploy) without paying full distributed-systems overhead for
contexts that don't need it yet. Most services deploy together initially; `matches` (real-time
scoring load) and `notifications` (queue worker) are the first candidates to split out
independently once load justifies it.

```
pnp-backend/
├── apps/
│   ├── gateway/              ← public REST edge: authn/authz, rate limiting, routing, Swagger aggregation
│   ├── iam/                  ← users, roles/permissions, auth, OTP, sessions
│   ├── core/                 ← reference data: sports catalog, districts/states, waitlist & franchise leads
│   ├── institutions/         ← school/academy onboarding, bulk player mgmt
│   ├── players/              ← profiles, portfolio, search/follow, dashboard
│   ├── tournaments/          ← tournament CRUD, apply, squads, points table
│   ├── matches/              ← scheduling, umpire/venue, ball-by-ball scoring, WebSocket live push, YouTube stream linkage
│   ├── franchises/           ← onboarding, team mgmt, sponsorships, contracts
│   ├── investors/            ← KYC, portfolio, data room, ROI dashboards
│   ├── finance/              ← fees, sponsorship revenue, revenue share, Razorpay integration, reconciliation (shared ledger)
│   ├── notifications/        ← email/SMS/push, template mgmt, queue consumer
│   └── analytics/            ← cross-domain dashboards, PDF/Excel export
└── libs/
    ├── common/                ← guards, interceptors, RBAC decorators, pagination
    ├── database/               ← MySQL/TypeORM base entities, migration tooling
    └── messaging/              ← event bus client wrapper
```

**Database:** one MySQL instance, **separate schema per service** (database-per-service pattern)
— no cross-service joins; each service owns its own TypeORM migrations. Today's single-app
implementation uses one schema with `schools`/`players` tables and a straightforward FK between
them (see `src/database/migrations`) — that FK goes away if/when `institutions` and `players`
become genuinely separate services with separate schemas. Shared request/response DTOs live in
a shared types package (not yet created) and are imported by every service plus
`pnp-web`/`pnp-admin`, instead of each app re-declaring its own version.

**Inter-service comms:** synchronous internal REST for request/response (gateway → service);
Redis pub/sub or BullMQ-on-Redis for async events (e.g. "player registered" → `notifications`).
This avoids adding RabbitMQ/Kafka until real load demands it.

**Real-time:** `matches` exposes a Socket.IO/WebSocket gateway for ball-by-ball score push to web,
admin, and mobile.

**Docs:** every app exposes its own Swagger (`@nestjs/swagger`) at `/docs`; `gateway` aggregates
tags into one combined spec. A Postman collection is generated from that aggregated OpenAPI spec
(openapi-to-postman) and committed/exported per milestone, with Newman wired into CI as a
contract-test smoke check. Not set up yet on today's single-app implementation.

**Local dev:** Docker Compose (MySQL, Redis, all Nest apps + gateway) — today's `docker-compose.yml`
only has MySQL, since there's only one app and no async messaging yet.

---

## 4. Frontend contracts

- `POST /waitlist` — owned by `core` (not built) — `{ name, email, phone, type, city }` — currently
  served by the Cloudflare Worker (`pnp-web/worker/index.js`), not this backend; see that file's
  header comment.
- `POST /schools`, `GET /schools`, `GET /schools/verify` — **built**, owned by `institutions` — see
  §0.
- `POST /players`, `GET /players/verify` — **built**, owned by `players` — see §0. Contract is
  `{ schoolId, playerName, dob, mobile, email }` — `schoolId` (not a `school` name string) since
  the dropdown now sources real DB rows.
- `POST /teams/participate` — owned by `tournaments` (not built) — `{ school, sport, ageCategory,
  gender, players: [{ name, role }], coachName, coachMobile }` (`components/forms/ParticipateForm/`)
- Live match feed — owned by `matches` (not built) — mirrors `data/phoneScore.js`: `{ matchTitle,
  teamA/teamB: { name, note, score, overs }, lastBalls: [], crr, batsman, bowler }`
- `data/partnerSchools.js` still feeds the Network section and the Participate wizard's school step
  — see its own file comment and `pnp-web/GUIDELINES.md` §6 for how it now relates to the live
  `GET /schools` endpoint.

---

## 5. Phasing

Mirrors the quotation's own week-by-week delivery table:

1. **Foundations** — monorepo scaffold, `libs/`, `iam` (auth+roles), `gateway`, MySQL schemas,
   Swagger/Postman pipeline, `POST /waitlist` (quick win, already contracted against the live site
   — shipped via the Cloudflare Worker, not this backend).
2. **Public/Player backend** — `institutions`, `players` **(onboarding + verification shipped,
   see §0 — bulk player mgmt, portfolio/search/follow/dashboard not yet built)**, `tournaments`
   (browse/apply, not built).
3. **Admin backend** — `matches` (scheduling, scoring engine, WebSocket push), YouTube streaming
   linkage, `analytics`.
4. **Institutions backend** — bulk onboarding, fee mgmt (via `finance`), notifications.
5. **Franchise backend** — onboarding, sponsorships, match ops, contracts.
6. **Investor backend** — KYC, data room, portfolio/ROI.
7. **Payments hardening** — `finance` × Razorpay integration, reconciliation.
8. **Mobile-specific APIs** — push notifications, points table, discussion threads.

---

## 6. Open items (not yet decided)

- Cloud hosting provider for the backend (quotation suggests AWS or E2E Networks) — separate from
  `pnp-web`'s existing Cloudflare Pages/Workers deployment. Today's implementation runs anywhere
  Node + MySQL are available (see §0's local dev instructions) but has no production host yet.
- Whether `pnp-admin`, the Institution, Franchise, and Investor portals get separate frontend
  apps or are routes within a shared portal shell — frontend scope, not decided as part of this
  backend plan.
- SMS/OTP provider for `notifications` (not named in the quotation's exclusions list).

---

## Conventions to carry over from the frontend

- Field names in DTOs must match the frontend's existing data shapes so the two don't drift — see
  §4 above.
- Put shared request/response types in a shared types package the moment the first real endpoint
  is built — don't let two apps invent their own version of the same type. (Not yet done for
  today's `schools`/`players` DTOs — `pnp-web` and `pnp-backend` currently keep their own copies
  in sync by hand; move them into a shared package if/when a third consumer shows up or the
  drift risk becomes real.)

See the `pnp-web/GUIDELINES.md` for cross-cutting repo conventions.
