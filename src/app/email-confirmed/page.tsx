import Link from "next/link";

export default function EmailConfirmedPage() {
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
                        Email confirmed
                    </h1>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                        Your account is ready. Sign in to start playing.
                    </p>
                    <Link
                        href="/login"
                        className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-75 inline-block"
                        style={{ background: "var(--brand)", color: "#0f0f0f" }}
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </main>
    );
}
