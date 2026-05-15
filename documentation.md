# Project Documentation

This file tracks design decisions, current state, and context for each file. Read this at the start of a new session to get up to speed quickly.

---

## File Structure

```
src/
  app/
    api/
      game/
        start/route.ts          (complete — POST: place bet, deal initial cards)
        action/route.ts         (complete — POST: apply player action)
        state/route.ts          (complete — GET: fetch active game state + username + email)
      leaderboard/route.ts      (complete — GET: time-period gains/losses/richest leaderboard)
      reward/route.ts           (complete — POST: credit +$10 after watching rewarded ad; patches active game state if mid-round)
    auth/
      confirm/route.ts          (complete — handles PKCE code exchange and token_hash OTP verification)
    check-email/page.tsx        (complete — shown after signup)
    email-confirmed/page.tsx    (complete — shown after signup email confirmation)
    email-changed/page.tsx      (complete — shown after email change confirmation, reads ?message= param)
    forgot-password/page.tsx    (complete — sends password reset email)
    game/page.tsx               (complete — full game UI with account/rules/leaderboard modals)
    leaderboard/                (empty — future standalone leaderboard page)
    login/page.tsx              (complete — reads ?error=invalid-link from URL)
    profile/                    (empty — future profile page)
    rules/                      (empty — future standalone rules page)
    signup/page.tsx             (complete — pre-checks username uniqueness before calling signUp)
    update-password/page.tsx    (complete — used after password reset link, redirects client-side)
    globals.css                 (complete — CSS variables design system)
    icon.svg                    (complete — green ♠ favicon)
    layout.tsx                  (complete — title "WilsonBlackjack", Google H5 Games Ads script injected when NEXT_PUBLIC_ADSENSE_CLIENT is set)
    page.tsx                    (redirected by middleware)
  components/
    AccountModal.tsx            (complete — overlay with username/email/password/delete account)
    RulesModal.tsx              (complete — static rules overlay, all game rules sectioned)
    LeaderboardModal.tsx        (complete — gains/losses/rich list with daily/weekly/monthly tabs)
    AdOverlay.tsx               (complete — rewarded ad overlay; uses Google H5 Games API, falls back to "unavailable" if no ad loads)
    ActionButtons.tsx           (stub)
    BankrollDisplay.tsx         (stub)
    Card.tsx                    (stub)
    Hand.tsx                    (stub)
    LeaderboardTable.tsx        (stub)
    RecommendationPanel.tsx     (stub)
    Table.tsx                   (stub)
  engine/
    constants.ts                (complete)
    types.ts                    (complete)
    shoe.ts                     (complete)
    hand.ts                     (complete)
    rules.ts                    (complete)
    dealer.ts                   (complete)
    settle.ts                   (complete — payout bug fixed: returns gross amounts)
    recommendation.ts           (complete — full basic strategy engine)
  lib/
    auth.ts                     (complete — signUp, signIn, signOut, getUser, updateUsername,
                                  updateEmail, resetPassword, updatePassword, deleteUser)
    db.ts                       (complete — getProfile, getWallet, getActiveGame, createGame,
                                  saveGameState, loadGameState, completeRound)
    gameUtils.ts                (complete — sanitizeState: hides dealer hole card)
    supabase/
      server.ts                 (complete — createClient, createAdminClient)
    utils.ts                    (empty)
  middleware.ts                 (complete — auth redirects for protected/auth-only routes)
```

---

## Current Progress

- Phase 1 (Project Setup) — complete
- Phase 2 (Game Engine) — complete (93 tests across 6 files)
- Phase 3 (Database) — complete
- Phase 4 (Auth) — complete
- Phase 5 (API) — complete
- Phase 6 (UI) — complete (game page, all auth pages, account/rules/leaderboard/ad modals)
- Phase 7 (Leaderboard/Stats) — API complete, modal complete; standalone page not built
- Phase 8 (Testing) — engine tests complete; manual UI testing ongoing
- Phase 9 (Deployment) — not started

