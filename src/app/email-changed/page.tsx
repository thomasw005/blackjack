"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EmailChangedPage() {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setMessage(params.get("message"));
    }, []);

    const needsBothConfirmed = message?.toLowerCase().includes("other email");

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <span className="text-3xl font-bold tracking-tight">
                        <span style={{ color: "var(--brand)" }}>♠</span> WilsonBlackjack
                    </span>
                </div>

                <div
                    className="rounded-xl p-8 flex flex-col gap-4 text-center"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    <div className="text-4xl">✓</div>
                    <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                        Email address confirmed
                    </h1>
                    {needsBothConfirmed ? (
                        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                            This address has been verified. Check your{" "}
                            <span style={{ color: "var(--text)" }}>other inbox</span> for a second
                            confirmation link — both addresses must be confirmed before the change takes effect.
                        </p>
                    ) : (
                        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                            Your email address has been updated successfully.
                        </p>
                    )}
                    <Link
                        href="/game"
                        className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-75 inline-block"
                        style={{ background: "var(--brand)", color: "#0f0f0f" }}
                    >
                        Back to game
                    </Link>
                </div>
            </div>
        </main>
    );
}
