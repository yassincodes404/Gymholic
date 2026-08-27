# Gymholic Booking System — Reference

> Status: reflects the working tree as of 2026-08-27, including the booking-logic
> hardening pass (slot generation, conflict parity, stale-pending expiry, webhook
> containment, payment dedupe, authorization guards, past-time reschedule rejection,
> KV claim TTLs). File references use approximate line numbers.

---

## 1. Overview & Architecture

The product ships **two independent slot engines**. They do not share state.

| | Backend engine (Postgres) | Guest engine (Upstash KV) |
|---|---|---|
| Used by | Signed-in, email-verified users on `/book` | Guests (no JWT in `localStorage`) on `/book` |
| Slot source | `availability` windows (expert-local) + `bookings` table | Fixed template list of 6 times/day, Friday closed (`frontend/src/lib/bookingSlots.ts:7-33`) |
| Locking | Pessimistic lock on trainer row + conflict query | Redis `SET NX` with TTL |
| Code | Spring Boot: `backend/src/main/java/com/gymholic/**` | Next.js route handlers: `frontend/src/app/app-api/bookings/**`, `frontend/src/lib/kv.ts` |

Which engine runs is decided client-side: `/book` checks `getStoredAuthToken()`
(`frontend/src/app/book/page.tsx:135-137`). Signed-in users get live backend slots;
guests get the template calendar backed by KV (`GET /app-api/bookings/availability`,
`POST /app-api/bookings`).

Core backend modules: `availability` (windows + slot generation), `booking`
(state machine), `payment` (Paymob/mock providers + webhook), `notification`
(emails + schedulers), `calendar` (Zoom / Google Calendar+Meet), `settings`
(admin-managed pricing & toggles).

---

## 2. End-to-End User Journeys

### 2.1 Guest booking (KV flow)
1. Pick service → date → time from the fixed template slots; already-claimed times
   are read from `GET /app-api/bookings/availability?month=YYYY-MM`
   (`frontend/src/app/app-api/bookings/availability/route.ts`).
2. Details form → payment step. The guest card form is **simulated** (no gateway
   wired; `frontend/src/components/checkout/PaymentForm.tsx:24-73`).
3. `POST /app-api/bookings` — the only place a guest slot is locked:
   `kv.setIfNotExists(slot:<date>:<time>, GH-<ref>, ttlSeconds)` where the TTL
   runs out at **end of the booked date (UTC)** so abandoned claims self-clean
   (`frontend/src/app/app-api/bookings/route.ts:34-45`, `frontend/src/lib/kv.ts:55-61`).
   A lost race returns **409**.
4. Booking record stored at `booking:<ref>` (**no TTL** — see limitations) and a
   confirmation email is sent (`sendBookingConfirmationEmail`).
5. Daily Vercel cron `GET /app-api/bookings/remind` (09:00 UTC, Hobby-plan limit)
   emails a 24h reminder once per booking (`reminderSent` flag)
   (`frontend/src/app/app-api/bookings/remind/route.ts`).

### 2.2 Signed-in booking (backend flow)
1. **Trainer resolution** — `/book` calls `GET /api/availability/booking-trainer`:
   the trainer owning the **newest availability row** wins (whoever last edited
   working hours), else the lowest-id ADMIN-or-TRAINER user; the page falls back to
   `NEXT_PUBLIC_DEFAULT_TRAINER_ID` (default 1) if resolution fails
   (`AvailabilityService.java:86-93`, `book/page.tsx:37,142-165`).
2. **Slots** — `GET /api/availability/trainer/{id}/slots?date&clientTimezone` for
   the picked client-calendar day; the picker shows the returned times
   (`book/page.tsx:169-211`).
3. **Booking creation** — at submit the page **re-fetches slots** and requires the
   chosen time to still exist, then `POST /api/bookings` creates a **PENDING**
   booking (`book/page.tsx:277-345`); the backend re-validates everything
   (see §4). Admin gets an "awaiting payment" email with the resolved price.