### DB migration required (run in Supabase SQL editor if not already done):
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS state jsonb;
```

---

## Design System (`src/app/globals.css`)

Supabase-inspired dark theme using CSS custom properties:

```css
--bg:      #0f0f0f   /* page background */
--surface: #171717   /* cards, panels */
--border:  #2e2e2e   /* dividers, input borders */
--brand:   #3ecf8e   /* green accent (buttons, focus, highlights) */
--text:    #f2f2f2   /* primary text */
--muted:   #8f9094   /* secondary text, labels */
```

All styled components use these variables via inline styles. Tailwind is used for layout/spacing only.

---

## `src/engine/recommendation.ts`

Full basic strategy recommendation engine. Runs entirely client-side — no server call needed.

### `getRecommendation(state: GameState): Recommendation | null`
Returns `{ action: ActionType, reason: string }` or `null` when no recommendation is appropriate (e.g. settled phase).

Covers in order:
1. **Insurance phase** — always `decline-insurance`
2. **Pair splits** — A-A always split, 8-8 always split, standard pair rules for others
3. **Surrender** — hard 16 vs 9/10/A, hard 15 vs 10
4. **Soft totals** — soft 13–18 with doubling decisions
5. **Hard totals** — hard 8–17+ with doubling decisions

---

## Auth (`src/lib/auth.ts`)

All functions are `"use server"` server actions.

### `signUp(email, password, username)`
Pre-checks username uniqueness against `profiles` table (admin client) before calling `supabase.auth.signUp`. Returns `{ error }` if username is taken — prevents cryptic "Database error saving new user" from the DB trigger. Includes `emailRedirectTo` pointing to `/auth/confirm` for PKCE email confirmation flow. Redirects to `/check-email` on success.

### `signIn(email, password)`
Calls `supabase.auth.signInWithPassword`. Redirects to `/game` on success.

### `signOut()`
Calls `supabase.auth.signOut`. Redirects to `/login`.

### `updateUsername(username)`
Checks uniqueness (excluding current user) then updates `profiles.username` via admin client. Also calls `supabase.auth.updateUser({ data: { username, full_name: username } })` to sync Supabase auth display name.

### `updateEmail(email)`
Calls `supabase.auth.updateUser({ email }, { emailRedirectTo: siteUrl/email-changed })`. Supabase sends confirmation emails to both old and new addresses. Both must be confirmed before the change takes effect ("Secure email change" setting). The `emailRedirectTo` doesn't always work perfectly with Supabase — if the hash fragment fallback triggers, the game page detects `#message=` and redirects to `/email-changed`.

### `resetPassword(email)`
Calls `supabase.auth.resetPasswordForEmail` with `redirectTo: siteUrl/auth/confirm?next=/update-password`. Uses PKCE flow — Supabase handles OTP verification, then redirects to `/auth/confirm?code=...&next=/update-password`.

### `updatePassword(newPassword, currentPassword?)`
If `currentPassword` provided (account modal flow): re-authenticates first via `signInWithPassword` to verify. Returns `{ error: "Current password is incorrect." }` on failure. If no `currentPassword` (reset-via-link flow): skips re-auth (recovery session is the authorization). Calls `supabase.auth.updateUser({ password })`. Does NOT redirect — callers handle navigation.

### `deleteUser()`
Deletes all user data in dependency order to avoid FK constraint failures:
1. `hands` (via game_id)
2. `transactions` + `games` (parallel)
3. `wallets` + `profiles` (parallel)
4. Auth user via `admin.auth.admin.deleteUser`

Redirects to `/signup` on success.

---

## Email Confirmation Flow (`src/app/auth/confirm/route.ts`)

GET route handler. Handles two flows:

### PKCE flow (signup, password reset)
Supabase verifies the OTP on its own servers and redirects here with `?code=XXX`. We call `supabase.auth.exchangeCodeForSession(code)` to establish the session. Redirects to `?next` param (defaults to `/email-confirmed`).

### Token-hash flow (email change fallback)
If `token_hash` and `type` params are present, calls `supabase.auth.verifyOtp({ token_hash, type })`. Email change types (`email_change_current`, `email_change_new`) redirect to `/email-changed`. Other types redirect to `?next` param.

### Email templates (must be configured in Supabase dashboard)

**Confirm signup** — uses `{{ .ConfirmationURL }}`:
```html
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
```

**Reset password** — uses `{{ .ConfirmationURL }}`:
```html
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
```

**Change Email Address** — uses `{{ .ConfirmationURL }}`:
```html
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
```

