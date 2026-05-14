import { describe, it, expect } from "vitest";
import { startRound, applyPlayerAction, advanceToNextHand } from "../round";
import { GameState, Shoe, Card, PlayerHand } from "../types";
import { RULES } from "../constants";

// Dealing order is P1 → D1 → P2 → D2, so shoe[0]=P1, shoe[1]=D1, shoe[2]=P2, shoe[3]=D2
// Padding ensures reshuffleIfNeeded does not trigger (threshold = numDecks * 52 * reshufflePercent = 78)
function makeShoe(...topCards: Card[]): Shoe {
    const padding: Card[] = Array(80).fill({ rank: "2", suit: "hearts" });
    return { cards: [...topCards, ...padding], discardPile: [] };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        playerHands: [],
        dealerHand: { cards: [], holeCardRevealed: false },
        activeHandIndex: 0,
        phase: "betting",
        bankroll: 1000,
        currentBet: 0,
        insuranceOffered: false,
        insuranceBet: 0,
        ...overrides,
    };
}

function makePlayerHand(cards: Card[], bet = 100, isComplete = false): PlayerHand {
    return {
        cards,
        bet,
        doubled: false,
        isSplit: false,
        isComplete,
        result: null,
    };
}

// ─── startRound ───────────────────────────────────────────────────────────────

describe("startRound", () => {
    it("deducts the bet from bankroll and sets currentBet", () => {
        const state = makeState({ bankroll: 1000 });
        startRound(state, makeShoe(
            { rank: "9", suit: "hearts" },
            { rank: "7", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "K", suit: "diamonds" },
        ), 100);
        expect(state.bankroll).toBe(900);
        expect(state.currentBet).toBe(100);
    });

    it("deals player and dealer hands in the correct order (P1 D1 P2 D2)", () => {
        const state = makeState();
        startRound(state, makeShoe(
            { rank: "9", suit: "hearts" },  // P1
            { rank: "7", suit: "clubs" },   // D1 (upcard)
            { rank: "8", suit: "spades" },  // P2
            { rank: "K", suit: "diamonds" }, // D2
        ), 100);
        expect(state.playerHands[0].cards[0].rank).toBe("9");
        expect(state.playerHands[0].cards[1].rank).toBe("8");
        expect(state.dealerHand.cards[0].rank).toBe("7");
        expect(state.dealerHand.cards[1].rank).toBe("K");
    });

    it("sets phase to player-turn for a normal deal", () => {
        const state = makeState();
        startRound(state, makeShoe(
            { rank: "9", suit: "hearts" },
            { rank: "7", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "K", suit: "diamonds" },
        ), 100);
        expect(state.phase).toBe("player-turn");
    });

    it("sets phase to insurance when dealer upcard is an Ace", () => {
        const state = makeState();
        startRound(state, makeShoe(
            { rank: "9", suit: "hearts" },
            { rank: "A", suit: "clubs" },   // D1 = Ace → insurance
            { rank: "8", suit: "spades" },
            { rank: "K", suit: "diamonds" },
        ), 100);
        expect(state.phase).toBe("insurance");
        expect(state.insuranceOffered).toBe(true);
    });

    it("sets phase to dealer-turn and marks hand complete when player has blackjack", () => {
        const state = makeState();
        startRound(state, makeShoe(
            { rank: "A", suit: "hearts" },  // P1
            { rank: "7", suit: "clubs" },   // D1 (not Ace, so no insurance)
            { rank: "K", suit: "spades" },  // P2 → player: A+K = blackjack
            { rank: "8", suit: "diamonds" },
        ), 100);
        expect(state.phase).toBe("dealer-turn");
        expect(state.playerHands[0].isComplete).toBe(true);
    });

    it("insurance takes priority over player blackjack when dealer upcard is Ace", () => {
        const state = makeState();
        startRound(state, makeShoe(
            { rank: "A", suit: "hearts" },  // P1
            { rank: "A", suit: "clubs" },   // D1 = Ace → insurance first
            { rank: "K", suit: "spades" },  // P2 → player would have blackjack
            { rank: "K", suit: "diamonds" },
        ), 100);
        expect(state.phase).toBe("insurance");
    });

    it("resets insurance state from a previous round", () => {
        const state = makeState({ insuranceBet: 50, insuranceOffered: true });
        startRound(state, makeShoe(
            { rank: "9", suit: "hearts" },
            { rank: "7", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "K", suit: "diamonds" },
        ), 100);
        expect(state.insuranceBet).toBe(0);
        expect(state.insuranceOffered).toBe(false);
    });

    it("hole card is not revealed after the deal", () => {
        const state = makeState();
        startRound(state, makeShoe(
            { rank: "9", suit: "hearts" },
            { rank: "7", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "K", suit: "diamonds" },
        ), 100);
        expect(state.dealerHand.holeCardRevealed).toBe(false);
    });
});

// ─── applyPlayerAction ────────────────────────────────────────────────────────

