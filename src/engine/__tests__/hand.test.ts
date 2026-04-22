import { describe, it, expect } from "vitest";
import { cardValue, getHandValue, isSoft, isBlackjack, isBust } from "../hand";
import { DealerHand } from "../types";

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
    expect(cardValue({ rank: "2", suit: "hearts" })).toBe(2);
    expect(cardValue({ rank: "3", suit: "hearts" })).toBe(3);
    expect(cardValue({ rank: "4", suit: "hearts" })).toBe(4);
    expect(cardValue({ rank: "5", suit: "hearts" })).toBe(5);
    expect(cardValue({ rank: "6", suit: "hearts" })).toBe(6);
    expect(cardValue({ rank: "7", suit: "hearts" })).toBe(7);
    expect(cardValue({ rank: "8", suit: "hearts" })).toBe(8);
    expect(cardValue({ rank: "9", suit: "hearts" })).toBe(9);
    expect(cardValue({ rank: "10", suit: "hearts" })).toBe(10);
  });
});

describe("getHandValue", () => {
  it("counts face cards as 10", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "K", suit: "hearts" },
            { rank: "Q", suit: "spades" }],
        holeCardRevealed: true };
    expect(getHandValue(hand)).toBe(20);
  });

  it("counts ace as 11 by default", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "9", suit: "spades" }],
        holeCardRevealed: true };
    expect(getHandValue(hand)).toBe(20);
  });

  it("flips ace from 11 to 1 to avoid bust", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "K", suit: "spades" },
            { rank: "5", suit: "clubs" }
        ],
        holeCardRevealed: true
    };
    expect(getHandValue(hand)).toBe(16);
  });

  it("flips two aces from 22 to 12 to avoid bust", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "A", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(getHandValue(hand)).toBe(12);
  });

  it("returns 21 for a natural blackjack", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "K", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(getHandValue(hand)).toBe(21);
  });

  it("returns correct value for a bust hand", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "10", suit: "hearts" },
            { rank: "10", suit: "spades" },
            { rank: "5", suit: "clubs" }
        ],
        holeCardRevealed: true
    };
    expect(getHandValue(hand)).toBe(25);
  });
});

describe("isSoft", () => {
  it("returns true for two aces", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "A", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(isSoft(hand)).toBe(true);
  });

  it("returns true for a soft 17 (A + 6)", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "6", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(isSoft(hand)).toBe(true);
  });

  it("returns false for a hard hand with no ace", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "10", suit: "hearts" },
            { rank: "7", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(isSoft(hand)).toBe(false);
  });

  it("returns false when ace can only count as 1 without busting", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "K", suit: "spades" },
            { rank: "5", suit: "clubs" }
        ],
        holeCardRevealed: true
    };
    expect(isSoft(hand)).toBe(false);
  });
});

describe("isBlackjack", () => {
  it("returns true for ace + face card", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "K", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(isBlackjack(hand)).toBe(true);
  });

  it("returns true for ace + 10", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "10", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(isBlackjack(hand)).toBe(true);
  });

  it("returns false for 21 reached in three cards", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "spades" },
            { rank: "7", suit: "clubs" }
        ],
        holeCardRevealed: true
    };
    expect(isBlackjack(hand)).toBe(false);
  });
});

describe("isBust", () => {
  it("returns true when hand exceeds 21", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "10", suit: "hearts" },
            { rank: "10", suit: "spades" },
            { rank: "5", suit: "clubs" }
        ],
        holeCardRevealed: true
    };
    expect(isBust(hand)).toBe(true);
  });

  it("returns false for exactly 21", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "K", suit: "spades" }
        ],
        holeCardRevealed: true
    };
    expect(isBust(hand)).toBe(false);
  });

  it("returns false when ace saves the hand from busting", () => {
    const hand: DealerHand = {
        cards: [
            { rank: "A", suit: "hearts" },
            { rank: "K", suit: "spades" },
            { rank: "5", suit: "clubs" }
        ],
        holeCardRevealed: true
    };
    expect(isBust(hand)).toBe(false);
  });
});
