"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setError("");
        setLoading(true);
        const result = await updatePassword(password);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push("/game");
        }
    }

    const inputStyle = {
        background: "#262626",
        border: "1px solid var(--border)",
        color: "var(--text)",
    };

    function focusBrand(e: React.FocusEvent<HTMLInputElement>) {
        e.currentTarget.style.borderColor = "var(--brand)";
    }
    function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
        e.currentTarget.style.borderColor = "var(--border)";
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <span className="text-3xl font-bold tracking-tight">
                        <span style={{ color: "var(--brand)" }}>♠</span> Blackjack
                    </span>
                    <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                        Choose a new password
                    </p>
                </div>

                <div
                    className="rounded-xl p-8 flex flex-col gap-5"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    {error && (
                        <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                New password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                style={inputStyle}
                                onFocus={focusBrand}
                                onBlur={blurBorder}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="confirm" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                Confirm password
                            </label>
                            <input
                                id="confirm"
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                minLength={6}
                                className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                style={inputStyle}
                                onFocus={focusBrand}
                                onBlur={blurBorder}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-75 disabled:opacity-50"
                            style={{ background: "var(--brand)", color: "#0f0f0f" }}
                        >
                            {loading ? "Updating…" : "Update password"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
