import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    loadGuest,
    clearGuest,
    startGuestRound,
    applyGuestAction,
    rewardGuest,
    GUEST_STARTING_BANKROLL,
    GUEST_GAME_ID,
} from "../guestGame";
import { MIN_BET } from "@/engine/constants";

// Minimal localStorage stand-in — guestGame only needs get/set/remove.
function installLocalStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
        localStorage: {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
        },
    });
    return store;
}

// Plays the round to completion so we can assert on settled state.
function playToSettled() {
    for (let i = 0; i < 30; i++) {
        const snap = loadGuest();
        if (!snap.state) break;
        const phase = snap.state.phase;
        if (phase === "insurance") applyGuestAction("decline-insurance");
        else if (phase === "player-turn") applyGuestAction("stand");
        else break;
    }
}

describe("guestGame", () => {
    beforeEach(() => {
        installLocalStorage();
    });

    it("starts a new guest at the same bankroll a new account gets", () => {
        const snap = loadGuest();
        expect(snap.balance).toBe(GUEST_STARTING_BANKROLL);
        expect(snap.gameId).toBeNull();
        expect(snap.state).toBeNull();
    });

    it("deducts the bet and deals two cards to the player", () => {
        const result = startGuestRound(50);
        expect("error" in result).toBe(false);
        if ("error" in result) return;

        expect(result.state.playerHands[0].cards).toHaveLength(2);
        // A natural settles the round on the deal, so the bet is only the whole story
        // while play is still live.
        if (result.state.phase !== "settled") {
            expect(result.balance).toBe(GUEST_STARTING_BANKROLL - 50);
        }
    });

    it("hides the dealer hole card until it is revealed", () => {
        const result = startGuestRound(MIN_BET);
        if ("error" in result) throw new Error(result.error);

        if (!result.state.dealerHand.holeCardRevealed) {
            expect(result.state.dealerHand.cards).toHaveLength(1);
        }
    });

    it("rejects a bet below the minimum", () => {
        const result = startGuestRound(MIN_BET - 1);
        expect(result).toEqual({ error: `Minimum bet is $${MIN_BET}` });
    });

    it("rejects a bet larger than the bankroll", () => {
        const result = startGuestRound(GUEST_STARTING_BANKROLL + 1);
        expect(result).toEqual({ error: "Insufficient balance" });
    });

    it("rejects an action when no round is in progress", () => {
        const result = applyGuestAction("hit");
        expect(result).toEqual({ error: "Game not found" });
    });

    it("rejects an illegal action for the current phase", () => {
        startGuestRound(MIN_BET);
        playToSettled();
        // Round is over — hitting is no longer legal.
        const result = applyGuestAction("hit");
        expect("error" in result).toBe(true);
    });

    it("persists an in-progress round across a reload", () => {
        const started = startGuestRound(MIN_BET);
        if ("error" in started) throw new Error(started.error);

        // Only rounds still in play are restored; a blackjack settles immediately.
        if (started.state.phase !== "settled") {
            const restored = loadGuest();
            expect(restored.gameId).toBe(GUEST_GAME_ID);
            expect(restored.state?.playerHands[0].cards).toEqual(started.state.playerHands[0].cards);
        }
    });

    it("returns to the betting screen after the round settles", () => {
        startGuestRound(MIN_BET);
        playToSettled();

        const snap = loadGuest();
        expect(snap.gameId).toBeNull();
        expect(snap.state).toBeNull();
        // Bankroll carries forward.
        expect(typeof snap.balance).toBe("number");
    });

    it("keeps the bankroll consistent across a full round", () => {
        const bet = 50;
        startGuestRound(bet);
        playToSettled();

        const snap = loadGuest();
        const hand = { win: bet, lose: -bet, push: 0 };
        // Whatever the outcome, the bankroll must land on one of the legal results.
        const possible = [
            GUEST_STARTING_BANKROLL + hand.win,
            GUEST_STARTING_BANKROLL + hand.lose,
            GUEST_STARTING_BANKROLL + hand.push,
            GUEST_STARTING_BANKROLL + Math.round(bet * 1.5), // blackjack
            GUEST_STARTING_BANKROLL - Math.floor(bet / 2), // surrender
        ];
        expect(possible).toContain(snap.balance);
    });

    it("credits an ad reward to the bankroll", () => {
        const before = loadGuest().balance;
        const { balance } = rewardGuest();
        expect(balance).toBe(before + 10);
        expect(loadGuest().balance).toBe(before + 10);
    });

    it("credits an ad reward mid-round without disturbing the hand", () => {
        const started = startGuestRound(MIN_BET);
        if ("error" in started) throw new Error(started.error);
        const cardsBefore = started.state.playerHands[0].cards;

        const { balance } = rewardGuest();
        expect(balance).toBe(started.balance + 10);
        if (started.state.phase !== "settled") {
            expect(loadGuest().state?.playerHands[0].cards).toEqual(cardsBefore);
        }
    });

    it("resets to a fresh bankroll when guest data is cleared on sign-in", () => {
        startGuestRound(100);
        clearGuest();

        const snap = loadGuest();
        expect(snap.balance).toBe(GUEST_STARTING_BANKROLL);
        expect(snap.state).toBeNull();
    });

    it("falls back to a fresh bankroll if stored data is corrupt", () => {
        window.localStorage.setItem("wbj:guest:v1", "not json");
        expect(loadGuest().balance).toBe(GUEST_STARTING_BANKROLL);
    });

    // drawCard never pushes to discardPile, so reshuffleIfNeeded recycles nothing.
    // A shoe carried across rounds drains to empty and throws ("Shoe is empty")
    // around round 64 — startGuestRound cuts in a fresh shoe at the cut card.
    it("survives far more rounds than a single shoe holds", () => {
        for (let round = 0; round < 300; round++) {
            const started = startGuestRound(MIN_BET);
            if ("error" in started) {
                // Only a drained bankroll is an acceptable stop.
                expect(started.error).toBe("Insufficient balance");
                rewardGuest();
                continue;
            }
            playToSettled();
            const snap = loadGuest();
            expect(snap.state).toBeNull();
        }
    });

    it("never surfaces an engine crash as a broken hand", () => {
        for (let round = 0; round < 300; round++) {
            const started = startGuestRound(MIN_BET);
            if ("error" in started) {
                rewardGuest();
                continue;
            }
            for (let i = 0; i < 30; i++) {
                const snap = loadGuest();
                if (!snap.state) break;
                const phase = snap.state.phase;
                let res;
                if (phase === "insurance") res = applyGuestAction("decline-insurance");
                else if (phase === "player-turn") res = applyGuestAction("hit");
                else break;
                if ("error" in res) {
                    expect(res.error).not.toMatch(/Something went wrong/);
                    break;
                }
            }
        }
    });
});
