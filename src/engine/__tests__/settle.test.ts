import { describe, it, expect } from "vitest";
import { settleRound } from "../settle";
import { GameState, PlayerHand, DealerHand } from "../types";
import { RULES } from "../constants";

function makePlayerHand(overrides: Partial<PlayerHand> = {}): PlayerHand {
    return {
        cards: [{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }],
        bet: 100,
        doubled: false,
        isSplit: false,
        isComplete: true,
        result: null,
        ...overrides,
    };
}

function makeState(playerHand: PlayerHand, dealerCards: DealerHand["cards"], bankroll = 1000): GameState {
    return {
        playerHands: [playerHand],
        dealerHand: { cards: dealerCards, holeCardRevealed: true },
        activeHandIndex: 0,
        phase: "dealer-turn",
        bankroll,
        currentBet: playerHand.bet,
        insuranceOffered: false,
        insuranceBet: 0,
    };
}

describe("settleRound", () => {
    it("player wins: bankroll increases by bet", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "9", suit: "spades" }], // 18
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "7", suit: "spades" }, // 16
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("win");
        expect(state.bankroll).toBe(1100);
    });

    it("player loses: bankroll decreases by bet", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "7", suit: "spades" }], // 16
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "9", suit: "spades" }, // 18
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("lose");
        expect(state.bankroll).toBe(900);
    });

    it("push: bankroll unchanged", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }], // 17
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "8", suit: "spades" }, // 17
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("push");
        expect(state.bankroll).toBe(1000);
    });

    it("player blackjack pays 3:2", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "A", suit: "hearts" }, { rank: "K", suit: "spades" }], // blackjack
            bet: 100,
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "8", suit: "spades" }, // 17, no blackjack
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("blackjack");
        expect(state.bankroll).toBe(1000 + 100 * RULES.blackjackPayout);
    });

    it("mutual blackjack is a push", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "A", suit: "hearts" }, { rank: "K", suit: "spades" }],
        });
        const state = makeState(hand, [
            { rank: "A", suit: "clubs" },
            { rank: "Q", suit: "diamonds" },
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("push");
        expect(state.bankroll).toBe(1000);
    });

    it("dealer blackjack beats player non-blackjack 21", () => {
        const hand = makePlayerHand({
            cards: [
                { rank: "7", suit: "hearts" },
                { rank: "7", suit: "spades" },
                { rank: "7", suit: "clubs" },
            ], // 21, not blackjack
        });
        const state = makeState(hand, [
            { rank: "A", suit: "clubs" },
            { rank: "Q", suit: "diamonds" }, // blackjack
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("lose");
    });

    it("player bust loses even if dealer also busts", () => {
        const hand = makePlayerHand({
            cards: [
                { rank: "10", suit: "hearts" },
                { rank: "10", suit: "spades" },
                { rank: "5", suit: "clubs" },
            ], // 25, bust
        });
        const state = makeState(hand, [
            { rank: "10", suit: "hearts" },
            { rank: "10", suit: "spades" },
            { rank: "5", suit: "clubs" }, // dealer also bust
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("lose");
        expect(state.bankroll).toBe(900);
    });

    it("dealer bust: player wins", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }], // 17
        });
        const state = makeState(hand, [
            { rank: "10", suit: "hearts" },
            { rank: "8", suit: "spades" },
            { rank: "5", suit: "clubs" }, // 23, bust
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("win");
        expect(state.bankroll).toBe(1100);
    });

    it("surrender: loses half the bet", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "7", suit: "spades" }],
            result: "surrender",
            bet: 100,
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "8", suit: "spades" },
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("surrender");
        expect(state.bankroll).toBe(950);
    });

    it("settles multiple hands independently", () => {
        // hand1 (18) wins vs dealer 16; hand2 (15) loses vs dealer 16
        const hand1 = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "9", suit: "spades" }], // 18
            bet: 100,
        });
        const hand2 = makePlayerHand({
            cards: [{ rank: "7", suit: "hearts" }, { rank: "8", suit: "spades" }], // 15
            bet: 100,
        });
        const state: GameState = {
            playerHands: [hand1, hand2],
            dealerHand: {
                cards: [{ rank: "9", suit: "clubs" }, { rank: "7", suit: "diamonds" }], // 16
                holeCardRevealed: true,
            },
            activeHandIndex: 0,
            phase: "dealer-turn",
            bankroll: 1000,
            currentBet: 100,
            insuranceOffered: false,
            insuranceBet: 0,
        };
        settleRound(state);
        expect(state.playerHands[0].result).toBe("win");
        expect(state.playerHands[1].result).toBe("lose");
        expect(state.bankroll).toBe(1000); // +100 - 100
    });
});