### Supabase redirect URLs (must be whitelisted)
- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/email-changed`
- Production URLs when deployed

---

## Email (Resend SMTP)

Custom SMTP via Resend. Configured in Supabase → Project Settings → Auth → SMTP.

- Host: `smtp.resend.com`, Port: `465`
- Username: `resend`, Password: Resend API key
- Sender: `noreply@thomasw.me` (domain verified in Resend)
- Domain `thomasw.me` DNS managed via Cloudflare (4 records: DKIM TXT, MX, SPF TXT, DMARC TXT)

Free tier: 3,000 emails/month, 100/day. Without a verified domain, Resend only allows sending to the account owner's email.

---

## Middleware (`src/middleware.ts`)

Runs on all non-static routes. Calls `supabase.auth.getUser()` to refresh the session.

```
PROTECTED = ["/game", "/profile", "/leaderboard", "/update-password"]
AUTH_ONLY  = ["/login", "/signup", "/check-email", "/forgot-password"]
```

- Unauthenticated + PROTECTED → `/login`
- Authenticated + AUTH_ONLY → `/game`
- Any request to `/` → `/game` (authenticated) or `/login` (unauthenticated)

`/auth/confirm`, `/email-confirmed`, `/email-changed` are intentionally unguarded.

---

## Game Page (`src/app/game/page.tsx`)

Client component. Loads state from `/api/game/state` on mount (bankroll, username, email, active game if any).

### Features
- **Header**: "♠ WilsonBlackjack" logo + live bankroll + `+` button (opens ad overlay) on the left; Rules, Leaderboard, username, Sign out on the right
- **Modals**: `activeModal` state (`'account' | 'rules' | 'leaderboard' | null`) + `showAd` boolean — only one open at a time
- **Ad overlay**: opens via `+` button next to bankroll, or auto-opens when bet > bankroll on Deal. Uses Google H5 Games rewarded ad API (`adBreak`). 6s timeout shows "No ad available" if nothing loads. On `adViewed`, calls `/api/reward` to credit $10
- **Table panel**: dealer section + player section inside a surface card; controls live inside so table size never changes between states
- **Cards**: `CardView` — white cards with corner rank/suit pips and large center suit symbol. `HiddenCard` — dark card with `?`. `compact` prop for split hands
- **Hand totals**: displayed below cards, showing "7 or 17" format for soft hands
- **Split hands**: rendered side-by-side with `flex-row`; active hand highlighted with brand border + green tint
- **Action buttons**: Hit (brand green fill), Stand/Double/Split/Decline (outlined), Surrender (red outline). Double/Split/Surrender disabled via `canDouble`/`canSplit`/`canSurrender` engine functions
- **Insurance phase**: Take Insurance + Decline buttons + hint toggle
- **Hint**: "Show Hint" / "Hide Hint" toggle; recommendation row always in DOM with opacity toggle to prevent layout shift
- **Betting**: `$` prefix input (type=text, inputMode=numeric), minimum $10 enforced on blur + backend. Deal button → starts game
- **Between rounds**: placeholder elements maintain table layout; Next Round → clears state
- **Hash fragment handler**: detects `#message=` from Supabase email change callbacks and redirects to `/email-changed?message=...`

---

## Account Modal (`src/components/AccountModal.tsx`)

Fixed overlay (dark backdrop + centered card). Opens when username button is clicked. Receives `initialUsername`, `initialEmail`, `onClose`, `onUsernameChange` props.

### Sections
1. **Username** — inline input + Save. Disabled until value differs from current. Checks uniqueness server-side via `updateUsername`.
2. **Email** — inline input + Save. Shows two-inbox confirmation notice on success. Uses `updateEmail`.
3. **Password** — current password + new password + confirm password + Save. Re-auth required (passes both to `updatePassword`). Validates match and minimum length client-side before calling server.
4. **Danger zone** — "Delete account" → confirmation step with warning text → "Yes, delete everything". Uses `deleteUser` which wipes all data in order.

All sections show inline success (brand green) or error (red) messages. No full-page redirects except after account deletion.

---

## API Routes

All routes require an authenticated session. Writes use the admin client (service role).

### `POST /api/game/start`
Body: `{ bet: number }`. Validates bet against wallet balance, rejects if active game exists, initializes GameState + Shoe via engine, handles immediate player blackjack (plays dealer + settles inline), saves to `games.state`, returns `{ gameId, state }` (hole card hidden).

### `POST /api/game/action`
Body: `{ gameId: string, action: ActionType }`. Loads game state, validates action legality, calls `applyPlayerAction`. After insurance resolves, auto-advances player blackjack to dealer-turn. When phase reaches `"dealer-turn"`: plays dealer hand, resolves insurance payout, calls `settleRound`, marks game complete via `completeRound`. Returns `{ state }`.