4. **Payment** — `POST /api/payments`: amount resolved **server-side** from
   settings; duplicates rejected/reused (see §5).
   - **Paymob (prod)**: an Intention is created and Paymob's Unified Checkout is
     mounted in an **iframe on `/book`**; Paymob redirects the frame to
     `/payment-status`, which `postMessage`s the outcome back
     (`book/page.tsx:217-239,567-605`, `payment-status/page.tsx:20-26`).
   - **Mock (dev profile)**: `POST /api/payments/mock/{id}/complete` runs the full
     downstream chain inline (`DevPaymentController.java`, `PaymentService.completeMockPayment`).
5. **Webhook** — `POST /api/payments/webhook/paymob` (public, HMAC-SHA512
   verified): payment → COMPLETED, receipt email, then `confirmBooking`
   (§2.2.6). If the booking can no longer be confirmed, the payment stays
   COMPLETED, the admin is emailed for review/refund, and the webhook still ACKs
   (`PaymentService.java:131-193`).
6. **Confirmation** — `BookingService.confirmBooking` sets CONFIRMED and creates a
   meeting link: real **Zoom** when configured, otherwise a **Google Calendar**
   event whose **Meet link** is reused; both are best-effort (booking confirms
   without a link on API failure). Emails: client confirmation **with .ics invite**
   (Zoom/Meet labelled) and admin "confirmed & paid" with the paid amount
   (`BookingService.java:243-343`).
7. **Confirmation polling** — `/book` polls `GET /api/bookings/{id}` every 3 s
   (15 tries ≈ 45 s) for CONFIRMED/COMPLETED, then shows the confirmation step
   with the Meet link; on timeout it shows a "payment received — confirming by
   email" state (`book/page.tsx:241-275`).

### 2.3 Reschedule by token (no-show credit)
Admin marks a no-show → client receives a **one-time token link**
(`/reschedule?token=…`, default window 14 days, `RESCHEDULE_WINDOW_DAYS`).
Public endpoints: `GET /api/bookings/reschedule/{token}` (summary),
`GET …/slots?date&timezone`, `PUT …/{token}` — validates token, booking still
NO_SHOW, not expired, **future time**, availability + conflicts; sets the booking
straight back to **CONFIRMED** (session already paid), **consumes the token**,
updates the calendar event, emails reschedule notice (+ refreshed .ics) to the
client and a confirmation to the admin
(`BookingService.java:538-607,668-678`, `frontend/src/app/reschedule/page.tsx`).

### 2.4 Admin/trainer reschedule
`PUT /api/bookings/{id}/reschedule` (trainer/admin only): PENDING or CONFIRMED
bookings only, **rejects past times** ("Please choose a future time slot."),
re-validates duration/availability/conflicts (excluding itself), bumps
`rescheduleCount`, syncs the calendar event, emails the client. No dedicated admin
UI yet — the endpoint is API-driven (`BookingService.java:386-423`).

### 2.5 Cancellation
`PUT /api/bookings/{id}/cancel` (owner client / trainer / admin). PENDING or
CONFIRMED only; idempotent. Deletes the Google Calendar event when a CONFIRMED
booking had one (best-effort); emails the client the reason
(`BookingService.java:345-384`). Note: no client-facing cancel UI exists today
(the account page is read-only).

### 2.6 Completion
- **Automatic**: scheduler `autoCompletePastSessions` (cron `0 5/15 * * * *`)
  completes CONFIRMED sessions whose end passed ≥30 min → COMPLETED + thank-you
  email; i.e. completion lands **30–45 min after session end**
  (`ReminderScheduler.java:115-134`).
- **Manual**: `PUT /api/bookings/{id}/complete` (ADMIN).

### 2.7 No-show
`PUT /api/bookings/{id}/no-show` (ADMIN, from Admin → Bookings): CONFIRMED or
COMPLETED bookings only; records `expertAttended` + note, sets NO_SHOW, mints the
reschedule token/window. Client email differs by case (expert attended → keep
credit + reschedule link; expert missed → refund-or-rebook offer); admin email
flags "refund due" when the expert missed it (`BookingService.java:493-536`).

### 2.8 Reminders & follow-ups
- 24h reminder: hourly cron, CONFIRMED sessions starting within 24h, Redis
  dedupe flag (25 h TTL), sent to **client and expert in their own timezones**;
  toggle `REMINDER_24H_ENABLED` (`ReminderScheduler.java:46-73`).
- 1h reminder: every 15 min, within 1 h, flag TTL 2 h; toggle `REMINDER_1H_ENABLED`
  (`ReminderScheduler.java:80-107`).
