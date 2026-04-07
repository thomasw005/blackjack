import { Rules } from "./types";

export const RULES: Rules = {
    numDecks: 6,
    dealerHitsS17: true,
    blackjackPayout: 1.5,
    insurancePayout: 2,
    allowSplit: true,
    allowSurrender: true,
    allowDouble: true,
    reshufflePercent: 0.25
};

export const SUITS = [
    "hearts",
    "diamonds",
    "clubs",
    "spades"] as const;

export const RANKS = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9", 
    "10",
    "J",
    "Q",
    "K"] as const;