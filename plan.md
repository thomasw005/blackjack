# Blackjack Website — Full To-Do / Build Plan

## Project Goal
Build a polished blackjack website for portfolio use and for friends to play. The site should support realistic Vegas-style blackjack rules, persistent bankrolls, user accounts, a leaderboard, and a reveal-only recommendation button.

---

## Core Product Decisions

### Ruleset to lock in immediately
Do **not** start coding until these are fixed.

- Game type: **Traditional Vegas-style blackjack**
- Shoe: **6 decks**
- Dealer: **Hits soft 17 (H17)**
- Blackjack payout: **3:2**
- Insurance payout: **2:1**
- Split: **Allowed**
- Surrender: **Allowed**
- Double down: **Allowed**
- Reshuffle: after shoe reaches cut-point / penetration threshold

### Recommended tech stack
Use the simple, modern stack:

- **Frontend:** Next.js + React
- **Language:** TypeScript
- **Backend:** Next.js route handlers / server-side logic
- **Database:** PostgreSQL
- **Auth:** Supabase Auth
- **Hosting:** Vercel
- **DB/Auth hosting:** Supabase

### High-level architecture
- Frontend handles UI only
- Server validates every move
- Game engine handles rules and outcomes
- Database stores users, bankroll, rounds, and leaderboard stats

---

# Phase 1 — Project Setup

## 1. Create the repo
- Make a GitHub repo
- Add a clean README
- Decide whether this is private during development or public from day one

## 2. Initialize the app
- Create a Next.js app with TypeScript
- Set up a good folder structure early
- Add ESLint / formatting

## 3. Suggested folder structure

```text
/src
  /app
    /login
    /signup
    /game
    /leaderboard
    /profile
    /rules
    /api
  /components
    Table.tsx
    Card.tsx
    Hand.tsx
    BankrollDisplay.tsx
    ActionButtons.tsx
    RecommendationPanel.tsx
    LeaderboardTable.tsx
  /lib
    db.ts
    auth.ts
    utils.ts
  /engine
    types.ts
    constants.ts
    shoe.ts
    hand.ts
    rules.ts
    dealer.ts
    settle.ts
    recommendation.ts
  /styles
```

## 4. Set up environment variables
You will likely need:
- database URL
- Supabase URL
- Supabase anon/public key
- Supabase service role key (server only)

Do **not** expose server secrets to the client.

---

# Phase 2 — Define the Game Engine Before UI

This is the most important part. Keep it separate from the React code.

## 5. Define your core types
You need clean TypeScript types for:
- Rank (type)
- Suit (type)
- Card (interface)
- PlayerHand (interface)
- DealerHand (interface)
- GameState (interface)
- ActionType (type)
- Recommendation (interface)
- Ruleset (interface)

Example concepts to model:
- whether a hand is split
- whether a hand doubled down
- whether surrender is still allowed
- insurance offered / taken
- whether the round is finished

## 6. Build the shoe system
### Requirements
- 6 decks combined into one shoe
- shuffled at creation
- dealt cards are removed from the shoe
- used cards move to discard
- reshuffle when cut point is reached

### Functions to implement
- `createShoe(numDecks)`
- `shuffle(cards)`
- `drawCard(shoe)`
- `needsReshuffle(shoe, initialSize)`
- `reshuffle(shoe, discardPile)`

## 7. Build hand value logic
Your hand evaluator must correctly handle:
- face cards = 10
- ace = 1 or 11
- soft totals
- hard totals
- blackjack detection
- bust detection

### Functions to implement
- `getHandValue(hand)`
- `isSoft(hand)`
- `isBlackjack(hand)`
- `isBust(hand)`

## 8. Build action legality logic
Before allowing UI buttons, server logic must decide whether an action is legal.

### Functions to implement
- `canHit(state)`
- `canStand(state)`
- `canDouble(state)`
- `canSplit(state)`
- `canSurrender(state)`
- `canTakeInsurance(state)`

Make these based on current rules and hand state, not UI assumptions.

## 9. Build round flow logic
You need a clear round lifecycle.

### Round order
1. Player places bet
2. Initial cards dealt
3. Check for insurance opportunity
4. Player acts on each hand
5. Dealer reveals and plays
6. Round settles
7. Bankroll updates
8. Cards move to discard

### Functions to implement
- `startRound()`
- `applyPlayerAction()`
- `advanceToNextHand()`
- `playDealerHand()`
- `settleRound()`

## 10. Implement special rules
### Split
- Ensure only same-rank or equivalent-value rule if you choose that convention
- Create two separate hands
- Duplicate wager
- Track active hand index

### Surrender
- Most likely late surrender under Vegas-style rules
- Return half the base bet
- End the hand immediately

### Insurance
- Only offer when dealer upcard is Ace
- Insurance bet = up to half original wager
- Pays 2:1 if dealer has blackjack
- Keep this separate from the main bet logic

