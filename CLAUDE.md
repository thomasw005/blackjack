# Blackjack Project

## Before Starting a Session
Read [documentation.md](documentation.md) to get up to speed on current progress, design decisions, and the state of each file. Read [plan.md](plan.md) for the full build plan and recommended build order.

## Overview
A full-stack Vegas-style blackjack website built for portfolio use and friends to play. See [plan.md](plan.md) for the full build plan, ruleset decisions, and recommended build order.

## Tech Stack
- **Frontend/Backend:** Next.js + React + TypeScript
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth
- **Hosting:** Vercel

## Project Structure
```
/src
  /app         - Next.js routes (login, signup, game, leaderboard, profile, rules, api)
  /components  - UI components
  /engine      - Game logic (types, shoe, hand, rules, dealer, settle, recommendation)
  /lib         - DB and auth helpers
  /styles
```

## Key Rules (locked)
- 6-deck shoe, dealer hits soft 17 (H17)
- Blackjack pays 3:2, insurance pays 2:1
- Split, surrender, double down all allowed
- Server owns game state — client only requests actions

## Build Order
Follow the phases in [plan.md](plan.md). Current progress tracked there.

## Commands
```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # run ESLint
```
