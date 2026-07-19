"use client";

// Guest (signed-out) play. The engine runs in the browser and state lives in
// localStorage instead of Postgres.
//
// The "server owns game state" rule still holds for signed-in players — it exists
// to stop leaderboard cheating. Guest results never reach the leaderboard, so a
// guest tampering with their own localStorage only affects a number on their own
// screen. Signing up starts a fresh server-owned bankroll (see clearGuest).

import { createShoe } from "@/engine/shoe";
import {
    startRound,
    applyPlayerAction,
    validateAction,
    resolveRound,
    resolveDeferredBlackjack,
} from "@/engine/round";
import { sanitizeState } from "@/lib/gameUtils";
import { ActionType, GameState, Shoe } from "@/engine/types";
import { MIN_BET } from "@/engine/constants";

const STORAGE_KEY = "wbj:guest:v1";

// Matches the starting balance the `on_auth_user_created` DB trigger gives accounts.
export const GUEST_STARTING_BANKROLL = 250;
const REWARD = 10;

// Stand-in for the DB row id, so the page can use "is there a gameId?" the same
// way in both modes.
export const GUEST_GAME_ID = "guest";

type GuestSave = {
    bankroll: number;
    gameState: GameState | null;
    shoe: Shoe | null;
};

type GuestSnapshot = {
    gameId: string | null;
    state: GameState | null;
    balance: number;
};

const emptySave = (): GuestSave => ({
    bankroll: GUEST_STARTING_BANKROLL,
    gameState: null,
    shoe: null,
});

function read(): GuestSave {
    if (typeof window === "undefined") return emptySave();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptySave();
        const parsed = JSON.parse(raw) as Partial<GuestSave>;
        if (typeof parsed?.bankroll !== "number") return emptySave();
        return {
            bankroll: parsed.bankroll,
            gameState: parsed.gameState ?? null,
            shoe: parsed.shoe ?? null,
        };
    } catch {
        // Corrupt or unavailable storage — start clean rather than trapping the player.
        return emptySave();
    }
}

function write(save: GuestSave) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
        // Private mode / quota — play continues for this session, just unsaved.
    }
}

// A round only survives a reload while it is still in progress; a settled round
// is cleared so the player lands back on the betting screen, like the server does.
function snapshot(save: GuestSave): GuestSnapshot {
    if (!save.gameState || save.gameState.phase === "settled") {
        return { gameId: null, state: null, balance: save.bankroll };
    }
    return {
        gameId: GUEST_GAME_ID,
        state: sanitizeState(save.gameState),
        balance: save.gameState.bankroll,
    };
}

export function loadGuest(): GuestSnapshot {
    return snapshot(read());
}

export function clearGuest() {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to do — a stale guest bankroll is never shown to a signed-in player.
    }
}

export function startGuestRound(
    bet: number
): { state: GameState; balance: number } | { error: string } {
    const save = read();

    if (!Number.isInteger(bet) || bet < MIN_BET) return { error: `Minimum bet is $${MIN_BET}` };
    if (bet > save.bankroll) return { error: "Insufficient balance" };

    const shoe: Shoe = save.shoe ?? createShoe();
    const gameState: GameState = {
        playerHands: [],
        dealerHand: { cards: [], holeCardRevealed: false },
        activeHandIndex: 0,
        phase: "betting",
        bankroll: save.bankroll,
        currentBet: 0,
        insuranceOffered: false,
        insuranceBet: 0,
    };

    startRound(gameState, shoe, bet);

    // Player blackjack against a non-ace upcard — dealer plays immediately.
    if (gameState.phase === "dealer-turn") resolveRound(gameState, shoe);

    write({ bankroll: gameState.bankroll, gameState, shoe });
    return { state: sanitizeState(gameState), balance: gameState.bankroll };
}

export function applyGuestAction(
    action: ActionType
): { state: GameState; balance: number } | { error: string } {
    const save = read();
    const { gameState, shoe } = save;
    if (!gameState || !shoe) return { error: "Game not found" };

    const validationError = validateAction(gameState, action);
    if (validationError) return { error: validationError };

    applyPlayerAction(gameState, shoe, action);

    if (action === "insurance" || action === "decline-insurance") {
        resolveDeferredBlackjack(gameState);
    }

    if (gameState.phase === "dealer-turn") resolveRound(gameState, shoe);

    write({ bankroll: gameState.bankroll, gameState, shoe });
    return { state: sanitizeState(gameState), balance: gameState.bankroll };
}

export function rewardGuest(): { balance: number } {
    const save = read();
    save.bankroll += REWARD;
    // Mid-round the header reads gameState.bankroll, so patch it too.
    if (save.gameState) save.gameState.bankroll += REWARD;
    write(save);
    return { balance: save.gameState?.bankroll ?? save.bankroll };
}
