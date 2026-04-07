# Project Documentation

This file tracks design decisions, current state, and context for each file. Read this at the start of a new session to get up to speed quickly.

---

## File Structure

```
src/
  app/
    api/                        (empty — future API routes)
    game/                       (empty — future game page)
    leaderboard/                (empty — future leaderboard page)
    login/                      (empty — future login page)
    profile/                    (empty — future profile page)
    rules/                      (empty — future rules page)
    signup/                     (empty — future signup page)
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
    RecommendationPanel.tsx     (stub)
    Table.tsx                   (stub)
  engine/
    constants.ts                (complete)
    types.ts                    (complete)
    shoe.ts                     (complete)
    hand.ts                     (empty)
    rules.ts                    (empty)
    dealer.ts                   (empty)
    settle.ts                   (empty)
    recommendation.ts           (empty)
  lib/
    auth.ts                     (empty)
    db.ts                       (empty)
    utils.ts                    (empty)
  styles/                       (empty)
```

---

## Current Progress

- Phase 1 (Project Setup) — complete
- Phase 2, Step 5 (Types) — complete
- Phase 2, Step 6 (Shoe) — complete
- Phase 2, Steps 7–11 — not started

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
- `ActionType` — `"hit" | "stand" | "double" | "split" | "surrender" | "insurance"`
- `Recommendation` — `{ action: ActionType; reason: string }`
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

**`shuffle(cards: Card[]): void`**
- Fisher-Yates algorithm — mutates the array in place, returns void
- Loops backwards, swaps each element with a random earlier element

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

## `src/engine/` — remaining files (not started)

- `hand.ts` — hand value logic (getHandValue, isSoft, isBlackjack, isBust)
- `rules.ts` — action legality (canHit, canStand, canDouble, canSplit, canSurrender, canTakeInsurance)
- `dealer.ts` — dealer play logic
- `settle.ts` — round settlement and payout logic
- `recommendation.ts` — basic strategy recommendation engine