### Dealer soft 17
You already chose H17, so your dealer logic must hit soft 17.

## 11. Write tests for engine logic
Before building the full UI, test these cases:
- blackjack vs non-blackjack
- ace value switching correctly
- split behavior
- surrender returns half bet
- insurance resolves correctly
- dealer hits soft 17
- dealer stands above 17
- bust cases
- push cases
- reshuffle logic

This phase is worth real effort. Your whole project depends on it.

---

# Phase 3 — Recommendation Engine

## 12. Decide the recommendation scope
Keep this realistic and manageable.

### Recommendation should consider
- player hand total / pair / soft hand
- dealer upcard
- whether split is available
- whether surrender is available
- whether insurance is offered
- ruleset

### Recommendation should **not**
- auto-play the hand
- secretly change the game
- depend on hidden cheating logic

## 13. Create recommendation output format
Return more than just one word.

Recommended structure:
- recommended action
- short explanation
- optional alternatives

Example:
- Action: Stand
- Reason: Hard 17 against dealer 10 is a stand under this ruleset.

## 14. Implement recommendation as separate logic
Do **not** hardcode it into buttons.

### Functions to implement
- `getRecommendation(hand, dealerUpcard, ruleset, availableActions)`
- `formatRecommendation(result)`

## 15. Reveal recommendation button behavior
The player should choose whether to see it.

Suggested behavior:
- Button starts hidden or inactive until the hand starts
- Clicking it reveals recommendation for current hand only
- UI marks that advice has been revealed

Optional stat to track later:
- whether the player followed the recommendation

---

# Phase 4 — Database and Persistence

## 16. Create the database schema
At minimum, you need these tables.

### `profiles`
- id
- username
- created_at

### `wallets`
- user_id
- balance
- updated_at

### `games`
- id
- user_id
- started_at
- ended_at
- status
- outcome_summary

### `hands`
- id
- game_id
- hand_index
- player_cards
- dealer_cards
- wager
- insurance_wager
- result
- surrendered
- doubled
- split_from_hand_id

### `transactions`
- id
- user_id
- game_id
- type
- amount
- created_at

### Optional leaderboard/stat table
You can compute leaderboard live or store aggregated stats.

## 17. Store both balances and transaction history
Do not only overwrite wallet balance.

Why:
- easier debugging
- lets you verify payouts
- supports better leaderboard metrics
- helps if something goes wrong

## 18. Add row-level security / ownership rules
Every player should only be able to modify their own records.

The server should be the source of truth for:
- bankroll updates
- game creation
- action legality
- payouts

---

# Phase 5 — Authentication and User Accounts

## 19. Add auth
Use simple auth first.

Suggested features:
- sign up
- log in
- log out
- username / display name

## 20. Decide starting bankroll policy
Pick one and be consistent.

Examples:
- Every new player starts with a fixed amount
- Admin can reset balances later
- Optional “reset bankroll” button only for testing/admin use

Do not leave this vague.

## 21. Prevent basic abuse
At minimum:
- no client-side balance authority
- no calling payout routes directly without validation
- no trusting browser state for round outcomes

---

# Phase 6 — Build the UI

## 22. Build pages in this order
Do not try to build the prettiest thing first.

### First
- landing page
- login/signup
- game page

### Then
- leaderboard page
- profile page
- rules page

## 23. Game UI checklist
The game page should clearly show:
- bankroll
- current bet
- current hand(s)
- dealer upcard / dealer hand
- whose turn it is
- available actions
- revealed recommendation area
- round result

## 24. Action buttons
You need buttons for:
- deal / start round
- hit
- stand
- double (if included in your final rules/UI)
- split
- surrender
- insurance accept / decline
- reveal recommendation
- next round

Buttons should disable automatically when illegal.

## 25. Split-hand UI
This is a common pain point.

Make it obvious:
- which hand is active
- which hands are already completed
- wager per hand
- result per hand

Do not make split hands visually confusing.

## 26. Keep the UI simple and clean
Recommended look:
- dark felt / casino-inspired theme
- large buttons
- readable text
- strong contrast
- clear bankroll display
- subtle card animations only

Avoid overdoing animations in v1.

---

# Phase 7 — Server/API Logic

## 27. Define server actions / endpoints
Possible actions you need:
- create round
- place bet
- reveal recommendation
- hit
- stand
- double
- split
- surrender
- insurance choice
- fetch current state
- fetch leaderboard

## 28. Server should own the game state
Do not let the browser fully control round state.

Recommended approach:
- browser sends action request
- server validates action
- server updates state
- server returns updated state

This keeps the project much more legit.

## 29. Use transactions for bankroll updates
When resolving a round:
- write transaction records
- update wallet balance
- mark game complete

These should be done safely together.

---

# Phase 8 — Leaderboard and Stats

## 30. Decide what the leaderboard means
Do not only show “who has most money” unless you are okay with that being the main metric.

