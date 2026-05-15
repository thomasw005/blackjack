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
        state/route.ts          (complete — GET: fetch active game state)
      leaderboard/route.ts      (complete — GET: fetch leaderboard)
    game/                       (empty — future game page)
    leaderboard/                (empty — future leaderboard page)
    login/                      (login page — complete)
    profile/                    (empty — future profile page)
    rules/                      (empty — future rules page)
    signup/                     (signup page — complete)
    favicon.ico
    globals.css
    layout.tsx
    page.tsx
  components/
    ActionButtons.tsx           (stub)
    BankrollDisplay.tsx         (stub)
    Card.tsx                    (stub)
    Hand.tsx                    (stub)
    LeaderboardTable.tsx        (stub)
    Table.tsx                   (stub)
  engine/
    constants.ts                (complete)
    types.ts                    (complete)
    shoe.ts                     (complete)
    hand.ts                     (complete)
    rules.ts                    (complete)
    dealer.ts                   (complete)
    settle.ts                   (complete — payout bug fixed: now returns gross amounts)
    recommendation.ts           (deferred — skipped for now, to be added later)
  lib/
    auth.ts                     (complete)
    db.ts                       (complete — getProfile, getWallet, getActiveGame, createGame, saveGameState, loadGameState, completeRound)
    gameUtils.ts                (complete — sanitizeState: hides dealer hole card)
    utils.ts                    (empty)
  styles/                       (empty)
```

---

## Current Progress

- Phase 1 (Project Setup) — complete
- Phase 2, Step 5 (Types) — complete
- Phase 2, Step 6 (Shoe) — complete
- Phase 2, Step 7 (Hand value logic) — complete
- Phase 2, Step 8 (Action legality) — complete
- Phase 2, Step 9 (Round flow — dealer) — complete
- Phase 2, Step 10 (Settle) — complete
- Phase 2, Step 9 (startRound, applyPlayerAction, advanceToNextHand) — complete
- Phase 2, Step 11 (tests) — complete: all engine files covered (93 tests across 6 test files)
- Phase 3, Step 12 (Database schema) — complete: Supabase project created, @supabase/supabase-js installed, .env.local configured, schema created with RLS enabled.
- Phase 4 (Auth) — complete: @supabase/ssr installed, client/server Supabase helpers created, middleware wired up, auth.ts and db.ts written. Login, signup, check-email, and game pages built and tested.
- Phase 5 (Server/API Logic) — complete: 4 API routes built, settle.ts payout bug fixed, db.ts extended with game helpers. UI is next.

### DB migration required (run in Supabase SQL editor):
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS state jsonb;
```

---

## `src/engine/types.ts`

All core TypeScript types. Every other engine file imports from here.

### Design decisions
- `RoundState` was skipped — `GameState` covers everything needed for single-player
- `Hand` base interface was removed — `PlayerHand` is self-contained
- `surrendered: boolean` was removed from `PlayerHand` — `result: "surrender"` covers it
- `splitFromId` was replaced with `isSplit: boolean` — no ID system exists yet so a reference would point to nothing
- `insuranceBet` lives on `GameState`, not `PlayerHand` — insurance is a round-level event, not per-hand
- `insuranceOffered: boolean` is slightly redundant with `phase: "insurance"` but kept for clarity
- `result` lives on `PlayerHand` so split hands can each have their own outcome
- `isComplete: boolean` on `PlayerHand` distinguishes "player done acting" from "result known" — a hand can be complete before the dealer plays
- `phase` includes `"insurance"` as its own phase — insurance resolves between deal and player turn, not at settlement
- `Ruleset` was renamed to `Rules`
- `Recommendation.alternatives` was omitted for now — can be added later

### Types defined
- `Rank` — `"A" | "2" | ... | "K"`
- `Suit` — `"hearts" | "diamonds" | "clubs" | "spades"`
- `Card` — `{ suit: Suit; rank: Rank }`
- `PlayerHand` — `{ cards, bet, doubled, isSplit, isComplete, result }`
- `DealerHand` — `{ cards, holeCardRevealed }`
- `GameState` — `{ playerHands, dealerHand, activeHandIndex, phase, bankroll, currentBet, insuranceOffered, insuranceBet }`
- `ActionType` — `"hit" | "stand" | "double" | "split" | "surrender" | "insurance" | "decline-insurance"`
- `Recommendation` — `{ action: ActionType; reason: string }` *(type retained for future use)*
- `Rules` — `{ numDecks, dealerHitsS17, blackjackPayout, insurancePayout, allowSplit, allowSurrender, allowDouble, reshufflePercent }`
- `Shoe` — `{ cards: Card[]; discardPile: Card[] }`

---

## `src/engine/constants.ts`

Locked ruleset values and card primitive arrays. Import `RULES` anywhere game logic needs rule values.

