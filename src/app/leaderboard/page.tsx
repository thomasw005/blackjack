"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = { username: string; amount: number };

type LeaderboardData = {
    dailyGains: Entry[];
    dailyLosses: Entry[];
    weeklyGains: Entry[];
    weeklyLosses: Entry[];
    monthlyGains: Entry[];
    monthlyLosses: Entry[];
    richest: Entry[];
};

type MainTab = "rich" | "gains" | "losses";
type PeriodTab = "daily" | "weekly" | "monthly";

const MAIN_TABS: { id: MainTab; label: string }[] = [
    { id: "rich", label: "Rich List" },
    { id: "gains", label: "Gains" },
    { id: "losses", label: "Losses" },
];

const PERIOD_TABS: { id: PeriodTab; label: string }[] = [
    { id: "daily", label: "Today" },
    { id: "weekly", label: "This Week" },
    { id: "monthly", label: "This Month" },
];

export default function LeaderboardPage() {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [mainTab, setMainTab] = useState<MainTab>("rich");
    const [periodTab, setPeriodTab] = useState<PeriodTab>("daily");

    useEffect(() => {
        fetch("/api/leaderboard")
            .then((r) => r.json())
            .then((d) => setData(d))
            .catch(() => setLoadError(true));
    }, []);

    const isRich = mainTab === "rich";
    const isLoss = mainTab === "losses";

    function getEntries(): Entry[] {
        if (!data) return [];
        if (isRich) return data.richest;
        const key = `${periodTab}${isLoss ? "Losses" : "Gains"}` as keyof LeaderboardData;
        return data[key] as Entry[];
    }

    const entries = getEntries();

    return (
        <main className="min-h-screen" style={{ background: "var(--bg)" }}>
            <header
                className="sticky top-0 z-10 px-4 py-3 flex justify-between items-center"
                style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
            >
                <span className="text-lg font-bold tracking-tight">
                    <span style={{ color: "var(--brand)" }}>♠</span> WilsonBlackjack
                </span>
                <Link
                    href="/game"
                    className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:brightness-75"
                    style={{ background: "var(--brand)", color: "#0f0f0f" }}
                >
                    Play
                </Link>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>Leaderboard</h1>
                <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
                    Top players by bankroll, biggest gains, and biggest losses.
                </p>

                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    {/* Main tabs */}
                    <div className="flex gap-2 px-6 pt-5 pb-3">
                        {MAIN_TABS.map(({ id, label }) => {
                            const active = mainTab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setMainTab(id)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                    style={{
                                        background: active ? "var(--brand)" : "transparent",
                                        color: active ? "#0f0f0f" : "var(--muted)",
                                        border: "1px solid",
                                        borderColor: active ? "var(--brand)" : "var(--border)",
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Period sub-tabs */}
                    <div
                        className="flex px-6 gap-1 overflow-hidden"
                        style={{
                            height: isRich ? 0 : undefined,
                            paddingTop: isRich ? 0 : "0.25rem",
                            paddingBottom: isRich ? 0 : "0.75rem",
                        }}
                    >
                        {PERIOD_TABS.map(({ id, label }) => {
                            const active = periodTab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setPeriodTab(id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                        background: active ? "rgba(255,255,255,0.08)" : "transparent",
                                        color: active ? "var(--text)" : "var(--muted)",
                                        border: "1px solid",
                                        borderColor: active ? "var(--border)" : "transparent",
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid var(--border)" }} />

                    {/* Entries */}
                    <div className="px-6 py-4 flex flex-col gap-2">
                        {loadError ? (
                            <p className="text-sm text-center py-8" style={{ color: "#f87171" }}>Failed to load.</p>
                        ) : !data ? (
                            <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Loading…</p>
                        ) : entries.length === 0 ? (
                            <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>No data yet.</p>
                        ) : (
                            entries.map((entry, i) => {
                                const amountColor = isLoss ? "#f87171" : "var(--brand)";
                                const amountText = isRich
                                    ? `$${entry.amount.toLocaleString()}`
                                    : isLoss
                                    ? `-$${Math.abs(entry.amount).toLocaleString()}`
                                    : `+$${entry.amount.toLocaleString()}`;
                                return (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between px-4 py-3 rounded-lg"
                                        style={{
                                            background: i === 0 ? "rgba(62,207,142,0.06)" : "rgba(255,255,255,0.02)",
                                            border: `1px solid ${i === 0 ? "var(--brand)" : "var(--border)"}`,
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="text-xs font-bold w-5 text-center"
                                                style={{ color: i === 0 ? "var(--brand)" : "var(--muted)" }}
                                            >
                                                #{i + 1}
                                            </span>
                                            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                                                {entry.username}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: amountColor }}>
                                            {amountText}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
