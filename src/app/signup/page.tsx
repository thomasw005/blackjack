"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        const result = await signUp(email, password, username);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
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
                {/* Logo */}
                <div className="text-center mb-8">
                    <span className="text-3xl font-bold tracking-tight">
                        <span style={{ color: "var(--brand)" }}>♠</span> WilsonBlackjack
                    </span>
                    <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                        Create your account
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

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4" suppressHydrationWarning>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="username" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                style={inputStyle}
                                onFocus={focusBrand}
                                onBlur={blurBorder}
                            />
                        </div>

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
                                style={inputStyle}
                                onFocus={focusBrand}
                                onBlur={blurBorder}
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
                                style={inputStyle}
                                onFocus={focusBrand}
                                onBlur={blurBorder}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                            style={{ background: "var(--brand)", color: "#0f0f0f" }}
                        >
                            {loading ? "Creating account…" : "Create account"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--brand)" }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}
