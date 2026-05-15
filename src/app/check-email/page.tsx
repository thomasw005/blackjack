export default function CheckEmailPage() {
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
                    <div className="text-4xl">✉️</div>
                    <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                        Check your email
                    </h1>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                        We sent you a confirmation link. Click it to activate your account, then log in.
                    </p>
                </div>
            </div>
        </main>
    );
}
