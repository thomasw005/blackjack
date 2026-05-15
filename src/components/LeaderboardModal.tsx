"use client";

import { useEffect, useState } from "react";

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

interface Props {
    onClose: () => void;
}

export default function LeaderboardModal({ onClose }: Props) {
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl flex flex-col max-h-[90vh]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Leaderboard</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all hover:bg-white/10"
                        style={{ color: "var(--muted)" }}
                    >
                        ✕
                    </button>
                </div>

                {/* Main tabs */}
                <div className="flex px-6 pt-4 gap-2 shrink-0">
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

                {/* Period sub-tabs — always in DOM so Gains/Losses switching has no layout shift; collapsed when Rich List */}
                <div
                    className="flex px-6 gap-1 shrink-0 overflow-hidden"
                    style={{
                        height: isRich ? 0 : undefined,
                        paddingTop: isRich ? 0 : "0.75rem",
                        paddingBottom: isRich ? 0 : "0.25rem",
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

                {/* Entries */}
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 min-h-0">
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
    );
}
