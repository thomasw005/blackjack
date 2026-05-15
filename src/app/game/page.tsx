"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth";
import { GameState, Card } from "@/engine/types";
import { getHandValue, isSoft } from "@/engine/hand";

function handTotal(cards: Card[]): string {
    if (cards.length === 0) return "";
    const hand = { cards, holeCardRevealed: true };
    const total = getHandValue(hand);
    if (total > 21) return `Bust (${total})`;
    if (isSoft(hand)) return `${total - 10} or ${total}`;
    return `${total}`;
}


const SUIT_SYMBOL: Record<string, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
};

function CardView({ card }: { card: Card }) {
    const isRed = card.suit === "hearts" || card.suit === "diamonds";
    return (
        <div className="w-12 h-16 bg-white rounded border border-gray-300 flex items-center justify-center shadow font-bold text-lg select-none">
            <span className={isRed ? "text-red-600" : "text-gray-900"}>
                {card.rank}{SUIT_SYMBOL[card.suit]}
            </span>
        </div>
    );
}

function HiddenCard() {
    return (
        <div className="w-12 h-16 bg-green-800 border-2 border-green-600 rounded flex items-center justify-center shadow">
            <span className="text-white font-bold text-xl">?</span>
        </div>
    );
}

const btnBase = "px-5 py-2 rounded font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity";
const btnGreen = `${btnBase} bg-green-600 hover:bg-green-500`;
const btnBlue = `${btnBase} bg-blue-600 hover:bg-blue-500`;
const btnYellow = `${btnBase} bg-yellow-500 hover:bg-yellow-400 text-gray-900`;
const btnPurple = `${btnBase} bg-purple-600 hover:bg-purple-500`;
const btnRed = `${btnBase} bg-red-600 hover:bg-red-500`;
const btnGray = `${btnBase} bg-gray-600 hover:bg-gray-500`;

export default function GamePage() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [bankroll, setBankroll] = useState<number | null>(null);
    const [bet, setBet] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/game/state")
            .then((r) => r.json())
            .then((data) => {
                if (data.balance !== null && data.balance !== undefined) setBankroll(data.balance);
                if (data.gameId && data.state) {
                    setGameId(data.gameId);
                    setGameState(data.state);
                }
            })
            .catch(() => {});
    }, []);

    async function startGame() {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/game/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bet }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error ?? "Failed to start game");
        } else {
            setGameId(data.gameId);
            setGameState(data.state);
            setBankroll(data.state.bankroll);
        }
        setLoading(false);
    }

    async function takeAction(action: string) {
        if (!gameId) return;
        setLoading(true);
        setError(null);
        const res = await fetch("/api/game/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId, action }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error ?? "Action failed");
        } else {
            setGameState(data.state);
            setBankroll(data.state.bankroll);
        }
        setLoading(false);
    }

    function nextRound() {
        setGameId(null);
        setGameState(null);
        setError(null);
    }

    const phase = gameState?.phase ?? null;
    const isSettled = phase === "settled";
    const showBetting = !gameState || isSettled;

    return (
        <main className="min-h-screen bg-green-900 text-white flex flex-col p-6 gap-6">
            {/* Header */}
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-wide">Blackjack</h1>
                <div className="flex items-center gap-6">
                    {bankroll !== null && (
                        <span className="text-lg font-semibold">
                            Bankroll: <span className="text-yellow-300">${bankroll}</span>
                        </span>
                    )}
                    <form action={signOut}>
                        <button className="text-sm text-green-300 underline underline-offset-2">
                            Sign out
                        </button>
                    </form>
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="bg-red-700 text-white px-4 py-2 rounded text-sm">{error}</div>
            )}

            {/* Dealer area */}
            {gameState && (
                <section>
                    <p className="text-green-300 text-sm mb-2 uppercase tracking-wider">
                        Dealer
                        {gameState.dealerHand.cards.length > 0 && (
                            <span className="ml-2 text-white font-semibold">
                                — {handTotal(gameState.dealerHand.cards)}
                                {!gameState.dealerHand.holeCardRevealed && " + ?"}
                            </span>
                        )}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {gameState.dealerHand.cards.map((card, i) => (
                            <CardView key={i} card={card} />
                        ))}
                        {!gameState.dealerHand.holeCardRevealed && <HiddenCard />}
                    </div>
                </section>
            )}

            {/* Player hands */}
            {gameState && (
                <section className="flex flex-col gap-3">
                    {gameState.playerHands.map((hand, i) => {
                        const isActive = i === gameState.activeHandIndex && phase === "player-turn";
                        const resultLabel: Record<string, string> = {
                            win: "WIN",
                            lose: "LOSE",
                            push: "PUSH",
                            blackjack: "BLACKJACK! 🃏",
                            surrender: "SURRENDER",
                        };
                        return (
                            <div
                                key={i}
                                className={`p-3 rounded ${
                                    isActive
                                        ? "border-2 border-yellow-400 bg-green-800/40"
                                        : "border border-green-700"
                                }`}
                            >
                                <p className="text-sm text-green-300 mb-2">
                                    {gameState.playerHands.length > 1 ? `Hand ${i + 1} — ` : ""}
                                    Bet: <span className="text-white">${hand.bet}</span>
                                    <span className="ml-3 text-white font-semibold">{handTotal(hand.cards)}</span>
                                    {hand.result && (
                                        <span
                                            className={`ml-3 font-bold ${
                                                hand.result === "win" || hand.result === "blackjack"
                                                    ? "text-yellow-300"
                                                    : hand.result === "push"
                                                    ? "text-blue-300"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {resultLabel[hand.result] ?? hand.result}
                                        </span>
                                    )}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {hand.cards.map((card, j) => (
                                        <CardView key={j} card={card} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {/* Action buttons */}
            {phase === "insurance" && (
                <div className="flex gap-3 flex-wrap">
                    <button onClick={() => takeAction("insurance")} disabled={loading} className={btnYellow}>
                        Take Insurance
                    </button>
                    <button onClick={() => takeAction("decline-insurance")} disabled={loading} className={btnGray}>
                        Decline
                    </button>
                </div>
            )}

            {phase === "player-turn" && (
                <div className="flex gap-3 flex-wrap">
                    <button onClick={() => takeAction("hit")} disabled={loading} className={btnGreen}>
                        Hit
                    </button>
                    <button onClick={() => takeAction("stand")} disabled={loading} className={btnBlue}>
                        Stand
                    </button>
                    <button onClick={() => takeAction("double")} disabled={loading} className={btnYellow}>
                        Double
                    </button>
                    <button onClick={() => takeAction("split")} disabled={loading} className={btnPurple}>
                        Split
                    </button>
                    <button onClick={() => takeAction("surrender")} disabled={loading} className={btnRed}>
                        Surrender
                    </button>
                </div>
            )}

            {/* Betting / next round */}
            {showBetting && (
                <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-green-300 text-sm">Bet:</label>
                    <input
                        type="number"
                        min={1}
                        max={bankroll ?? undefined}
                        value={bet}
                        onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                        className="w-24 px-3 py-2 rounded text-gray-900 font-semibold"
                    />
                    {isSettled ? (
                        <button onClick={nextRound} className={btnGreen}>
                            Next Round
                        </button>
                    ) : (
                        <button onClick={startGame} disabled={loading} className={btnGreen}>
                            {loading ? "Dealing…" : "Deal"}
                        </button>
                    )}
                </div>
            )}

            {loading && phase && !isSettled && (
                <p className="text-green-300 text-sm animate-pulse">Processing…</p>
            )}
        </main>
    );
}