describe("applyPlayerAction", () => {
    it("hit: adds a card to the active hand", () => {
        const state = makeState({
            phase: "player-turn",
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "7", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe({ rank: "2", suit: "clubs" }), "hit");
        expect(state.playerHands[0].cards.length).toBe(3);
        expect(state.playerHands[0].isComplete).toBe(false);
    });

    it("hit that causes bust: marks hand complete and transitions to dealer-turn", () => {
        const state = makeState({
            phase: "player-turn",
            playerHands: [makePlayerHand([{ rank: "10", suit: "hearts" }, { rank: "9", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe({ rank: "K", suit: "clubs" }), "hit"); // 10+9+10 = 29
        expect(state.playerHands[0].isComplete).toBe(true);
        expect(state.phase).toBe("dealer-turn");
    });

    it("stand: marks hand complete and transitions to dealer-turn", () => {
        const state = makeState({
            phase: "player-turn",
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe(), "stand");
        expect(state.playerHands[0].isComplete).toBe(true);
        expect(state.phase).toBe("dealer-turn");
    });

    it("double: doubles the bet, deducts from bankroll, draws one card, marks complete", () => {
        const state = makeState({
            phase: "player-turn",
            bankroll: 1000,
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }], 100)],
        });
        applyPlayerAction(state, makeShoe({ rank: "2", suit: "clubs" }), "double");
        expect(state.playerHands[0].bet).toBe(200);
        expect(state.playerHands[0].doubled).toBe(true);
        expect(state.playerHands[0].cards.length).toBe(3);
        expect(state.playerHands[0].isComplete).toBe(true);
        expect(state.bankroll).toBe(900);
    });

    it("split: replaces one hand with two hands, each with one original card and one new card", () => {
        const state = makeState({
            phase: "player-turn",
            bankroll: 1000,
            playerHands: [makePlayerHand([{ rank: "8", suit: "hearts" }, { rank: "8", suit: "spades" }], 100)],
        });
        applyPlayerAction(state, makeShoe(
            { rank: "3", suit: "clubs" },
            { rank: "4", suit: "diamonds" },
        ), "split");
        expect(state.playerHands.length).toBe(2);
        expect(state.playerHands[0].cards[0].rank).toBe("8");
        expect(state.playerHands[1].cards[0].rank).toBe("8");
        expect(state.playerHands[0].isSplit).toBe(true);
        expect(state.playerHands[1].isSplit).toBe(true);
        expect(state.bankroll).toBe(900);
    });

    it("split aces: both hands are immediately marked complete", () => {
        const state = makeState({
            phase: "player-turn",
            bankroll: 1000,
            playerHands: [makePlayerHand([{ rank: "A", suit: "hearts" }, { rank: "A", suit: "spades" }], 100)],
        });
        applyPlayerAction(state, makeShoe(
            { rank: "K", suit: "clubs" },
            { rank: "Q", suit: "diamonds" },
        ), "split");
        expect(state.playerHands[0].isComplete).toBe(true);
        expect(state.playerHands[1].isComplete).toBe(true);
        expect(state.phase).toBe("dealer-turn");
    });

    it("surrender: sets result to surrender and marks hand complete", () => {
        const state = makeState({
            phase: "player-turn",
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "7", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe(), "surrender");
        expect(state.playerHands[0].result).toBe("surrender");
        expect(state.playerHands[0].isComplete).toBe(true);
    });

    it("insurance: deducts floor(bet/2) from bankroll, sets insuranceBet, advances to player-turn", () => {
        const state = makeState({
            phase: "insurance",
            bankroll: 1000,
            currentBet: 100,
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe(), "insurance");
        expect(state.insuranceBet).toBe(50);
        expect(state.bankroll).toBe(950);
        expect(state.phase).toBe("player-turn");
    });

    it("insurance: uses floor for odd bets (bet=101, insurance=50)", () => {
        const state = makeState({
            phase: "insurance",
            bankroll: 1000,
            currentBet: 101,
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe(), "insurance");
        expect(state.insuranceBet).toBe(50);
        expect(state.bankroll).toBe(950);
    });

    it("decline-insurance: transitions to player-turn without changing bankroll", () => {
        const state = makeState({
            phase: "insurance",
            bankroll: 1000,
            currentBet: 100,
            playerHands: [makePlayerHand([{ rank: "9", suit: "hearts" }, { rank: "8", suit: "spades" }])],
        });
        applyPlayerAction(state, makeShoe(), "decline-insurance");
        expect(state.bankroll).toBe(1000);
        expect(state.insuranceBet).toBe(0);
        expect(state.phase).toBe("player-turn");
    });
});

// ─── advanceToNextHand ────────────────────────────────────────────────────────

describe("advanceToNextHand", () => {
    it("transitions to dealer-turn when there are no more incomplete hands", () => {
        const state = makeState({
            phase: "player-turn",
            activeHandIndex: 0,
            playerHands: [makePlayerHand([], 100, true)],
        });
        advanceToNextHand(state);
        expect(state.phase).toBe("dealer-turn");
    });

    it("advances activeHandIndex to the next incomplete hand", () => {
        const state = makeState({
            phase: "player-turn",
            activeHandIndex: 0,
            playerHands: [
                makePlayerHand([], 100, true),  // index 0, complete
                makePlayerHand([], 100, false), // index 1, incomplete
            ],
        });
        advanceToNextHand(state);
        expect(state.activeHandIndex).toBe(1);
        expect(state.phase).toBe("player-turn");
    });

    it("transitions to dealer-turn when all remaining hands are complete", () => {
        const state = makeState({
            phase: "player-turn",
            activeHandIndex: 0,
            playerHands: [
                makePlayerHand([], 100, true),
                makePlayerHand([], 100, true),
            ],
        });
        advanceToNextHand(state);
        expect(state.phase).toBe("dealer-turn");
    });

    it("skips complete hands when finding the next active hand", () => {
        const state = makeState({
            phase: "player-turn",
            activeHandIndex: 0,
            playerHands: [
                makePlayerHand([], 100, true),  // index 0, complete
                makePlayerHand([], 100, true),  // index 1, complete
                makePlayerHand([], 100, false), // index 2, incomplete
            ],
        });
        advanceToNextHand(state);
        expect(state.activeHandIndex).toBe(2);
        expect(state.phase).toBe("player-turn");
    });
});