### `GET /api/game/state`
Returns `{ gameId, state, balance, username, email }` for the user's active game, or `{ gameId: null, state: null, balance, username, email }` if none. Balance during active game comes from `gameState.bankroll` (reflects live bet deduction), not wallet table.

### `POST /api/reward`
No body. Adds $10 to the user's wallet and inserts a `type: "reward"` transaction. If an active game exists, also patches `gameState.bankroll` in `games.state` so the UI and any reload reflect the correct value without waiting for round completion. Returns `{ balance }` — the value shown in the header (game state bankroll during a round, wallet balance otherwise).

### `GET /api/leaderboard`
Returns `{ dailyGains, dailyLosses, weeklyGains, weeklyLosses, monthlyGains, monthlyLosses, richest }`. Each is an array of `{ username, amount }` (top 10). Time windows: 24h / 7d / 30d. Gains = net positive aggregates, Losses = net negative. Richest = top wallets by balance. Uses admin client to bypass RLS.

---

## Database (Supabase)

PostgreSQL via Supabase. RLS enabled on all tables. All writes go through the server using the service role key.

### Tables
- `profiles` — `id` (FK → auth.users), `username`, `created_at`
- `wallets` — `user_id` (PK, FK → profiles), `balance` (integer, whole dollars), `updated_at`
- `games` — `id`, `user_id`, `started_at`, `ended_at`, `status` ('active'|'complete'), `outcome_summary` (jsonb), `state` (jsonb — live GameState+Shoe, null when complete)
- `hands` — `id`, `game_id`, `hand_index`, `player_cards`, `dealer_cards`, `wager`, `insurance_wager`, `result`, `doubled`, `split_from_hand_id`
- `transactions` — `id`, `user_id`, `game_id`, `type`, `amount`, `created_at`

### Design decisions
- `wallets.balance` is integer — avoids floating point issues
- Cards stored as `jsonb` in `hands` — no normalization needed
- `games.state` stores `{ gameState, shoe }` during active round, set to null on completion
- `transactions.game_id` uses `on delete set null` — history survives game deletion
- `settle.ts` payout is gross: win = 2×bet, push = bet returned, lose = 0, blackjack = bet × 2.5, surrender = bet × 0.5. `startRound` deducts bet upfront.
- Insurance resolved in action route, not engine — checked after `playDealerHand` via `isBlackjack(dealerHand)`
- Starting bankroll: $250 (set by DB trigger `on_auth_user_created`)
- Reward transactions use `type: "reward"`, `game_id: null` — credited outside of a round

### RLS / grants
All tables have RLS enabled. Select policies let users read their own rows. No client-side write policies. Run manually:
```sql
GRANT SELECT ON public.<table> TO authenticated;
-- and for all sequences:
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

---

## Engine Files

### `src/engine/types.ts`
All core TypeScript types. Key decisions:
- `insuranceBet` lives on `GameState` (round-level event, not per-hand)
- `result` lives on `PlayerHand` so split hands have independent outcomes
- `isComplete: boolean` distinguishes "player done" from "result known"
- `phase` includes `"insurance"` as its own phase
- Split aces receive one card and are immediately `isComplete`

### `src/engine/constants.ts`
`RULES` (single source of truth), `SUITS`, `RANKS` (as const arrays).

### `src/engine/shoe.ts`
`createShoe`, `drawCard`, `reshuffleIfNeeded`. Fisher-Yates shuffle. Reshuffle at 25% penetration.

### `src/engine/hand.ts`
`getHandValue`, `isSoft`, `isBlackjack`, `isBust`. `isSoft` computes hard total then checks if adding 10 stays ≤ 21. Split aces are not blackjack.

### `src/engine/rules.ts`
`canDouble`, `canSplit`, `canSurrender`, `canTakeInsurance`. Same-value split (not same-rank). Late surrender only. Double after split allowed.

### `src/engine/dealer.ts`
`playDealerHand` — reveals hole card, draws until hard 17+ (hits soft 17, H17 rule).

### `src/engine/settle.ts`
`settleRound` — sets result on each hand, calls payout, updates `state.bankroll`. Gross payout amounts.

### `src/engine/round.ts`
`startRound`, `applyPlayerAction`, `advanceToNextHand`. Deal order P1→D1→P2→D2. Insurance phase before player blackjack check.

### `src/engine/__tests__/`
93 tests across 6 files. All engine logic covered. One bug found and fixed during testing: `advanceToNextHand` had if/else branches swapped.
