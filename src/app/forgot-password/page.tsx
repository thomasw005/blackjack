"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        const result = await resetPassword(email);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setSent(true);
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <span className="text-3xl font-bold tracking-tight">
                        <span style={{ color: "var(--brand)" }}>♠</span> WilsonBlackjack
                    </span>
                    <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                        Reset your password
                    </p>
                </div>

                <div
                    className="rounded-xl p-8 flex flex-col gap-5"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    {sent ? (
                        <div className="flex flex-col gap-3 text-center">
                            <div className="text-3xl">✉️</div>
                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                                Check your email
                            </p>
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                                We sent a password reset link to <span style={{ color: "var(--text)" }}>{email}</span>.
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                                Enter your email and we&apos;ll send you a link to reset your password.
                            </p>
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-75 disabled:opacity-50"
                                    style={{ background: "var(--brand)", color: "#0f0f0f" }}
                                >
                                    {loading ? "Sending…" : "Send reset link"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
                    <Link href="/login" className="font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--brand)" }}>
                        Back to sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}
