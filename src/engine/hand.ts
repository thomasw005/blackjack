import { Card, DealerHand, PlayerHand } from "./types";

function cardValue(card: Card): number {
    if (card.rank === "A") {
        return 11;
    }

    if (["J", "Q", "K"].includes(card.rank)) {
        return 10;
    }

    return parseInt(card.rank);
}

export function getHandValue(hand: PlayerHand | DealerHand): number {
    let total = 0;
    let aces = 0;

    for (const card of hand.cards) {
        total += cardValue(card);
        if (card.rank === "A") {
            aces++;
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

export function isSoft(hand: PlayerHand | DealerHand): boolean {
    let hardTotal = 0;
    let hasAce = false;

    for (const card of hand.cards) {
        if (card.rank === "A") {
            hardTotal += 1;
            hasAce = true;
        } else {
            hardTotal += cardValue(card);
        }
    }

    return hasAce && hardTotal + 10 <= 21;
}

export function isBlackjack(hand: PlayerHand | DealerHand): boolean {
    if (hand.cards.length !== 2) return false;
    if ("isSplit" in hand && hand.isSplit) return false;

    return getHandValue(hand) === 21;
}

export function isBust(hand: PlayerHand | DealerHand): boolean {
    return getHandValue(hand) > 21;
}