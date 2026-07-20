# ♠ WilsonBlackjack

A full-stack, Vegas-rules blackjack game. Six-deck shoe, dealer hits soft 17, real splits and surrenders, a persistent bankroll, and a leaderboard.

**Live at [wilsonblackjack.com](https://wilsonblackjack.com)** — playable without an account.

<!-- Screenshots go here. Suggested: the table mid-hand with a split, and the leaderboard.
     Drop the files in docs/ and reference them:
     ![Game table](docs/table.png)
     ![Leaderboard](docs/leaderboard.png) -->

---

## Contents

- [What it does](#what-it-does)
- [Rules](#rules)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## What it does

**Play without signing up.** Guests get a $250 bankroll stored in their browser. An account is only needed to appear on the leaderboard — creating one starts you fresh at $250.

**Real blackjack, not a simplified version.** Splits (including split aces), late surrender, double after split, insurance, and a dealer that hits soft 17. Each split hand carries its own bet and its own result.

**Basic strategy hints.** A "Show Hint" toggle tells you the correct play and why. The recommendation engine covers insurance, pair splits, surrender, and every soft and hard total. It runs client-side, so hints are instant.

**A leaderboard with some texture.** Richest players by bankroll, plus biggest gains and biggest losses over the last day, week, and month. Losses are as prominent as wins, which is more fun.

**Rewarded ads for chips.** Bust out and you can watch a rewarded video for $10, via the Google H5 Games Ads API. Degrades gracefully to "no ad available" when nothing loads or the AdSense client isn't configured.

---

## Rules

These were locked before any code was written, and they live in one place — [`src/engine/constants.ts`](src/engine/constants.ts) — so the game logic and the strategy engine can't drift apart.

| | |
|---|---|
| Decks | 6 |
| Dealer | Hits soft 17 (H17) |
| Blackjack pays | 3:2 |
| Insurance pays | 2:1 |
| Double | Any two cards, including after a split |
| Split | Any equal-value pair; split aces get one card each |
| Surrender | Late surrender |
| Reshuffle | At 25% penetration |
| Minimum bet | $10 |
| Starting bankroll | $250 |

All currency is virtual. There is no real-money wagering and nothing to cash out.

---

## Architecture

### The server owns the game

The browser requests actions; it never decides outcomes. `POST /api/game/action` loads the round from Postgres, re-validates that the action is legal, applies it, and returns the new state. A client that asks to double on a five-card hand gets rejected by the server, not by a disabled button.

The dealer's hole card is stripped from every response until it's actually revealed ([`sanitizeState`](src/lib/gameUtils.ts)), so it isn't sitting in the network tab.

### Guest play is the deliberate exception

Signed-out players run the same engine client-side, with state in `localStorage`.

That looks like it contradicts the rule above, so it's worth being explicit: server authority exists to stop **leaderboard** cheating. Guest results never reach the leaderboard, so a guest editing their own `localStorage` changes a number on their own screen and nothing else. Paying the cost of server-side state for guests would buy nothing.

Both paths share one implementation of action legality and settlement — `validateAction`, `resolveRound`, and `resolveDeferredBlackjack` in [`src/engine/round.ts`](src/engine/round.ts) — so the two modes can't drift.

### The engine is pure

Everything in `src/engine/` is plain functions over plain data. No React, no database, no I/O. That's what makes it testable, and it's why the same code can run on the server for members and in the browser for guests.

### One shoe per player

A player keeps the same six-deck shoe across rounds, persisted to `profiles.shoe`. Drawn cards go to a discard tray and get recycled at the cut card. This is what makes the running count on screen mean anything — a fresh shuffle every round would make penetration and counting meaningless.

### Money is integer-only

`wallets.balance` is an integer column, and bankroll arithmetic is kept whole. Odd bets are the trap here: a 3:2 payout on $25 is $37.50, and half of a $25 surrender is $12.50. Both round in the player's favour, and — importantly — round the *same way* the transaction log does, so the wallet and the ledger the leaderboard is built from stay in agreement.

### Database

PostgreSQL via Supabase, RLS enabled on every table. Reads are scoped to the owning user; all writes go through the server with the service role key. There are no client-side write policies.

| Table | Holds |
|---|---|
| `profiles` | Username, and the player's current shoe |
| `wallets` | Balance, integer dollars |
| `games` | One row per round; live state as JSONB while in progress |
| `hands` | Per-hand cards, wager, and result — split hands get a row each |
| `transactions` | Every payout, with type and amount; the leaderboard is built from these |

---

## Project structure

```
src/
  app/
    api/game/{start,action,state}   Round lifecycle
    api/leaderboard                 Gains, losses, rich list
    api/reward                      Rewarded-ad credit
    game/                           The table
    leaderboard/  rules/            Public pages
    login/  signup/  ...            Auth flows
  components/                       Account modal, ad overlay
  engine/                           Pure game logic (see below)
  lib/                              DB, auth, guest game
  middleware.ts                     Route protection
```

The engine, in dependency order:

| File | Responsibility |
|---|---|
| `constants.ts` | The ruleset — single source of truth |
| `types.ts` | Core types |
| `shoe.ts` | Shoe construction, dealing, reshuffle |
| `hand.ts` | Hand values, soft/blackjack/bust detection |
| `rules.ts` | Whether an action is legal |
| `dealer.ts` | Dealer play (H17) |
| `settle.ts` | Grading and payouts |
| `round.ts` | Round flow and orchestration |
| `recommendation.ts` | Basic strategy |

---

## Getting started

**Requires** Node 20+ (built on 22) and a Supabase project.

```bash
git clone https://github.com/thomasw005/blackjack.git
cd blackjack
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can play as a guest immediately; auth and the leaderboard need Supabase configured.

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes — **never expose to the client** |
| `NEXT_PUBLIC_SITE_URL` | Base URL for auth email redirects |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Optional; rewarded ads are disabled without it |

### Database

The schema lives in the Supabase project rather than in this repo — see the Database section of [`documentation.md`](documentation.md) for table shapes, RLS policies, and the `on_auth_user_created` trigger that seeds a new player's $250 wallet.

Two migrations to apply if you're bringing an existing database up to date:

```sql
ALTER TABLE games    ADD COLUMN IF NOT EXISTS state jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shoe  jsonb;
```

### Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
npm test         # vitest
```

---

## Testing

113 tests across the engine and guest game.

```bash
npm test
```

The engine's purity is the point here — dealing a specific hand is just constructing a state object, so the awkward cases get covered properly: split aces receiving exactly one card, a natural against a busted dealer still paying 3:2, mutual blackjack pushing, the dealer hitting soft 17 but standing on hard 17, and the bankroll staying a whole number on odd bets.

---

## Roadmap

- Profile page with per-player stats and hand history
- Landing page (`/` currently redirects straight to the table)
- Carrying a guest bankroll into a new account, opt-in
- Multiplayer tables
- Side bets and alternate rule presets

---

## Notes

Virtual currency only — no real-money wagering, no purchases, nothing to cash out.

Built with Next.js, TypeScript, Supabase, and Tailwind. Deployed on Vercel.
