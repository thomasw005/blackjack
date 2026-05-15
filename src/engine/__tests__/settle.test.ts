import { describe, it, expect } from "vitest";
import { settleRound } from "../settle";
import { GameState, PlayerHand, DealerHand } from "../types";
import { RULES } from "../constants";

// bankroll in makeState represents the post-bet state (startRound already deducted the bet).
// payout returns gross amounts: win = 2×bet, push = bet returned, lose = 0, etc.

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
    it("player wins: returns 2×bet (bet back + equal profit)", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "9", suit: "spades" }], // 18
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "7", suit: "spades" }, // 16
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("win");
        expect(state.bankroll).toBe(1200); // 1000 + 2×100
    });

    it("player loses: returns nothing (bet was lost at startRound)", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "7", suit: "spades" }], // 16
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "9", suit: "spades" }, // 18
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("lose");
        expect(state.bankroll).toBe(1000); // 1000 + 0
    });

    it("push: returns the original bet", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }], // 17
        });
        const state = makeState(hand, [
            { rank: "9", suit: "hearts" },
            { rank: "8", suit: "spades" }, // 17
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("push");
        expect(state.bankroll).toBe(1100); // 1000 + 100 (bet returned)
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
        expect(state.bankroll).toBe(1000 + 100 * (1 + RULES.blackjackPayout)); // 1250
    });

    it("mutual blackjack is a push: returns the original bet", () => {
        const hand = makePlayerHand({
            cards: [{ rank: "A", suit: "hearts" }, { rank: "K", suit: "spades" }],
        });
        const state = makeState(hand, [
            { rank: "A", suit: "clubs" },
            { rank: "Q", suit: "diamonds" },
        ]);
        settleRound(state);
        expect(state.playerHands[0].result).toBe("push");
        expect(state.bankroll).toBe(1100); // 1000 + 100 (bet returned)
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
        expect(state.bankroll).toBe(1000); // 1000 + 0
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
        expect(state.bankroll).toBe(1200); // 1000 + 2×100
    });

    it("surrender: returns half the bet", () => {
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
        expect(state.bankroll).toBe(1050); // 1000 + 50 (half returned)
    });

    it("settles multiple hands independently", () => {
        // hand1 (18) wins vs dealer 16; hand2 (15) loses vs dealer 16
        // bankroll=1000 is post-bet for both hands (original was 1200, bets totalled 200)
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
        expect(state.bankroll).toBe(1200); // 1000 + 2×100 (win) + 0 (lose)
    });
});