Recommended leaderboard metrics:
- current bankroll
- net profit
- hands played
- wins
- losses
- pushes
- win rate

## 31. Add profile stats
Nice portfolio touch:
- total hands played
- favorite action maybe later
- average bet
- biggest win
- longest streak
- recommendation-follow rate (optional)

## 32. Keep leaderboard queries efficient
If needed later, create aggregate views or cached stats.
But in v1, simple queries are fine.

---

# Phase 9 — Testing and Bug-Proofing

## 33. Manually test all critical flows
You need to test:
- normal hit/stand flow
- blackjack on deal
- push
- dealer blackjack
- insurance win/loss
- surrender
- split hands
- multiple split hands if supported
- low bankroll edge cases
- reshuffle mid-session
- logout/login persistence

## 34. Test bad inputs
Try to break your own app:
- hit after bust
- split invalid cards
- surrender after taking another action
- bet more than bankroll
- spam buttons quickly
- refresh page mid-round

## 35. Add guardrails in UI and server
Both should help prevent bad states, but server rules matter more.

---

# Phase 10 — Deployment

## 36. Set up production services
- Create Supabase project
- Create production database schema
- Add environment variables in host dashboard
- Connect GitHub repo to Vercel

## 37. Deploy early, not only at the end
Deploy once the base app works.
Then keep improving it.

This helps you catch:
- environment mistakes
- auth callback issues
- server/client mismatches
- database permission errors

## 38. Set up basic monitoring/logging
At minimum, be able to see:
- API/server errors
- failed auth flows
- failed DB writes

---

# Phase 11 — Portfolio Polish

## 39. Make the project presentable
Add:
- landing page with project description
- rules page
- screenshots / clean branding
- polished README
- short architecture explanation

## 40. README checklist
Your README should include:
- what the project is
- tech stack
- ruleset
- setup instructions
- environment variables needed
- screenshots/GIFs
- interesting features
- future improvements

## 41. Good portfolio talking points
When describing the project, emphasize:
- full-stack architecture
- persistent user state
- transaction-safe bankroll tracking
- server-side validation
- recommendation engine
- leaderboard analytics

---

# Recommended Build Order (Important)

Follow this order.

## Step 1
Lock ruleset and scope.

## Step 2
Set up repo, Next.js, TypeScript, and base structure.

## Step 3
Implement the blackjack engine completely in isolation.

## Step 4
Test engine logic thoroughly.

## Step 5
Implement recommendation logic.

## Step 6
Create DB schema.

## Step 7
Add auth and user profiles.

## Step 8
Add bankroll persistence and transaction logging.

## Step 9
Build basic game UI.

## Step 10
Connect UI to server actions.

## Step 11
Add split / insurance / surrender UI handling.

## Step 12
Add leaderboard and stats pages.

## Step 13
Deploy to production.

## Step 14
Polish visuals, README, and portfolio presentation.

---

# MVP Scope vs Later Scope

## MVP (build this first)
- accounts
- persistent bankroll
- one live single-player round at a time
- hit / stand / split / surrender / insurance
- dealer H17
- 6-deck shoe with reshuffle
- recommendation reveal button
- leaderboard

## Later / stretch goals
- live multiplayer tables
- chat
- tournaments
- side bets
- card history log in UI
- recommendation analytics
- admin panel
- bankroll reset controls
- different rule presets

---

# Practical Tips / Recommendations

## Keep game logic separate from UI
This is the biggest structural tip.
If you mix blackjack rules directly into React components, the project will become annoying fast.

## Do not trust the frontend
The browser should request actions, not decide results.

## Avoid overbuilding v1
A polished, correct, simple blackjack app beats an unfinished “casino platform.”

## Test split and insurance heavily
These are common bug sources.

## Write down your rules in one constants file
This prevents confusion later when recommendation logic and game logic need to match.

## Keep a changelog / task list
Track what is done and what is buggy.

## Expect edge cases
Blackjack looks simple until you implement every rule interaction. Plan for this.

---

# Suggested First Week Plan

## Day 1
- lock all rules
- create repo
- initialize Next.js + TypeScript
- set up folders and basic pages

## Day 2
- implement card/shoe types
- implement shuffle/deal/discard/reshuffle
- implement hand value logic

## Day 3
- implement round flow
- implement dealer logic
- implement settle logic

## Day 4
- implement split / surrender / insurance logic
- test edge cases

## Day 5
- implement recommendation engine
- test recommendation outputs

## Day 6
- set up Supabase
- create schema
- connect auth

## Day 7
- build basic game page wired to backend

---

# Final Recommendation
Your best version of this project is **not** the most complicated version. It is the version that is:

- correct
- cleanly structured
- realistically playable
- persistent
- secure enough for friends
- polished enough for portfolio use

Prioritize correctness of rules, clarity of architecture, and a smooth gameplay loop before fancy extras.

