"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth";
import AccountModal from "@/components/AccountModal";
import RulesModal from "@/components/RulesModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import { GameState, Card } from "@/engine/types";
import { getHandValue, isSoft } from "@/engine/hand";
import { getRecommendation } from "@/engine/recommendation";
import { canDouble, canSplit, canSurrender } from "@/engine/rules";
import { MIN_BET } from "@/engine/constants";

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

function CardView({ card, compact }: { card: Card; compact?: boolean }) {
    const isRed = card.suit === "hearts" || card.suit === "diamonds";
    const color = isRed ? "text-red-600" : "text-gray-900";
    return (
        <div
            className={`${compact ? "w-12 h-16" : "w-14 h-20 sm:w-20 sm:h-28"} rounded-lg ${compact ? "p-1" : "p-1.5 sm:p-2"} shadow-lg select-none relative`}
            style={{ background: "#fafafa", border: "1px solid #e0e0e0" }}
        >
            <div className={`flex justify-between items-start ${color}`}>
                <span className={`${compact ? "text-xs" : "text-sm sm:text-lg"} font-bold leading-none`}>{card.rank}</span>
                <span className={`${compact ? "text-xs" : "text-sm sm:text-lg"} leading-none`}>{SUIT_SYMBOL[card.suit]}</span>
            </div>
            <div className={`absolute inset-0 flex items-center justify-center ${color}`}>
                <span className={`${compact ? "text-2xl" : "text-4xl sm:text-6xl"} leading-none`}>{SUIT_SYMBOL[card.suit]}</span>
            </div>
        </div>
    );
}

function HiddenCard() {
    return (
        <div
            className="w-14 h-20 sm:w-20 sm:h-28 rounded-lg flex items-center justify-center shadow-lg select-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
            <span className="text-3xl sm:text-4xl" style={{ color: "var(--muted)" }}>?</span>
        </div>
    );
}

const btnBase =
    "px-4 py-2.5 sm:px-6 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation";
const btnBrand = `${btnBase} hover:brightness-75`;
const btnOutline = `${btnBase} hover:bg-white/10`;

