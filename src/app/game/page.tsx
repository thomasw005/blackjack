"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth";
import AccountModal from "@/components/AccountModal";
import { GameState, Card } from "@/engine/types";
import { getHandValue, isSoft } from "@/engine/hand";
import { getRecommendation } from "@/engine/recommendation";

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
        <div
            className="w-14 h-20 rounded-lg flex flex-col justify-between p-2 shadow-lg select-none"
            style={{ background: "#fafafa", border: "1px solid #e0e0e0" }}
        >
            <span className={`text-sm font-bold leading-none ${isRed ? "text-red-600" : "text-gray-900"}`}>
                {card.rank}
                <br />
                {SUIT_SYMBOL[card.suit]}
            </span>
            <span className={`text-sm font-bold leading-none self-end rotate-180 ${isRed ? "text-red-600" : "text-gray-900"}`}>
                {card.rank}
                <br />
                {SUIT_SYMBOL[card.suit]}
            </span>
        </div>
    );
}

function HiddenCard() {
    return (
        <div
            className="w-14 h-20 rounded-lg flex items-center justify-center shadow-lg select-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
            <span className="text-2xl" style={{ color: "var(--muted)" }}>?</span>
        </div>
    );
}

const btnBase =
    "px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed";
const btnBrand = `${btnBase} hover:brightness-75`;
const btnOutline = `${btnBase} hover:bg-white/10`;

