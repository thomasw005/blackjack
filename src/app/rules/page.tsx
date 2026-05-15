import Link from "next/link";

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start gap-4 text-sm">
            <span className="font-medium shrink-0" style={{ color: "var(--text)" }}>{label}</span>
            <span className="text-right" style={{ color: "var(--muted)" }}>{value}</span>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-3 py-6" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>{title}</p>
            {children}
        </section>
    );
}

export default function RulesPage() {
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
                <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>Rules</h1>
                <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
                    Vegas-style blackjack — 6 decks, dealer hits soft 17.
                </p>
                <p className="text-xs px-3 py-2 rounded-lg mb-2" style={{ background: "rgba(62,207,142,0.07)", border: "1px solid rgba(62,207,142,0.2)", color: "var(--muted)" }}>
                    No real money is wagered. WilsonBlackjack uses virtual currency for entertainment only.
                </p>

                <div
                    className="rounded-xl px-6"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    <Section title="The Deck">
                        <Row label="Decks" value="6 decks, reshuffled when ~25% remains" />
                    </Section>

                    <Section title="Card Values">
                        <Row label="2 – 10" value="Face value" />
                        <Row label="J, Q, K" value="10" />
                        <Row label="Ace" value="1 or 11 — whichever is better" />
                    </Section>

                    <Section title="Payouts">
                        <Row label="Win" value="1:1" />
                        <Row label="Blackjack" value="3:2" />
                        <Row label="Insurance" value="2:1" />
                        <Row label="Push" value="Bet returned" />
                        <Row label="Surrender" value="Half bet returned" />
                    </Section>

                    <Section title="Dealer Rules">
                        <Row label="Hits on" value="Soft 17 or less" />
                        <Row label="Stands on" value="Hard 17 or more" />
                        <Row label="Hole card" value="Revealed after player is done" />
                    </Section>

                    <Section title="Player Actions">
                        <Row label="Hit" value="Take another card" />
                        <Row label="Stand" value="Keep your hand" />
                        <Row label="Double Down" value="Double bet, take exactly one more card (first two cards only)" />
                        <Row label="Split" value="Split equal-value cards into two hands (first two cards only)" />
                        <Row label="Surrender" value="Forfeit half your bet — not available on split hands (first two cards only)" />
                        <Row label="Insurance" value="Side bet up to half your original bet when dealer shows an Ace" />
                    </Section>

                    <Section title="Blackjack">
                        <Row label="What it is" value="Ace + any 10-value card on your first two cards" />
                        <Row label="Payout" value="3:2 — unless dealer also has blackjack (push)" />
                        <Row label="Split aces" value="Each ace gets one card; blackjack does not apply" />
                    </Section>

                    <Section title="Betting">
                        <Row label="Minimum bet" value="$10" />
                        <Row label="Maximum bet" value="Your full bankroll" />
                        <Row label="Starting bankroll" value="$250 — earn more by watching rewarded ads" />
                    </Section>
                </div>
            </div>
        </main>
    );
}
