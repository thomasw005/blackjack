export type Rank =
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";

export type Suit =
    | "hearts"
    | "diamonds"
    | "clubs"
    | "spades";

export interface Card {
    suit: Suit;
    rank: Rank;
}

export interface PlayerHand {
    cards: Card[];
    bet: number;
    doubled: boolean;
    isSplit: boolean;
    isComplete: boolean;
    result: "win" | "lose" | "push" | "blackjack" | "surrender" | null;
}

export interface DealerHand {
    cards: Card[];
    holeCardRevealed: boolean;
}

export interface GameState {
    playerHands: PlayerHand[];
    dealerHand: DealerHand;
    activeHandIndex: number;
    phase: "betting" | "insurance" | "player-turn" | "dealer-turn" | "settled";
    bankroll: number;
    currentBet: number;
    insuranceOffered: boolean;
    insuranceBet: number;
}

export type ActionType =
    | "hit"
    | "stand"
    | "double"
    | "split"
    | "surrender"
    | "insurance";

export interface Recommendation {
    action: ActionType;
    reason: string;
}

export interface Ruleset {
    numDecks: number;
    dealerHitsS17: boolean;
    blackjackPayout: number;
    insurancePayout: number;
    allowSplit: boolean;
    allowSurrender: boolean;
    allowDouble: boolean;
}