import { describe, it, expect } from "vitest";
import { createShoe, drawCard, reshuffleIfNeeded } from "../shoe";
import { Shoe } from "../types";

describe("createShoe", () => {
    it("returns 312 cards", () => {
        const shoe = createShoe();
        expect(shoe.cards.length).toBe(312);
    });

    it("starts with an empty discard pile", () => {
        const shoe = createShoe();
        expect(shoe.discardPile.length).toBe(0);
    });

    it("contains each rank 24 times", () => {
        const shoe = createShoe();
        const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        for (const rank of ranks) {
            const count = shoe.cards.filter(c => c.rank === rank).length;
            expect(count, `rank ${rank}`).toBe(24);
        }
    });
});

describe("drawCard", () => {
    it("returns a card and removes it from the shoe", () => {
        const shoe = createShoe();
        const sizeBefore = shoe.cards.length;
        const card = drawCard(shoe);
        expect(card).toBeDefined();
        expect(shoe.cards.length).toBe(sizeBefore - 1);
    });

    it("throws when the shoe is empty", () => {
        const shoe: Shoe = { cards: [], discardPile: [] };
        expect(() => drawCard(shoe)).toThrow();
    });
});

describe("reshuffleIfNeeded", () => {
    it("does nothing when shoe has more than enough cards", () => {
        const shoe: Shoe = {
            cards: Array(200).fill({ rank: "2", suit: "hearts" }),
            discardPile: Array(10).fill({ rank: "3", suit: "spades" })
        };
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(200);
        expect(shoe.discardPile.length).toBe(10);
    });

    it("does not reshuffle at exactly the threshold (78 cards)", () => {
        const shoe: Shoe = {
            cards: Array(78).fill({ rank: "2", suit: "hearts" }),
            discardPile: Array(10).fill({ rank: "3", suit: "spades" })
        };
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(78);
        expect(shoe.discardPile.length).toBe(10);
    });

    it("reshuffles when below threshold (77 cards)", () => {
        const shoe: Shoe = {
            cards: Array(77).fill({ rank: "2", suit: "hearts" }),
            discardPile: Array(10).fill({ rank: "3", suit: "spades" })
        };
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(87);
    });

    it("clears the discard pile after reshuffling", () => {
        const shoe: Shoe = {
            cards: Array(77).fill({ rank: "2", suit: "hearts" }),
            discardPile: Array(10).fill({ rank: "3", suit: "spades" })
        };
        reshuffleIfNeeded(shoe);
        expect(shoe.discardPile.length).toBe(0);
    });
});
