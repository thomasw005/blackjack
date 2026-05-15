"use client";

import { useEffect, useState } from "react";

declare global {
    interface Window {
        adBreak?: (params: Record<string, unknown>) => void;
    }
}

type State = "loading" | "playing" | "earned" | "dismissed" | "unavailable" | "claiming";

interface Props {
    onClose: () => void;
    onRewarded: (newBalance: number) => void;
}

export default function AdOverlay({ onClose, onRewarded }: Props) {
    const [state, setState] = useState<State>("loading");
    const [claimError, setClaimError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window.adBreak !== "function") {
            setState("unavailable");
            return;
        }

        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) setState("unavailable");
        }, 6000);

        window.adBreak({
            type: "reward",
            name: "watchAdForChips",
            beforeReward: (showAdFn: unknown) => {
                resolved = true;
                clearTimeout(timeout);
                setState("playing");
                (showAdFn as () => void)();
            },
            adDismissed: () => setState("dismissed"),
            adViewed: () => setState("earned"),
        });

        return () => clearTimeout(timeout);
    }, []);

    async function claim() {
        setState("claiming");
        setClaimError(null);
        const res = await fetch("/api/reward", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
            setClaimError(data.error ?? "Something went wrong.");
            setState("earned");
        } else {
            onRewarded(data.balance);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}
        >
            <div
                className="w-full max-w-sm rounded-xl flex flex-col overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                        {state === "earned" ? "Ad complete" : state === "dismissed" ? "Ad skipped" : state === "unavailable" ? "No ad available" : "Sponsored"}
                    </p>
                    {(state === "earned" || state === "dismissed" || state === "unavailable") && (
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all hover:bg-white/10"
                            style={{ color: "var(--muted)" }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="flex flex-col items-center justify-center gap-3 px-5 py-10">
                    {state === "loading" && (
                        <>
                            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
                            <p className="text-sm" style={{ color: "var(--muted)" }}>Loading ad…</p>
                        </>
                    )}
                    {state === "playing" && (
                        <>
                            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
                            <p className="text-sm" style={{ color: "var(--muted)" }}>Ad is playing — watch the full ad to earn</p>
                            <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>+$10</p>
                        </>
                    )}
                    {state === "earned" && (
                        <>
                            <span className="text-4xl">🎉</span>
                            <p className="text-base font-semibold" style={{ color: "var(--text)" }}>You earned +$10</p>
                            {claimError && <p className="text-xs" style={{ color: "#f87171" }}>{claimError}</p>}
                        </>
                    )}
                    {state === "claiming" && (
                        <>
                            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
                            <p className="text-sm" style={{ color: "var(--muted)" }}>Crediting your account…</p>
                        </>
                    )}
                    {state === "dismissed" && (
                        <>
                            <span className="text-4xl">😞</span>
                            <p className="text-sm text-center" style={{ color: "var(--muted)" }}>You skipped the ad — watch the full video to earn +$10.</p>
                        </>
                    )}
                    {state === "unavailable" && (
                        <>
                            <span className="text-4xl">📭</span>
                            <p className="text-sm text-center" style={{ color: "var(--muted)" }}>No ad available right now. Try again in a little while.</p>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                    {state === "earned" && (
                        <button
                            onClick={claim}
                            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:brightness-75"
                            style={{ background: "var(--brand)", color: "#0f0f0f" }}
                        >
                            Claim +$10
                        </button>
                    )}
                    {(state === "dismissed" || state === "unavailable") && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-white/10"
                            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
