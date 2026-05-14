import { describe, it, expect } from "vitest";
import { cardValue, getHandValue, isSoft, isBlackjack, isBust } from "../hand";
import { DealerHand, PlayerHand, Rank, Suit } from "../types";

// Suit is irrelevant for all hand value logic — use a fixed suit in helpers
function makeHand(...ranks: Rank[]): DealerHand {
    return {
        cards: ranks.map(rank => ({ rank, suit: "hearts" as Suit })),
        holeCardRevealed: true,
    };
}

function makeSplitHand(...ranks: Rank[]): PlayerHand {
    return {
        cards: ranks.map(rank => ({ rank, suit: "hearts" as Suit })),
        bet: 100,
        doubled: false,
        isSplit: true,
        isComplete: false,
        result: null,
    };
}

describe("cardValue", () => {
    it("returns 11 for aces", () => {
        expect(cardValue({ rank: "A", suit: "hearts" })).toBe(11);
    });

    it("returns 10 for face cards", () => {
        expect(cardValue({ rank: "K", suit: "hearts" })).toBe(10);
        expect(cardValue({ rank: "Q", suit: "hearts" })).toBe(10);
        expect(cardValue({ rank: "J", suit: "hearts" })).toBe(10);
    });

    it("returns numeric value for number cards", () => {
        for (const rank of ["2", "3", "4", "5", "6", "7", "8", "9", "10"] as Rank[]) {
            expect(cardValue({ rank, suit: "hearts" }), `rank ${rank}`).toBe(Number(rank));
        }
    });
});

describe("getHandValue", () => {
    it("counts face cards as 10", () => {
        expect(getHandValue(makeHand("K", "Q"))).toBe(20);
    });

    it("counts ace as 11 by default", () => {
        expect(getHandValue(makeHand("A", "9"))).toBe(20);
    });

    it("flips ace from 11 to 1 to avoid bust", () => {
        expect(getHandValue(makeHand("A", "K", "5"))).toBe(16);
    });

    it("handles two aces (22 → 12)", () => {
        expect(getHandValue(makeHand("A", "A"))).toBe(12);
    });

    it("handles three aces (33 → 13)", () => {
        expect(getHandValue(makeHand("A", "A", "A"))).toBe(13);
    });

    it("returns 21 for a natural blackjack", () => {
        expect(getHandValue(makeHand("A", "K"))).toBe(21);
    });

    it("returns the correct value for a bust hand", () => {
        expect(getHandValue(makeHand("10", "10", "5"))).toBe(25);
    });
});

describe("isSoft", () => {
    it("returns true for a soft 17 (A + 6)", () => {
        expect(isSoft(makeHand("A", "6"))).toBe(true);
    });

    it("returns true for two aces (A + A = 12, soft)", () => {
        expect(isSoft(makeHand("A", "A"))).toBe(true);
    });

    it("returns false for a hard hand with no ace", () => {
        expect(isSoft(makeHand("10", "7"))).toBe(false);
    });

    it("returns false when ace can only count as 1 without busting", () => {
        expect(isSoft(makeHand("A", "K", "5"))).toBe(false);
    });
});

describe("isBlackjack", () => {
    it("returns true for ace + face card", () => {
        expect(isBlackjack(makeHand("A", "K"))).toBe(true);
    });

    it("returns true for ace + 10", () => {
        expect(isBlackjack(makeHand("A", "10"))).toBe(true);
    });

    it("returns false for 21 reached in three cards", () => {
        expect(isBlackjack(makeHand("7", "7", "7"))).toBe(false);
    });

    it("returns false for a split hand that totals 21", () => {
        expect(isBlackjack(makeSplitHand("A", "K"))).toBe(false);
    });
});

describe("isBust", () => {
    it("returns true when hand exceeds 21", () => {
        expect(isBust(makeHand("10", "10", "5"))).toBe(true);
    });

    it("returns false for exactly 21", () => {
        expect(isBust(makeHand("A", "K"))).toBe(false);
    });

    it("returns false when an ace saves the hand from busting", () => {
        expect(isBust(makeHand("A", "K", "5"))).toBe(false);
    });
});
