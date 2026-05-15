"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("error") === "invalid-link") {
            setError("Confirmation link is invalid or has expired. Try signing up again.");
        }
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        const result = await signIn(email, password);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <span className="text-3xl font-bold tracking-tight">
                        <span style={{ color: "var(--brand)" }}>♠</span> Blackjack
                    </span>
                    <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                        Sign in to your account
                    </p>
                </div>

                {/* Card */}
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
                            <label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                style={{
                                    background: "#262626",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                style={{
                                    background: "#262626",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-xs hover:opacity-80 transition-opacity"
                                style={{ color: "var(--muted)" }}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-75 disabled:opacity-50"
                            style={{ background: "var(--brand)", color: "#0f0f0f" }}
                        >
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-medium transition-colors hover:opacity-80" style={{ color: "var(--brand)" }}>
                        Sign up
                    </Link>
                </p>
            </div>
        </main>
    );
}