- Follow-up: hourly cron, sessions COMPLETED with end 24–48 h ago, flag TTL 8 days,
  rebooking nudge; toggle `FOLLOW_UP_ENABLED` (`ReminderScheduler.java:156-190`).

### 2.9 Stale-pending expiry (NEW)
Scheduler every 15 min → `BookingService.expireStalePendingBookings()`: PENDING
bookings with `startTime < now` **or** `createdAt < now − 2 h` are auto-cancelled
(reason "Automatically cancelled — payment not completed"), the client gets a
"booking released" rebook email, and **no calendar cleanup** is attempted (PENDING
bookings never have events) (`ReminderScheduler.java:142-149`,
`BookingService.java:616-632`, `BookingRepository.findStalePendingBookings:39-43`).
This also frees slots the same client had locked: creation-time conflict checks
**ignore the requesting client's own PENDING holds**
(`BookingService.java:153-159`).

---

## 3. Availability & Slot Generation

Managed in Admin → Availability (weekly recurring windows; 45-min consultations
with a 5-min buffer generated inside them). Validation on create: `end > start`,
`dayOfWeek` required for recurring windows, exact duplicates rejected
(`AvailabilityService.createAvailability:39-70`).

**Working timezone.** Windows are interpreted in the expert's `users.timezone`
(IANA), editable via the "Working timezone" dropdown (Admin → Availability →
`PUT /api/users/me`, validated) (`admin/availability/page.tsx:130-148`,
`UserController.java:32-38`, `UserService.java:60-65`).

**Slot generation** (`AvailabilityService.getAvailableSlots:122-196`) — the `date`
parameter is the **client's calendar day**:

1. Compute the client-day instant range `[date 00:00, date+1 00:00)` in
   `clientTimezone` (lines 141-142).
2. Find every **expert-local date** spanned by that range (lines 143, 199-203).
3. Match windows (recurring by day-of-week, one-off by `specificDate`) across
   **every** spanned expert date (lines 146-148, 206-211).
4. Walk each window on a **minute-based grid**: slots start every 50 min, must fit
   45 min inside the window (`minute + 45 <= endMinute; minute += 50`) — no
   `LocalTime.plusMinutes` midnight wrap (lines 159-176).
5. Skip local times that don't exist (DST spring-forward gap) via
   `TimezoneUtils.timeExists` (line 171; `TimezoneUtils.java:99-108`).
6. Filter: **not in the past** (`!slot.isBefore(Instant.now())`, line 185),
   **starts within the client day** (line 186), **not booked** (below),
   **deduplicated** (overlapping/contained windows), sorted (lines 184-190).
7. Timezone chain: expert-local wall time → UTC instant (stored) → rendered in
   both client and expert zones in the DTO
   (`startTime`, `endTime`, `displayTime`, `expertDisplayTime`, both zone ids;
   `buildSlotDto:242-257`).

**Conflict parity rule (FIXED).** Listing blocks a slot iff a PENDING/CONFIRMED
booking overlaps it under the **same ±5-min-buffered interval-overlap rule used at
creation**: `[slotStart−5, slotEnd+5)` vs the booking interval. Candidate bookings
come from `findConflictingBookings` (PENDING/CONFIRMED only) over the client-day
range **padded ±45 min** so edge-spilling sessions are considered
(`isSlotBooked:230-237`, `getBookingsForRange:218-223`,
`BookingRepository.java:32-37`). (Difference vs creation: listing counts the
viewer's *own* PENDING hold as taken — you can't double-click your held slot —
while creation ignores it.)

**Booking-trainer resolution.** `GET /api/availability/booking-trainer` → owner of
the newest availability row, else lowest-id ADMIN-or-TRAINER user
(`AvailabilityService.resolveBookingTrainer:86-93`). Single-expert product; see
limitations.

---

## 4. Booking Validation & State Machine

Statuses (`BookingStatus.java`): `PENDING → CONFIRMED → COMPLETED`, plus
`CANCELLED`, `REJECTED`, `NO_SHOW`.