export default function GamePage() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [bankroll, setBankroll] = useState<number | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [showAccount, setShowAccount] = useState(false);
    const [bet, setBet] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        fetch("/api/game/state")
            .then((r) => r.json())
            .then((data) => {
                if (data.balance !== null && data.balance !== undefined) setBankroll(data.balance);
                if (data.username) setUsername(data.username);
                if (data.email) setEmail(data.email);
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
        setShowHint(false);
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
    const recommendation = gameState ? getRecommendation(gameState) : null;

    return (
        <main
            className="min-h-screen flex flex-col p-6 gap-6"
            style={{ background: "var(--bg)" }}
        >
            {/* Header */}
            <header
                className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
                <span className="text-lg font-bold tracking-tight">
                    <span style={{ color: "var(--brand)" }}>♠</span> Blackjack
                </span>
                <div className="flex items-center gap-5">
                    {bankroll !== null && (
                        <span className="text-sm font-semibold">
                            Bankroll:{" "}
                            <span style={{ color: "var(--brand)" }}>${bankroll}</span>
                        </span>
                    )}
                    <div className="flex items-center gap-3">
                        {username && (
                            <button
                                onClick={() => setShowAccount(true)}
                                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/10"
                                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                            >
                                {username}
                            </button>
                        )}
                        <form action={signOut}>
                            <button
                                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/10"
                                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Error */}
            {error && (
                <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-4 py-2">
                    {error}
                </p>
            )}

            {/* Table */}
            {gameState && (
                <div
                    className="flex-1 rounded-xl p-6 flex flex-col gap-8"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    {/* Dealer */}
                    <section className="flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                            Dealer
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {gameState.dealerHand.cards.map((card, i) => (
                                <CardView key={i} card={card} />
                            ))}
                            {!gameState.dealerHand.holeCardRevealed && <HiddenCard />}
                        </div>
                        {gameState.dealerHand.cards.length > 0 && (
                            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                                Count:{" "}
                                <span style={{ color: "var(--text)" }}>
                                    {handTotal(gameState.dealerHand.cards)}
                                    {!gameState.dealerHand.holeCardRevealed && " + ?"}
                                </span>
                            </p>
                        )}
                    </section>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid var(--border)" }} />

                    {/* Player hands */}
                    <section className="flex flex-col gap-4">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                            Your hand
                        </p>
                        {gameState.playerHands.map((hand, i) => {
                            const isActive = i === gameState.activeHandIndex && phase === "player-turn";
                            const resultColors: Record<string, string> = {
                                win: "var(--brand)",
                                blackjack: "var(--brand)",
                                push: "#60a5fa",
                                lose: "#f87171",
                                surrender: "#f87171",
                            };
                            const resultLabel: Record<string, string> = {
                                win: "Win",
                                lose: "Lose",
                                push: "Push",
                                blackjack: "Blackjack!",
                                surrender: "Surrender",
                            };
                            return (
                                <div
                                    key={i}
                                    className="flex flex-col gap-3 p-4 rounded-lg"
                                    style={{
                                        border: isActive
                                            ? "1px solid var(--brand)"
                                            : "1px solid var(--border)",
                                        background: isActive ? "rgba(62,207,142,0.05)" : "transparent",
                                    }}
                                >
                                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                                        {gameState.playerHands.length > 1 ? `Hand ${i + 1} — ` : ""}
                                        Bet:{" "}
                                        <span style={{ color: "var(--text)" }}>${hand.bet}</span>
                                        {hand.result && (
                                            <span
                                                className="ml-3 font-bold"
                                                style={{ color: resultColors[hand.result] ?? "var(--text)" }}
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
                                    {hand.cards.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                                            Count:{" "}
                                            <span style={{ color: "var(--text)" }}>{handTotal(hand.cards)}</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                </div>
            )}

            {/* Action buttons */}
            {phase === "insurance" && (
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => takeAction("insurance")}
                        disabled={loading}
                        className={btnBrand}
                        style={{ background: "var(--brand)", color: "#0f0f0f" }}
                    >
                        Take Insurance
                    </button>
                    <button
                        onClick={() => takeAction("decline-insurance")}
                        disabled={loading}
                        className={btnOutline}
                        style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                        Decline
                    </button>
                </div>
            )}

            {phase === "player-turn" && (
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => takeAction("hit")}
                        disabled={loading}
                        className={btnBrand}
                        style={{ background: "var(--brand)", color: "#0f0f0f" }}
                    >
                        Hit
                    </button>
                    <button
                        onClick={() => takeAction("stand")}
                        disabled={loading}
                        className={btnOutline}
                        style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                        Stand
                    </button>
                    <button
                        onClick={() => takeAction("double")}
                        disabled={loading}
                        className={btnOutline}
                        style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                        Double
                    </button>
                    <button
                        onClick={() => takeAction("split")}
                        disabled={loading}
                        className={btnOutline}
                        style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                        Split
                    </button>
                    <button
                        onClick={() => takeAction("surrender")}
                        disabled={loading}
                        className={btnOutline}
                        style={{ border: "1px solid #f87171", color: "#f87171" }}
                    >
                        Surrender
                    </button>
                </div>
            )}

            {/* Hint */}
            {recommendation && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowHint((h) => !h)}
                        className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/10"
                        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                    >
                        {showHint ? "Hide hint" : "Show hint"}
                    </button>
                    <div
                        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-opacity ${showHint ? "opacity-100" : "invisible opacity-0"}`}
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                        <span className="font-bold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
                            {recommendation.action}
                        </span>
                        <span style={{ color: "var(--muted)" }}>{recommendation.reason}</span>
                    </div>
                </div>
            )}

            {/* Betting / next round */}
            {showBetting && (
                <div
                    className="flex items-center gap-4 flex-wrap p-4 rounded-xl"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                        Bet
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={bankroll ?? undefined}
                        value={bet}
                        onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                        className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                            background: "#262626",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                        }}
                    />
                    {isSettled ? (
                        <button
                            onClick={nextRound}
                            className={btnBrand}
                            style={{ background: "var(--brand)", color: "#0f0f0f" }}
                        >
                            Next Round
                        </button>
                    ) : (
                        <button
                            onClick={startGame}
                            disabled={loading}
                            className={btnBrand}
                            style={{ background: "var(--brand)", color: "#0f0f0f" }}
                        >
                            {loading ? "Dealing…" : "Deal"}
                        </button>
                    )}
                </div>
            )}

            {loading && phase && !isSettled && (
                <p className="text-sm animate-pulse" style={{ color: "var(--muted)" }}>
                    Processing…
                </p>
            )}

            {showAccount && username && email && (
                <AccountModal
                    initialUsername={username}
                    initialEmail={email}
                    onClose={() => setShowAccount(false)}
                    onUsernameChange={(u) => setUsername(u)}
                />
            )}
        </main>
    );
}