### Values
- `RULES: Rules` — the single source of truth for all game rules
  - 6 decks, dealer hits S17, blackjack 3:2, insurance 2:1, split/surrender/double all allowed, reshuffle at 25%
- `SUITS` — `as const` array of all four suits
- `RANKS` — `as const` array of all 13 ranks

### Why `as const`
Without it TypeScript infers `string[]`, which is incompatible with the `Suit` and `Rank` union types.

---

## `src/engine/shoe.ts`

All shoe-related logic. Imports `RULES`, `RANKS`, `SUITS` from `constants.ts`.

### Functions

**`createShoe(): Shoe`**
- Builds a single 52-card deck by looping SUITS × RANKS
- Duplicates it `RULES.numDecks` times
- Calls `shuffle(cards)` in place before returning
- Returns `{ cards, discardPile: [] }`

**`shuffle(cards: Card[]): void`** *(private)*
- Fisher-Yates algorithm — mutates the array in place, returns void
- Loops backwards, swaps each element with a random earlier element
- Not exported — callers should use `createShoe` or `reshuffleIfNeeded`

**`drawCard(shoe: Shoe): Card`**
- Removes and returns the first card from `shoe.cards` using `.shift()`
- Throws if the shoe is empty (shouldn't happen in practice)
- Cards in play are NOT added to discardPile here — that happens at end of round

**`reshuffleIfNeeded(shoe: Shoe): void`**
- Combines `needsReshuffle` and `reshuffle` into one function — they were always called together
- Checks if `shoe.cards.length < RULES.numDecks * 52 * RULES.reshufflePercent`
- If true: pushes discardPile back into cards, clears discardPile, shuffles in place
- Call this between rounds

---

---

## `src/engine/hand.ts`

Hand evaluation logic. Imports `Card`, `PlayerHand`, `DealerHand` from `types.ts`.

### Design decisions
- `cardValue` is exported — needed by `rules.ts` for same-value split comparison
- `isSoft` computes a hard total (all aces as 1) then checks if adding 10 stays ≤ 21 — correctly handles multiple aces
- `isBlackjack` uses `"isSplit" in hand` to narrow the union type before checking `isSplit`, since `DealerHand` does not have that property
- A split hand that reaches 21 is not blackjack — `isSplit` check guards this

### Functions
- `getHandValue(hand)` — sums card values with aces as 11, flips aces to 1 (subtract 10) while total > 21
- `isSoft(hand)` — returns true if hand has an ace and hard total + 10 ≤ 21
- `isBlackjack(hand)` — exactly 2 cards, not a split hand, total equals 21
- `isBust(hand)` — returns `getHandValue(hand) > 21`

---

---

## `src/engine/rules.ts`

Action legality checks. Imports `RULES` from `constants.ts`, `cardValue` from `hand.ts`.

### Design decisions
- `canHit` and `canStand` were dropped — they reduce to `phase === "player-turn"` and add no value as named functions
- Phase is treated as the source of truth — redundant checks like `isComplete` or `insuranceBet > 0` were omitted since the engine is responsible for transitioning phase correctly
- Split uses same-value (not same-rank) — Vegas-style allows splitting any two 10-value cards (e.g. J+Q)
- Surrender is late surrender only — blocked on split hands, only available on first action (2 cards)
- Double after split is allowed — standard Vegas behavior; ace split restriction (one card only) is handled by the engine marking those hands complete, not by `canDouble`
- Insurance minimum is `Math.floor(currentBet / 2)` — casinos deal in whole chips, no fractional bets

### Functions
- `canDouble(state)` — phase is player-turn, RULES.allowDouble, exactly 2 cards, bankroll >= hand bet
- `canSplit(state)` — phase is player-turn, RULES.allowSplit, exactly 2 cards, same card value, bankroll >= hand bet
- `canSurrender(state)` — phase is player-turn, RULES.allowSurrender, exactly 2 cards, not a split hand
- `canTakeInsurance(state)` — phase is insurance, bankroll >= floor(currentBet / 2)

---

---

## `src/engine/dealer.ts`

Dealer play logic. Imports `RULES` from `constants.ts`, `getHandValue`, `isSoft` from `hand.ts`, `drawCard` from `shoe.ts`.

### Design decisions
- `shouldDealerHit` is a private helper — keeps the while condition readable
- Mutates `state` and `shoe` in place — no return value needed

### Functions
- `playDealerHand(state, shoe)` — reveals hole card, draws until hard 17+ (hits soft 17 per H17 rule)

---

## `src/engine/settle.ts`

Round settlement and payout logic. Imports `getHandValue`, `isBlackjack`, `isBust` from `hand.ts`.

### Design decisions
- `settleHand` uses early returns to prevent fall-through — cases must not overwrite each other
- Blackjack push checked before player-only blackjack to avoid misclassifying a mutual blackjack as a player win
- `hand.bet` stores the final wager including any double — `payout` does not need separate doubled handling
- `payout` does not take `dealerHand` as a parameter — result is already set on the hand by `settleHand`
- Insurance is not settled here — handled separately before player turn

### Functions
- `settleHand(playerHand, dealerHand)` *(private)* — sets `playerHand.result` based on bust, blackjack, and total comparisons
- `payout(playerHand)` *(private)* — returns net bankroll change: +bet for win, -bet for lose, 0 for push, +1.5x for blackjack, -0.5x for surrender
- `settleRound(state)` — loops all player hands, calls settleHand then payout, updates `state.bankroll`

---

---

## `src/engine/round.ts`

Round flow logic. Imports `drawCard`, `reshuffleIfNeeded` from `shoe.ts`, `isBlackjack`, `isBust` from `hand.ts`.

### Design decisions
- `startRound` takes `bet: number`, not `ActionType` — the bet is the only input needed to begin a round
- Dealing order is P1 → D1 → P2 → D2, matching standard casino procedure; `dealerHand.cards[0]` is the upcard, `cards[1]` is the hole card
- Insurance phase takes priority over player blackjack — if upcard is Ace, insurance always runs first
- Player blackjack with a non-ace upcard skips to `"dealer-turn"` immediately, hand marked `isComplete`
- Split aces receive one card each and are immediately marked `isComplete` — no further player action allowed
- `advanceToNextHand` uses `findIndex` to find the next incomplete hand after `activeHandIndex`; if none found, transitions to `"dealer-turn"`
- `decline-insurance` is a distinct `ActionType` — kept separate from `insurance` for explicit intent

### Functions
- `startRound(state, shoe, bet)` — reshuffles if needed, deals cards, deducts bet, sets phase
- `applyPlayerAction(state, shoe, action)` — handles hit/stand/double/split/surrender/insurance/decline-insurance for the active hand
- `advanceToNextHand(state)` — moves to next incomplete hand or transitions to dealer turn

---

## `src/engine/__tests__/`

All test files use helper factory functions (`makeHand`, `makeSplitHand`, `makeShoe`, `makeState`, `makePlayerHand`) to avoid inline object literals. Rule-derived values (`TOTAL_CARDS`, `RESHUFFLE_THRESHOLD`, `RULES.blackjackPayout`, etc.) are used throughout so tests adapt automatically if constants change.

### `hand.test.ts`
19 tests. Helpers: `makeHand(...ranks)` (DealerHand), `makeSplitHand(...ranks)` (PlayerHand with isSplit=true). Covers `cardValue`, `getHandValue`, `isSoft`, `isBlackjack`, `isBust`.

### `shoe.test.ts`
11 tests. Helper: `makeShoe(numCards, numDiscard?)`. Covers `createShoe` (card/rank/suit counts), `drawCard` (remove + throw on empty), `reshuffleIfNeeded` (threshold boundary, discard merge, empty discard edge case).

### `rules.test.ts`
21 tests. Helper: `makeState(overrides?)`. Covers `canDouble`, `canSplit`, `canSurrender`, `canTakeInsurance` — including phase guards, same-value split (J+Q), split hand blocking surrender, exact bankroll boundaries (including exact-match for canSplit), and odd-bet floor for insurance.

### `dealer.test.ts`
8 tests. Helper: `makeState(dealerCards)`. Covers `playDealerHand` — hole card reveal, hard 17 stand, soft 17 hit (H17 rule), soft 18 stand, multi-card draw sequences, bust.

### `settle.test.ts`
9 tests. Helpers: `makePlayerHand(overrides?)`, `makeState(playerHand, dealerCards, bankroll?)`. Covers `settleRound` — all result types, 3:2 blackjack payout, player-bust-loses-even-if-dealer-busts, multi-hand settlement.

### `round.test.ts`
22 tests. Helpers: `makeShoe(...topCards)` (with 80-card padding to prevent reshuffle), `makeState(overrides?)`, `makePlayerHand(cards, bet?, isComplete?)`. Covers `startRound` (deal order, phase transitions, insurance priority), `applyPlayerAction` (all 7 action types), `advanceToNextHand` (single hand, multi-hand, skip-complete).

### Bug fixed during testing
`advanceToNextHand` in `round.ts` had its `if`/`else` branches swapped — when no incomplete hands remained it set `activeHandIndex = -1` instead of transitioning to `"dealer-turn"`, and vice versa.

---

## `src/engine/recommendation.ts`

Deferred — skipped for v1. Will implement basic strategy logic as a later update.

---

## Database (Supabase)

PostgreSQL via Supabase. RLS enabled on all tables. All writes go through the server using the service role key (bypasses RLS). The client uses the anon key and can only read its own rows via RLS select policies.

### Design decisions
- `profiles.id` matches `auth.users.id` — no separate join table needed
- `wallets.balance` is an integer (whole dollars) — avoids floating point issues
- Cards stored as `jsonb` in `hands` — no need to normalize into a separate cards table
- `transactions` records every bankroll change for auditability and leaderboard stats
- `surrendered` column omitted from `hands` — `result = 'surrender'` covers it (mirrors engine design)
- `hands.split_from_hand_id` self-references `hands.id` — tracks split lineage
- `games.outcome_summary` is `jsonb` — quick round summary without querying all hands
- `transactions.game_id` uses `on delete set null` — transaction history survives game deletion

### Tables
- `profiles` — `id` (FK → auth.users), `username`, `created_at`
- `wallets` — `user_id` (PK, FK → profiles), `balance`, `updated_at`
- `games` — `id`, `user_id`, `started_at`, `ended_at`, `status` ('active'|'complete'), `outcome_summary`, `state` (jsonb — live GameState+Shoe, null when complete)
- `hands` — `id`, `game_id`, `hand_index`, `player_cards`, `dealer_cards`, `wager`, `insurance_wager`, `result`, `doubled`, `split_from_hand_id`
- `transactions` — `id`, `user_id`, `game_id`, `type`, `amount`, `created_at`

### Required migration (run in Supabase SQL editor)
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS state jsonb;
```

### RLS policies
All tables have RLS enabled. Select policies let users read only their own rows. No client-side insert/update/delete policies — the server handles all writes via service role.

`GRANT SELECT ON public.<table> TO authenticated` was run manually on all five tables — required because "automatically expose new tables" was disabled at project creation. Without this, RLS policies pass but table-level access is still denied (403).

## Auth

Supabase Auth with email/password. Email confirmation is **enabled** — users must verify their email before they can log in.

### Design decisions
- Email confirmation kept on — adds signup friction but prevents throwaway accounts
- After signup, users are redirected to `/check-email` (not `/game`) since the session doesn't exist until confirmation
- `deleteUser` requires the admin client (service role key) — Supabase has no user-facing delete endpoint. The function verifies the session first, then deletes via admin. Cascades clean up `profiles` and `wallets` automatically.
- After sign in, users are redirected to `/game`
- Profile + wallet are created automatically via a database trigger (`on_auth_user_created`) — no app-level code needed for this
- Starting bankroll: $1,000

### Files
- `src/lib/supabase/client.ts` — browser Supabase client (use in `"use client"` components)
- `src/lib/supabase/server.ts` — server Supabase client (`createClient`) and admin client (`createAdminClient` using service role key)
- `src/middleware.ts` — refreshes auth session on every request via `supabase.auth.getUser()`
- `src/lib/auth.ts` — server actions: `signUp`, `signIn`, `signOut`, `getUser`, `deleteUser`
- `src/lib/db.ts` — server helpers: `getProfile`, `getWallet`, `getActiveGame`, `createGame`, `saveGameState`, `loadGameState`, `completeRound`
- `src/lib/gameUtils.ts` — `sanitizeState`: strips the dealer hole card from responses when not yet revealed

---

## API Routes

All routes require an authenticated session (cookie). Writes use the admin client (service role).

### `POST /api/game/start`
Body: `{ bet: number }`. Validates bet against wallet balance, rejects if an active game exists, initializes a `GameState` + `Shoe` via the engine, saves to `games.state`, returns `{ gameId, state }` (hole card hidden).

### `POST /api/game/action`
Body: `{ gameId: string, action: ActionType }`. Loads game state from DB, validates action legality via engine rules, calls `applyPlayerAction`. After insurance resolves, auto-advances player blackjack to dealer-turn. When phase reaches `"dealer-turn"`: plays dealer hand, resolves insurance payout (2:1 if dealer blackjack), calls `settleRound`, then writes hands + transactions + wallet update via `completeRound`. Returns `{ state }`.

### `GET /api/game/state`
Returns `{ gameId, state }` for the user's active game, or `{ gameId: null, state: null }` if none.

### `GET /api/leaderboard`
Returns top 20 players by bankroll with win/loss/push counts and net profit from the transactions table.

### Design decisions
- `games.state` (jsonb) stores `{ gameState, shoe }` during an active round. Set to null when round completes.
- Insurance is resolved in the action route (not the engine) — `isBlackjack(dealerHand)` is checked after `playDealerHand` and bankroll is updated before `settleRound`.
- `sanitizeState` hides the dealer's hole card (slices `dealerHand.cards` to the upcard only) until `holeCardRevealed` is true.
- `settle.ts` payout bug was fixed: `startRound` deducts the bet upfront, so `payout` now returns gross amounts (win = 2×bet, push = bet returned, lose = 0, etc.).
