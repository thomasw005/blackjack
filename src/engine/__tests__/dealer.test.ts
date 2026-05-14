import { describe, it, expect } from "vitest";
import { playDealerHand } from "../dealer";
import { getHandValue, isBust } from "../hand";
import { GameState, Shoe, Card, DealerHand } from "../types";

function makeShoe(cards: Card[]): Shoe {
    return { cards: [...cards], discardPile: [] };
}

function makeState(dealerCards: DealerHand["cards"]): GameState {
    return {
        playerHands: [{
            cards: [{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }],
            bet: 100,
            doubled: false,
            isSplit: false,
            isComplete: true,
            result: null,
        }],
        dealerHand: { cards: dealerCards, holeCardRevealed: false },
        activeHandIndex: 0,
        phase: "dealer-turn",
        bankroll: 1000,
        currentBet: 100,
        insuranceOffered: false,
        insuranceBet: 0,
    };
}

describe("playDealerHand", () => {
    it("reveals the hole card", () => {
        const state = makeState([{ rank: "K", suit: "hearts" }, { rank: "7", suit: "spades" }]);
        playDealerHand(state, makeShoe([]));
        expect(state.dealerHand.holeCardRevealed).toBe(true);
    });

    it("stands on hard 17", () => {
        const state = makeState([{ rank: "K", suit: "hearts" }, { rank: "7", suit: "spades" }]);
        playDealerHand(state, makeShoe([{ rank: "2", suit: "clubs" }]));
        expect(state.dealerHand.cards.length).toBe(2);
        expect(getHandValue(state.dealerHand)).toBe(17);
    });

    it("stands on hard 18", () => {
        const state = makeState([{ rank: "K", suit: "hearts" }, { rank: "8", suit: "spades" }]);
        playDealerHand(state, makeShoe([{ rank: "2", suit: "clubs" }]));
        expect(state.dealerHand.cards.length).toBe(2);
    });

    it("hits on hard 16", () => {
        const state = makeState([{ rank: "9", suit: "hearts" }, { rank: "7", suit: "spades" }]);
        playDealerHand(state, makeShoe([{ rank: "K", suit: "clubs" }]));
        expect(state.dealerHand.cards.length).toBe(3);
    });

    it("hits soft 17 (A + 6)", () => {
        const state = makeState([{ rank: "A", suit: "hearts" }, { rank: "6", suit: "spades" }]);
        playDealerHand(state, makeShoe([{ rank: "2", suit: "clubs" }]));
        expect(state.dealerHand.cards.length).toBe(3);
        expect(getHandValue(state.dealerHand)).toBe(19);
    });

    it("stands on soft 18 (A + 7)", () => {
        const state = makeState([{ rank: "A", suit: "hearts" }, { rank: "7", suit: "spades" }]);
        playDealerHand(state, makeShoe([{ rank: "2", suit: "clubs" }]));
        expect(state.dealerHand.cards.length).toBe(2);
        expect(getHandValue(state.dealerHand)).toBe(18);
    });

    it("hits multiple times until reaching at least hard 17", () => {
        // 5 + 4 = 9, draws 3 → 12, draws 5 → 17, stops
        const state = makeState([{ rank: "5", suit: "hearts" }, { rank: "4", suit: "spades" }]);
        playDealerHand(state, makeShoe([
            { rank: "3", suit: "clubs" },
            { rank: "5", suit: "diamonds" },
            { rank: "2", suit: "hearts" },
        ]));
        expect(state.dealerHand.cards.length).toBe(4);
        expect(getHandValue(state.dealerHand)).toBe(17);
    });

    it("draws past 21 when forced to (bust)", () => {
        // 10 + 6 = 16, draws K → 26, bust
        const state = makeState([{ rank: "10", suit: "hearts" }, { rank: "6", suit: "spades" }]);
        playDealerHand(state, makeShoe([{ rank: "K", suit: "clubs" }]));
        expect(state.dealerHand.cards.length).toBe(3);
        expect(isBust(state.dealerHand)).toBe(true);
    });
});
