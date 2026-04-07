import { Card, Shoe } from "./types";
import { RULES, RANKS, SUITS } from "./constants";

export function createShoe(): Shoe {
    const deck: Card[] = [];

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }

    const cards: Card[] = [];
    for (let i = 0; i < RULES.numDecks; i++) {
        cards.push(...deck);
    }

    shuffle(cards)
    return { cards, discardPile: []};
}

function shuffle(cards: Card[]): void {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
}

export function drawCard(shoe: Shoe): Card {
    const card = shoe.cards.shift();
    if (!card) throw new Error("Shoe is empty");
    return card;
}

export function reshuffleIfNeeded(shoe: Shoe): void {
    if (shoe.cards.length < RULES.numDecks * 52 * RULES.reshufflePercent) {
        shoe.cards.push(...shoe.discardPile);
        shoe.discardPile = [];
        shuffle(shoe.cards);
    }
}