| From | To | Trigger | Enforced in |
|---|---|---|---|
| — | PENDING | `POST /api/bookings` (validations below) | `BookingService.createBooking:90-193` |
| PENDING | CONFIRMED | payment success (webhook / mock) or admin `PUT /{id}/confirm`; idempotent for CONFIRMED/COMPLETED | `PaymentService:160-193,226-238`; `BookingService.confirmBooking:243-343` |
| PENDING | CANCELLED | owner/trainer/admin cancel; **auto-expiry of stale holds** (start passed or 2 h abandoned) | `cancelBooking:345-384`; `expireStalePendingBookings:616-632` |
| PENDING | REJECTED | admin `PUT /{id}/reject` (reason emailed; refunds manual) | `rejectBooking:430-454` |
| CONFIRMED | CANCELLED | owner/trainer/admin cancel (+ calendar event delete) | `cancelBooking:345-384` |
| CONFIRMED | COMPLETED | scheduler (end + 30–45 min) or admin `PUT /{id}/complete` | `ReminderScheduler:115-134`; `completeSession:461-484` |
| CONFIRMED / COMPLETED | NO_SHOW | admin `PUT /{id}/no-show`; mints one-time reschedule token (`RESCHEDULE_WINDOW_DAYS`, default 14) | `markNoShow:493-536` |
| NO_SHOW | CONFIRMED | client uses token link (future time re-validated; token consumed) | `rescheduleByToken:564-607` |
| PENDING / CONFIRMED | (same) | trainer/admin reschedule (`PUT /{id}/reschedule`), past times rejected | `rescheduleBooking:386-423` |

**Creation validations** (`createBooking` + `validateNewTime`): end after start;
**duration exactly 45 min**; valid IANA `clientTimezone`; slot inside an
availability window in the expert's zone; buffered conflict check
(`findConflictingBookings` over `[start−5, end+5)`) counting PENDING/CONFIRMED
bookings **except the requesting client's own PENDING** holds. Timezone triple
stored on the booking: `expertTimezone`, `clientTimezone`,
`meetingTimezone` (= expert zone).

