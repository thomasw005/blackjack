import { describe, it, expect } from "vitest";
import { createShoe, drawCard, reshuffleIfNeeded } from "../shoe";
import { Shoe } from "../types";
import { RULES, RANKS, SUITS } from "../constants";

const TOTAL_CARDS = 52 * RULES.numDecks;
const RESHUFFLE_THRESHOLD = Math.floor(RULES.numDecks * 52 * RULES.reshufflePercent);

function makeShoe(numCards: number, numDiscard = 0): Shoe {
    return {
        cards: Array(numCards).fill({ rank: "2", suit: "hearts" }),
        discardPile: Array(numDiscard).fill({ rank: "3", suit: "spades" }),
    };
}

describe("createShoe", () => {
    it(`returns ${TOTAL_CARDS} cards for ${RULES.numDecks} decks`, () => {
        const shoe = createShoe();
        expect(shoe.cards.length).toBe(TOTAL_CARDS);
    });

    it("starts with an empty discard pile", () => {
        const shoe = createShoe();
        expect(shoe.discardPile.length).toBe(0);
    });

    it("contains each rank the correct number of times", () => {
        const shoe = createShoe();
        for (const rank of RANKS) {
            const count = shoe.cards.filter(c => c.rank === rank).length;
            expect(count, `rank ${rank}`).toBe(4 * RULES.numDecks);
        }
    });

    it("contains each suit the correct number of times", () => {
        const shoe = createShoe();
        for (const suit of SUITS) {
            const count = shoe.cards.filter(c => c.suit === suit).length;
            expect(count, `suit ${suit}`).toBe(13 * RULES.numDecks);
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
        expect(() => drawCard(makeShoe(0))).toThrow();
    });

    it("moves the drawn card to the discard pile", () => {
        const shoe = createShoe();
        const card = drawCard(shoe);
        expect(shoe.discardPile).toHaveLength(1);
        expect(shoe.discardPile[0]).toEqual(card);
    });

    // The discard pile used to stay empty, so reshuffleIfNeeded had nothing to recycle
    // and a shoe kept across rounds drained until drawCard threw "Shoe is empty".
    it("sustains a shoe indefinitely when reshuffled at the cut card", () => {
        const shoe = createShoe();
        for (let i = 0; i < TOTAL_CARDS * 5; i++) {
            reshuffleIfNeeded(shoe);
            expect(() => drawCard(shoe)).not.toThrow();
        }
    });
});

describe("reshuffleIfNeeded", () => {
    it("does nothing when shoe is well above the threshold", () => {
        const shoe = makeShoe(RESHUFFLE_THRESHOLD + 100, 10);
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(RESHUFFLE_THRESHOLD + 100);
        expect(shoe.discardPile.length).toBe(10);
    });

    it("does not reshuffle at exactly the threshold", () => {
        const shoe = makeShoe(RESHUFFLE_THRESHOLD, 10);
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(RESHUFFLE_THRESHOLD);
        expect(shoe.discardPile.length).toBe(10);
    });

    it("reshuffles when one card below the threshold", () => {
        const shoe = makeShoe(RESHUFFLE_THRESHOLD - 1, 10);
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(RESHUFFLE_THRESHOLD - 1 + 10);
    });

    it("clears the discard pile after reshuffling", () => {
        const shoe = makeShoe(RESHUFFLE_THRESHOLD - 1, 10);
        reshuffleIfNeeded(shoe);
        expect(shoe.discardPile.length).toBe(0);
    });

    it("reshuffles correctly when discard pile is empty", () => {
        const shoe = makeShoe(RESHUFFLE_THRESHOLD - 1);
        reshuffleIfNeeded(shoe);
        expect(shoe.cards.length).toBe(RESHUFFLE_THRESHOLD - 1);
        expect(shoe.discardPile.length).toBe(0);
    });
});
