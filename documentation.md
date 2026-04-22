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
    hand.ts                     (complete)
    rules.ts                    (complete)
    dealer.ts                   (complete)
    settle.ts                   (complete)
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
- Phase 2, Step 7 (Hand value logic) — complete
- Phase 2, Step 8 (Action legality) — complete
- Phase 2, Step 9 (Round flow — dealer) — complete
- Phase 2, Step 10 (Settle) — complete
- Phase 2, Step 9 (startRound, applyPlayerAction, advanceToNextHand) — complete
- Phase 2, Step 11 (tests) — not started

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

## `src/engine/` — remaining files (not started)

- `recommendation.ts` — basic strategy recommendation engine
