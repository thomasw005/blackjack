import { describe, it, expect } from "vitest";
import { canDouble, canSplit, canSurrender, canTakeInsurance } from "../rules";
import { GameState } from "../types";

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        playerHands: [{
            cards: [{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }],
            bet: 100,
            doubled: false,
            isSplit: false,
            isComplete: false,
            result: null,
        }],
        dealerHand: { cards: [{ rank: "7", suit: "hearts" }, { rank: "K", suit: "spades" }], holeCardRevealed: false },
        activeHandIndex: 0,
        phase: "player-turn",
        bankroll: 1000,
        currentBet: 100,
        insuranceOffered: false,
        insuranceBet: 0,
        ...overrides,
    };
}

describe("canDouble", () => {
    it("returns true when all conditions are met", () => {
        expect(canDouble(makeState())).toBe(true);
    });

    it("returns false when phase is not player-turn", () => {
        expect(canDouble(makeState({ phase: "betting" }))).toBe(false);
        expect(canDouble(makeState({ phase: "insurance" }))).toBe(false);
        expect(canDouble(makeState({ phase: "dealer-turn" }))).toBe(false);
    });

    it("returns false when hand has more than 2 cards", () => {
        const state = makeState();
        state.playerHands[0].cards.push({ rank: "2", suit: "clubs" });
        expect(canDouble(state)).toBe(false);
    });

    it("returns false when bankroll is less than the bet", () => {
        const state = makeState({ bankroll: 99 });
        state.playerHands[0].bet = 100;
        expect(canDouble(state)).toBe(false);
    });

    it("returns true when bankroll exactly equals the bet", () => {
        const state = makeState({ bankroll: 100 });
        state.playerHands[0].bet = 100;
        expect(canDouble(state)).toBe(true);
    });
});

describe("canSplit", () => {
    it("returns true for matching ranks (A + A)", () => {
        const state = makeState();
        state.playerHands[0].cards = [
            { rank: "A", suit: "hearts" },
            { rank: "A", suit: "spades" },
        ];
        expect(canSplit(state)).toBe(true);
    });

    it("returns true for different ranks with same value (J + Q)", () => {
        const state = makeState();
        state.playerHands[0].cards = [
            { rank: "J", suit: "hearts" },
            { rank: "Q", suit: "spades" },
        ];
        expect(canSplit(state)).toBe(true);
    });

    it("returns false for cards with different values", () => {
        const state = makeState();
        state.playerHands[0].cards = [
            { rank: "9", suit: "hearts" },
            { rank: "8", suit: "spades" },
        ];
        expect(canSplit(state)).toBe(false);
    });

    it("returns false when phase is not player-turn", () => {
        const state = makeState({ phase: "dealer-turn" });
        state.playerHands[0].cards = [
            { rank: "A", suit: "hearts" },
            { rank: "A", suit: "spades" },
        ];
        expect(canSplit(state)).toBe(false);
    });

    it("returns false when hand has more than 2 cards", () => {
        const state = makeState();
        state.playerHands[0].cards = [
            { rank: "8", suit: "hearts" },
            { rank: "8", suit: "spades" },
            { rank: "2", suit: "clubs" },
        ];
        expect(canSplit(state)).toBe(false);
    });

    it("returns false when bankroll is less than the bet", () => {
        const state = makeState({ bankroll: 99 });
        state.playerHands[0].cards = [
            { rank: "A", suit: "hearts" },
            { rank: "A", suit: "spades" },
        ];
        state.playerHands[0].bet = 100;
        expect(canSplit(state)).toBe(false);
    });

    it("returns true when bankroll exactly equals the bet", () => {
        const state = makeState({ bankroll: 100 });
        state.playerHands[0].cards = [
            { rank: "A", suit: "hearts" },
            { rank: "A", suit: "spades" },
        ];
        state.playerHands[0].bet = 100;
        expect(canSplit(state)).toBe(true);
    });
});

describe("canSurrender", () => {
    it("returns true for a normal 2-card non-split hand", () => {
        expect(canSurrender(makeState())).toBe(true);
    });

    it("returns false when phase is not player-turn", () => {
        expect(canSurrender(makeState({ phase: "dealer-turn" }))).toBe(false);
        expect(canSurrender(makeState({ phase: "insurance" }))).toBe(false);
    });

    it("returns false when hand has more than 2 cards", () => {
        const state = makeState();
        state.playerHands[0].cards.push({ rank: "2", suit: "clubs" });
        expect(canSurrender(state)).toBe(false);
    });

    it("returns false for a split hand", () => {
        const state = makeState();
        state.playerHands[0].isSplit = true;
        expect(canSurrender(state)).toBe(false);
    });
});

describe("canTakeInsurance", () => {
    it("returns true when phase is insurance and bankroll covers half the bet", () => {
        expect(canTakeInsurance(makeState({ phase: "insurance", bankroll: 1000, currentBet: 100 }))).toBe(true);
    });

    it("returns false when phase is not insurance", () => {
        expect(canTakeInsurance(makeState({ phase: "player-turn" }))).toBe(false);
        expect(canTakeInsurance(makeState({ phase: "betting" }))).toBe(false);
    });

    it("returns false when bankroll is less than floor(currentBet / 2)", () => {
        expect(canTakeInsurance(makeState({ phase: "insurance", bankroll: 49, currentBet: 100 }))).toBe(false);
    });

    it("returns true when bankroll exactly equals floor(currentBet / 2)", () => {
        expect(canTakeInsurance(makeState({ phase: "insurance", bankroll: 50, currentBet: 100 }))).toBe(true);
    });

    it("uses floor for odd bets (bet=101, insurance threshold=50)", () => {
        expect(canTakeInsurance(makeState({ phase: "insurance", bankroll: 50, currentBet: 101 }))).toBe(true);
        expect(canTakeInsurance(makeState({ phase: "insurance", bankroll: 49, currentBet: 101 }))).toBe(false);
    });
});