export default function GamePage() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [bankroll, setBankroll] = useState<number | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<"account" | "rules" | "leaderboard" | null>(null);
    const [bet, setBet] = useState(MIN_BET);
    const [betInput, setBetInput] = useState(String(MIN_BET));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const msg = hash.get("message");
        if (msg) {
            window.history.replaceState(null, "", window.location.pathname);
            window.location.replace(`/email-changed?message=${encodeURIComponent(msg)}`);
        }
    }, []);

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
    const recommendation = gameState ? getRecommendation(gameState) : null;

    return (
        <main
            className="h-screen overflow-hidden flex flex-col p-3 gap-2 sm:p-4 sm:gap-3 max-w-3xl mx-auto w-full"
            style={{ background: "var(--bg)", height: "100dvh" }}
        >
            {/* Header */}
            <header
                className="flex justify-between items-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shrink-0"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold tracking-tight">
                        <span style={{ color: "var(--brand)" }}>♠</span> WilsonBlackjack
                    </span>
                    {bankroll !== null && (
                        <span className="text-sm font-semibold">
                            <span style={{ color: "var(--muted)" }}>$</span><span style={{ color: "var(--brand)" }}>{bankroll}</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setActiveModal("rules")}
                            className="text-sm font-medium px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/10"
                            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                            Rules
                        </button>
                        <button
                            onClick={() => setActiveModal("leaderboard")}
                            className="text-sm font-medium px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/10"
                            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                            Leaderboard
                        </button>
                        {username && (
                            <button
                                onClick={() => setActiveModal("account")}
                                className="text-sm font-medium px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/10 max-w-[100px] truncate sm:max-w-none"
                                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                            >
                                {username}
                            </button>
                        )}
                        <form action={signOut}>
                            <button
                                className="text-sm font-medium px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/10"
                                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
            </header>

            {/* Error */}
            {error && (
                <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-4 py-2">
                    {error}
                </p>
            )}

            {/* Table — always visible, controls live inside so size never changes */}
            <div
                className="flex-1 min-h-0 rounded-xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
                {/* Cards area */}
                <div className="flex-1 min-h-0 flex flex-col gap-4 sm:gap-6">
                    {/* Dealer */}
                    <section className="flex flex-col gap-4 items-center">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                            Dealer
                        </p>
                        {gameState ? (
                            <>
                                <div className="flex gap-3 flex-wrap justify-center">
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
                            </>
                        ) : (
                            <div className="h-8" />
                        )}
                    </section>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid var(--border)" }} />

                    {/* Player hands */}
                    <section className="flex flex-col gap-3 items-center w-full">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                            Your hand
                        </p>
                        {gameState ? (() => {
                            const isSplit = gameState.playerHands.length > 1;
                            const resultColors: Record<string, string> = {
                                win: "var(--brand)", blackjack: "var(--brand)",
                                push: "#60a5fa", lose: "#f87171", surrender: "#f87171",
                            };
                            const resultLabel: Record<string, string> = {
                                win: "Win", lose: "Lose", push: "Push",
                                blackjack: "Blackjack!", surrender: "Surrender",
                            };
                            return (
                                <div className={`flex w-full gap-3 ${isSplit ? "flex-row items-stretch" : "flex-col"}`}>
                                    {gameState.playerHands.map((hand, i) => {
                                        const isActive = i === gameState.activeHandIndex && phase === "player-turn";
                                        return (
                                            <div
                                                key={i}
                                                className="flex flex-col gap-2 p-3 rounded-lg items-center"
                                                style={{
                                                    flex: isSplit ? "1 1 0" : undefined,
                                                    border: isActive ? "2px solid var(--brand)" : "1px solid var(--border)",
                                                    background: isActive ? "rgba(62,207,142,0.06)" : "transparent",
                                                }}
                                            >
                                                {isSplit && (
                                                    <span
                                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                        style={{
                                                            background: isActive ? "var(--brand)" : "var(--border)",
                                                            color: isActive ? "#0f0f0f" : "var(--muted)",
                                                        }}
                                                    >
                                                        {isActive ? "Your turn" : `Hand ${i + 1}`}
                                                    </span>
                                                )}
                                                <p className="text-xs" style={{ color: "var(--muted)" }}>
                                                    {!isSplit && "Bet: "}
                                                    <span style={{ color: "var(--text)" }}>${hand.bet}</span>
                                                    {hand.result && (
                                                        <span className="ml-2 font-bold" style={{ color: resultColors[hand.result] ?? "var(--text)" }}>
                                                            {resultLabel[hand.result] ?? hand.result}
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="flex gap-2 flex-wrap justify-center">
                                                    {hand.cards.map((card, j) => (
                                                        <CardView key={j} card={card} compact={isSplit} />
                                                    ))}
                                                </div>
                                                {hand.cards.length > 0 && (
                                                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                                                        Count: <span style={{ color: "var(--text)" }}>{handTotal(hand.cards)}</span>
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
                            <div className="w-full h-8 rounded-lg" style={{ border: "1px dashed var(--border)" }} />
                        )}
                    </section>
                </div>

                {/* Controls — always two rows so height never changes */}
                <div className="flex flex-col gap-4 sm:gap-6 shrink-0">
                    {/* Row 1: action buttons — all states use same-height buttons */}
                    <div className="flex gap-2 sm:gap-3 flex-wrap justify-center items-center">
                        {phase === "insurance" && (
                            <>
                                <button onClick={() => takeAction("insurance")} disabled={loading} className={btnBrand} style={{ background: "var(--brand)", color: "#0f0f0f" }}>Take Insurance</button>
                                <button onClick={() => takeAction("decline-insurance")} disabled={loading} className={btnOutline} style={{ border: "1px solid var(--border)", color: "var(--text)" }}>Decline</button>
                                {recommendation && (
                                    <>
                                        <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
                                        <button onClick={() => setShowHint((h) => !h)} className="w-28 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/10 text-center" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                                            {showHint ? "Hide Hint" : "Show Hint"}
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        {phase === "player-turn" && (
                            <>
                                <button onClick={() => takeAction("hit")} disabled={loading} className={btnBrand} style={{ background: "var(--brand)", color: "#0f0f0f" }}>Hit</button>
                                <button onClick={() => takeAction("stand")} disabled={loading} className={btnOutline} style={{ border: "1px solid var(--border)", color: "var(--text)" }}>Stand</button>
                                <button onClick={() => takeAction("double")} disabled={loading || !canDouble(gameState!)} className={btnOutline} style={{ border: "1px solid var(--border)", color: "var(--text)" }}>Double</button>
                                <button onClick={() => takeAction("split")} disabled={loading || !canSplit(gameState!)} className={btnOutline} style={{ border: "1px solid var(--border)", color: "var(--text)" }}>Split</button>
                                <button onClick={() => takeAction("surrender")} disabled={loading || !canSurrender(gameState!)} className={btnOutline} style={{ border: "1px solid #f87171", color: "#f87171" }}>Surrender</button>
                                {recommendation && (
                                    <>
                                        <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
                                        <button onClick={() => setShowHint((h) => !h)} className="w-28 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/10 text-center" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                                            {showHint ? "Hide Hint" : "Show Hint"}
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        {isSettled && (
                            <button onClick={nextRound} className={btnBrand} style={{ background: "var(--brand)", color: "#0f0f0f" }}>Next Round</button>
                        )}
                        {!gameState && (
                            <>
                                <div className="flex items-center rounded-lg overflow-hidden text-sm" style={{ background: "#262626", border: "1px solid var(--border)" }}>
                                    <span className="pl-3 pr-1 font-medium select-none" style={{ color: "var(--muted)" }}>$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={betInput}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");
                                            setBetInput(raw);
                                            if (raw) setBet(Number(raw));
                                        }}
                                        onBlur={() => {
                                            const n = Math.max(MIN_BET, Number(betInput) || MIN_BET);
                                            setBetInput(String(n));
                                            setBet(n);
                                        }}
                                        className="w-16 pr-3 py-2 outline-none bg-transparent"
                                        style={{ color: "var(--text)" }}
                                    />
                                </div>
                                <button onClick={startGame} disabled={loading} className={btnBrand} style={{ background: "var(--brand)", color: "#0f0f0f" }}>
                                    {loading ? "Dealing…" : "Deal"}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Row 2: hint — always rendered to keep height constant */}
                    <div className={`flex items-center gap-3 justify-center rounded-lg px-4 py-2 text-sm transition-opacity ${showHint && recommendation ? "opacity-100" : "opacity-0"}`} style={{ border: "1px solid var(--border)" }}>
                        <span className="font-bold uppercase tracking-wide" style={{ color: "var(--brand)" }}>{recommendation?.action}</span>
                        <span style={{ color: "var(--muted)" }}>{recommendation?.reason}</span>
                    </div>
                </div>
            </div>

            {activeModal === "account" && username && email && (
                <AccountModal
                    initialUsername={username}
                    initialEmail={email}
                    onClose={() => setActiveModal(null)}
                    onUsernameChange={(u) => setUsername(u)}
                />
            )}
            {activeModal === "rules" && (
                <RulesModal onClose={() => setActiveModal(null)} />
            )}
            {activeModal === "leaderboard" && (
                <LeaderboardModal onClose={() => setActiveModal(null)} />
            )}
        </main>
    );
}