**Reschedule validations** (both paths): status PENDING/CONFIRMED (token path:
NO_SHOW + valid token), **future start time** ("Please choose a future time
slot."), duration/availability/conflict re-check excluding the booking itself,
then calendar sync + emails.

---

## 5. Concurrency & Consistency Protections

- **Trainer-row pessimistic lock** — `createBooking` loads the trainer via
  `findByIdForUpdate` (`PESSIMISTIC_WRITE`), serializing competing bookings on the
  same expert (`UserRepository.java:31-33`, `BookingService.java:95`).
- **KV `SET NX` + TTL** — guest slot claims are atomic; losers get 409. Claims
  now carry a TTL expiring at end of the booked date (min clamp 60 s)
  (`kv.ts:55-61`, `app-api/bookings/route.ts:34-45`).
- **Payment idempotency + reuse (FIXED)** — `createPayment` rejects when any
  COMPLETED payment exists ("This booking is already paid.") and **reuses** an
  existing same-provider PENDING payment instead of stacking rows
  (`PaymentService.java:53-66`). The webhook ignores events for payments already
  COMPLETED (lines 155-158); mock completion is idempotent too.
- **Webhook HMAC + no-rollback containment (FIXED)** — Paymob webhooks are
  HMAC-SHA512 verified over the canonical field order
  (`PaymobProvider.verifyWebhook:197-260`). `handlePaymobWebhook` is deliberately
  **not one transaction**: the COMPLETED payment persists first; a subsequent
  `confirmBooking` failure (booking cancelled/rejected/no-show) is caught, logged,
  escalated via `sendAdminPaymentReviewNeeded`, and the webhook still ACKs — a
  captured payment is never rolled back to PENDING, so Paymob doesn't retry forever
  (`PaymentService.java:131-193`).
- **Reschedule token single-use** — token + expiry nulled on use; endpoint
  additionally requires status NO_SHOW (`BookingService.java:580-581,668-678`).
- **Reminder dedupe flags** — Redis `setIfAbsent` with TTL per booking/purpose
  (25 h / 2 h / 8 days) (`ReminderScheduler.java:59-63,93-97,175-179`).
- **Server-side pricing** — checkout amount comes from
  `BookingService.resolveBookingPrice` (settings-driven by service type in the
  notes; open-session fallback so nothing is ever free by accident); client-sent
  amounts are ignored, and zero-priced services block checkout
  (`PaymentService.java:68-76`, `BookingService.java:195-220`).
- **Slot re-check at submit** — `/book` re-fetches the slot list and requires the
  chosen time to still be offered before `POST /api/bookings`; the backend
  independently re-validates (`book/page.tsx:277-345`).

---

## 6. Security & Authorization

**HTTP-level gates** (`SecurityConfig.java:57-81`):
- Public: `/api/auth/**`, `/api/admin/auth/**` (access-key cloaked), actuator,
  swagger, `/api/payments/webhook/**`, `/api/payments/active-provider`,
  Google OAuth callback, `POST /api/whitelist`, `GET /api/settings/pricing`,
  `/api/bookings/reschedule/**` (token-protected), assessment endpoints.
- `/api/payments/**`, `/api/orders/**`, `/api/cart/**`, `/api/bookings/**`
  require authority **`EMAIL_VERIFIED`** (granted only after the one-time email
  code; `CustomUserDetailsService.java:21,33-35`).
- `/api/admin/**` requires `ROLE_ADMIN`; everything else authenticated.

**Booking-service guards (NEW → `AccessDeniedException` → 403 via
`GlobalExceptionHandler.java:39-43`)** — `requireCurrentUser`, `assertCanAccess`,
`assertSelfOrAdmin`, `assertTrainerOrAdmin` (`BookingService.java:634-666`):

| Endpoint | Who |
|---|---|
| `GET /api/bookings/{id}` | its client, its trainer, admin |
| `GET /api/bookings/client/{id}` | that user (self) or admin |
| `GET /api/bookings/trainer/{id}` | that trainer (self) or admin |
| `PUT /api/bookings/{id}/confirm` | **ADMIN only** (`@PreAuthorize`, `BookingController.java:63-69`); the service-level confirm called from `PaymentService` needs no security context |
| `PUT /api/bookings/{id}/cancel` | owner client, trainer, admin |
| `PUT /api/bookings/{id}/reschedule` | trainer or admin |
| `PUT /{id}/complete`, `/{id}/reject`, `/{id}/no-show` | ADMIN (`@PreAuthorize`) |
| `POST /api/availability` | ADMIN or TRAINER (`AvailabilityService.java:43-45`) |
| `DELETE /api/availability/{id}` | owning trainer or admin (`AvailabilityService.java:259-276`) |

**Admin access key** — `/api/admin/auth/**` without a matching
`X-Admin-Access-Key` header returns 404 (constant-time compare), cloaking the
admin login endpoint (`AdminAccessKeyFilter.java:36-48`).

**Rate limits** — in-memory sliding windows per client IP on credential endpoints:
login/google 10/5 min, register 10/h, OTP request 5/15 min, OTP verify 20/15 min,
resend 5/15 min, forgot-password 5/15 min, admin login 8/10 min; over → 429
(`AuthRateLimitFilter.java:26-51`, `RateLimitService.java:31-39`).

**Known weakness:** the frontend JWT lives in `localStorage.jwt_token`
(`frontend/src/lib/api.ts:15-21`).

---

## 7. Handled Scenarios (exhaustive)

### Creation / availability
1. Slot list respects the **client's calendar day** even when it spans two expert-local dates (FIXED).
2. Big timezone offsets: windows from both spanned expert dates are matched (FIXED).
3. Only slots that **start inside the picked client day** are returned (FIXED).
4. Past slots hidden at listing (`!isBefore(Instant.now())`) (FIXED); past times rejected at admin reschedule (FIXED: `BookingService.java:396-398`) and token reschedule (`:568-570`).
5. DST spring-forward: nonexistent expert-local times skipped (`timeExists`) (FIXED).
6. Windows ending late in the day: minute-based grid, no midnight wrap / infinite loop (FIXED).
7. Overlapping/duplicate windows: slots deduplicated (FIXED).
8. Listing conflict rule identical (±5-min buffered overlap) to creation rule; candidates fetched over client-day ±45 min so edge-spilling sessions count (FIXED).
9. Guest KV slot race: exactly one winner (`SET NX`), loser gets 409 + friendly message.
10. Guest abandoned claims self-clean at end of booked date (FIXED: TTL).
11. Duplicate availability window rejected; end≤start rejected; recurring without day-of-week rejected.
12. Trainer resolution can't drift from the admin's schedule (newest-window owner).
13. Frontend falls back to `NEXT_PUBLIC_DEFAULT_TRAINER_ID` when resolution fails.
14. No availability for the date → empty list, calendar shows closed/unavailable.
15. Booking duration forced to exactly 45 minutes.
16. Booking outside any availability window rejected (expert-local evaluation).
17. Double-booking a trainer blocked (buffered overlap vs PENDING/CONFIRMED) under a per-trainer row lock.
18. Client's own unpaid holds don't block their fresh booking attempt (FIXED); abandoned holds auto-release in ≤15 min (FIXED).
19. Invalid/missing client timezone rejected (IANA validation both ends).
20. Zero-priced service blocks checkout instead of creating a free paid session.
21. Slot re-checked at submit; stale selection → "no longer available" and step-back.

### Payment
22. Duplicate checkout on a paid booking rejected ("This booking is already paid.") (FIXED).
23. Checkout retries reuse the existing same-provider PENDING payment (FIXED).
24. Amount always server-resolved from settings; tampered client amounts ignored.
25. Paymob not configured/enabled → checkout refused with setup hint; embedded iframe only when active.
26. Webhook HMAC verified (SHA-512, canonical field order); bad signature → 400.
27. Webhook idempotent for already-COMPLETED payments.
28. Payment COMPLETED persists even if booking confirmation then fails — no rollback to PENDING, no Paymob retry loop (FIXED).
29. Late payment on a cancelled/rejected/no-show booking → admin review email (`admin-payment-review`) instead of silent divergence (FIXED).
30. Payment receipt email to client; failed (non-pending) transactions mark payment FAILED.
31. Pending transactions leave payment PENDING (no false confirmation).
32. Mock provider (dev profile) exercises the full payment→confirm→calendar→email chain and is idempotent.
33. Frontend polls the booking after iframe checkout; timeout shows an honest "confirming by email" state instead of hanging.
34. Failed/cancelled card entry returns the user to the datetime step with slot reset; payment-status page renders success/pending/failure from the redirect params.

### Lifecycle / admin
35. Confirm idempotent (already CONFIRMED/COMPLETED → no-op); only PENDING confirmable over the admin endpoint.
36. Meeting link: Zoom when configured, else Google Calendar+Meet; failures degrade gracefully (confirmed booking without link).
37. Confirmation email includes .ics invite and labels the platform (Zoom/Meet).
38. Admin "new booking awaiting payment" email includes resolved price/currency (ADMIN_NOTIFY_EMAIL override honored).
39. Cancel idempotent; only PENDING/CONFIRMED cancellable; calendar event deleted when present (best-effort); reason emailed.
40. Reject (admin) emails reason; manual refund flagged when paid.
41. Complete (admin or scheduler, 30–45 min after end) idempotent; thank-you email.
42. No-show variants: expert attended (credit + one-time reschedule link) vs expert missed (refund/rebook offer + admin "refund due" email).
43. Reschedule token: single-use, expiry-checked, status-checked (NO_SHOW only), future-time-checked; new time fully re-validated; booking returns CONFIRMED (already paid).
44. Admin/trainer reschedule re-validates everything, bumps reschedule count, syncs calendar event, emails client.
45. Reschedule window configurable (`RESCHEDULE_WINDOW_DAYS`, min 1 day).
46. Stale PENDING auto-expiry (start passed or 2 h abandoned): cancelled + rebook email + slot freed; no calendar side-effects (FIXED).
47. Reminders 24 h + 1 h to both parties in their own timezones, deduped, individually switchable.
48. Follow-up 24–48 h after completion, deduped, switchable, links back to `/book`.
49. Booking detail visibility scoped (client/trainer/admin); scoped listings self/admin; 403 otherwise (FIXED).
50. Availability create/delete restricted (admin/trainer; owner-trainer/admin for delete) (FIXED).

### Timezone
51. Windows interpreted in the expert's editable working timezone; invalid IDs rejected on save.
52. Chain expert-local → UTC instant → client-tz display (both zones returned per slot).
53. Booking stores expert/client/meeting timezones at creation; emails render each recipient's zone (client vs expert variants).
54. Reschedule-link slots honor the caller's browser timezone (falls back to the stored client timezone).
55. DST-gap slots skipped (FIXED); reminders format per-recipient zone.

### Resilience / degradation
56. Zoom failure → Google Meet fallback; both failing → confirmed booking without link.
57. Calendar cancel/update failures logged, never fail the booking action.
58. Email failures don't break booking/payment state (log-and-continue in services).
59. Upstash KV not configured → guest flow warns and no-ops rather than crashing (dev-friendly; slot locking silently disabled).
60. Backend slot fetch errors on `/book` surface in the picker without killing the page.
61. Webhook containment: wrong-state bookings never poison payment state (FIXED).
62. Scheduler loops are individually try/catch per booking — one bad row can't kill the run; expiry is idempotent by status guard.
63. Redis dedupe flags carry TTLs, so reminder suppression self-heals.
64. Guest reminder cron degrades gracefully to once-daily (platform limit), tracked via `reminderSent`.
65. Unknown routes → 404 envelope; validation errors → field map; access denied → 403 envelope.

---

## 8. Remaining Known Limitations (verified post-fix)

1. **Two slot engines never reconcile** — backend Postgres bookings and guest KV claims are invisible to each other; a guest and a signed-in user can book the same wall-clock time.
2. **Guest `booking:{ref}` KV records have no TTL** — only `slot:` claims expire; booking records accumulate forever.
3. **Paymob refunds unimplemented** — `PaymobProvider.refund` throws `UnsupportedOperationException`; refunds are a manual admin process flagged by email.
4. **Paying a CANCELLED/REJECTED/NO_SHOW booking isn't rejected upfront** — `createPayment` checks only for an existing COMPLETED payment, so the money is captured and lands in the admin-review containment path after the webhook.
5. **localStorage JWT** (`frontend/src/lib/api.ts`) — XSS-exposed token storage.
6. **Single-expert "last editor wins" trainer resolution** — any admin/trainer who saves working hours becomes the booking target (creation is now admin/trainer-only, but the rule remains).
7. **No per-slot capacity** — a slot is binary free/taken; no group sessions.
8. **Auto-completion lag** — COMPLETED arrives 30–45 min after session end; a client who attends late can briefly see CONFIRMED, and no-show marking may race the scheduler (admin can still override).
9. Webhook `catch` covers only `BadRequestException`; other exceptions (e.g. unknown order → `ResourceNotFoundException`) still return 400 and invite Paymob retries.
10. Guest slot-claim TTL is computed against **UTC** end-of-day, not the client's timezone (± hours of skew possible).
11. Guest reminder cadence limited to once daily (Vercel Hobby); no expert reminder in the guest flow.
12. Stripe webhook is a stub; Stripe provider unused.
13. No client-facing cancel/reschedule UI (API allows owner cancel; account page is read-only); no admin UI for `PUT /{id}/reschedule`.
14. Availability windows cannot cross midnight (`end > start` validation).
15. Reminder dedupe depends on Redis availability — Redis outage ⇒ repeated reminder emails per scheduler run.
16. `timeIsAmbiguous` (DST fall-back) exists but is unused — ambiguous times resolve to the earlier offset silently.

---

## 9. Appendix

### 9.1 Endpoint quick reference

**Backend (Spring, prefix `/api`)**

| Method & path | Auth |
|---|---|
| `POST /bookings` | USER + EMAIL_VERIFIED |
| `GET /bookings/{id}` | USER — owner client / trainer / admin (403 otherwise) |
| `GET /bookings/client/{id}` | USER — self / admin |
| `GET /bookings/trainer/{id}` | USER — self / admin |
| `PUT /bookings/{id}/confirm` | **ADMIN** |
| `PUT /bookings/{id}/cancel` | USER — owner / trainer / admin |
| `PUT /bookings/{id}/reschedule` | USER — trainer / admin |
| `PUT /bookings/{id}/complete` | ADMIN |
| `PUT /bookings/{id}/reject` | ADMIN |
| `PUT /bookings/{id}/no-show` | ADMIN |
| `GET|PUT /bookings/reschedule/{token}` (+`/slots`) | PUBLIC (token-protected) |
| `GET /availability/booking-trainer` | USER |
| `GET /availability/trainer/{id}` , `…/slots` | USER |
| `POST /availability` | ADMIN / TRAINER |
| `DELETE /availability/{id}` | owning trainer / admin |
| `POST /payments` | USER + EMAIL_VERIFIED |
| `GET /payments/me` , `/{id}` , `/booking/{id}` | USER |
| `GET /payments/active-provider` | PUBLIC |
| `POST /payments/webhook/paymob` | PUBLIC (HMAC) |
| `POST /payments/mock/{id}/complete` | USER (dev profile only) |
| `PUT /users/me` (timezone etc.) | USER |
| `GET /settings/pricing` | PUBLIC |
| `GET|PUT /settings` | ADMIN |
| `/admin/**` | ADMIN (+ access-key cloak on `/admin/auth/**`) |

**Frontend (Next.js, prefix `/app-api`)**: `POST /bookings` (public, KV claim),
`GET /bookings/availability` (public), `GET /bookings/remind` (Vercel cron).

### 9.2 Settings keys (admin-managed, defaults in parentheses)

`BOOKING_CURRENCY` (USD) · `BOOKING_PRICE_STRATEGY_CALL` (125) ·
`BOOKING_PRICE_IN_PERSON` (275) · `BOOKING_PRICE_OPEN_SESSION` (150) ·
`ADMIN_NOTIFY_EMAIL` (trainer inbox) · `RESCHEDULE_WINDOW_DAYS` (14) ·
`REMINDER_24H_ENABLED` (true) · `REMINDER_1H_ENABLED` (true) ·
`FOLLOW_UP_ENABLED` (true) · `PAYMOB_API_KEY / PAYMOB_INTEGRATION_ID /
PAYMOB_IFRAME_ID / PAYMOB_HMAC_SECRET / PAYMOB_PUBLIC_KEY / PAYMOB_ENABLED`
(env fallback). Env-only: `NEXT_PUBLIC_DEFAULT_TRAINER_ID` (1),
`ADMIN_ACCESS_KEY`, `app.payments.mock-enabled`.

### 9.3 Key files map

| Area | File |
|---|---|
| Slot generation / windows / trainer resolution | `backend/src/main/java/com/gymholic/availability/AvailabilityService.java` |
| Booking state machine, guards, expiry, pricing | `backend/.../booking/BookingService.java`, `BookingController.java`, `BookingRepository.java`, `entity/Booking.java` |
| Payments / webhook containment / dedupe | `backend/.../payment/PaymentService.java`, `PaymentController.java`, `webhook/PaymentWebhookController.java`, `provider/PaymobProvider.java`, `provider/MockPaymentProvider.java` |
| Schedulers (reminders, auto-complete, expiry) | `backend/.../notification/ReminderScheduler.java` |
| Emails / templates / .ics | `backend/.../notification/NotificationService.java`, `IcsService.java`, `resources/templates/*` (incl. `booking-expired.html`, `admin-payment-review.html`) |
| Meetings / calendar | `backend/.../calendar/ZoomService.java`, `CalendarService.java`, `GoogleCalendarService.java` |
| Security | `backend/.../config/SecurityConfig.java`, `security/*` (JWT, rate limit, admin key), `common/exception/GlobalExceptionHandler.java` |
| Timezone utilities | `backend/.../common/util/TimezoneUtils.java`, `DateTimeUtils.java` |
| Booking UI / paid flow / polling | `frontend/src/app/book/page.tsx`, `payment-status/page.tsx`, `components/booking/*` |
| Guest KV flow | `frontend/src/app/app-api/bookings/*`, `lib/kv.ts`, `lib/bookingSlots.ts` |
| Reschedule page | `frontend/src/app/reschedule/page.tsx` |
| Admin availability (+ timezone) | `frontend/src/app/admin/availability/page.tsx` |
| Admin bookings lifecycle | `frontend/src/app/admin/bookings/page.tsx` |
| Tests | `backend/src/test/java/com/gymholic/booking/{BookingLifecycleAuthorizationTest, BookingServiceStalePendingTest, BookingExpiryIntegrationTest, BookingCreationConflictIntegrationTest}.java`, `integration/SlotGenerationIntegrationTest.java`, `integration/TimezoneIntegrationTest`, `payment/PaymentServiceTest` |
