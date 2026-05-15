"use client";

interface Props {
    onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start gap-4 text-sm">
            <span className="font-medium shrink-0" style={{ color: "var(--text)" }}>{label}</span>
            <span className="text-right" style={{ color: "var(--muted)" }}>{value}</span>
        </div>
    );
}

export default function RulesModal({ onClose }: Props) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl flex flex-col max-h-[90vh] overflow-y-auto"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex justify-between items-center px-6 py-4 sticky top-0 z-10"
                    style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
                >
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Rules</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all hover:bg-white/10"
                        style={{ color: "var(--muted)" }}
                    >
                        ✕
                    </button>
                </div>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>The Deck</p>
                    <Row label="Decks" value="6 decks, reshuffled when ~25% remains" />
                </section>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Card Values</p>
                    <Row label="2 – 10" value="Face value" />
                    <Row label="J, Q, K" value="10" />
                    <Row label="Ace" value="1 or 11 — whichever is better" />
                </section>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Payouts</p>
                    <Row label="Win" value="1:1" />
                    <Row label="Blackjack" value="3:2" />
                    <Row label="Insurance" value="2:1" />
                    <Row label="Push" value="Bet returned" />
                    <Row label="Surrender" value="Half bet returned" />
                </section>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Dealer Rules</p>
                    <Row label="Hits on" value="Soft 17 or less" />
                    <Row label="Stands on" value="Hard 17 or more" />
                    <Row label="Hole card" value="Revealed after player is done" />
                </section>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Player Actions</p>
                    <Row label="Hit" value="Take another card" />
                    <Row label="Stand" value="Keep your hand" />
                    <Row label="Double Down" value="Double bet, take exactly one more card (first two cards only)" />
                    <Row label="Split" value="Split equal-value cards into two hands (first two cards only)" />
                    <Row label="Surrender" value="Forfeit half your bet — not available on split hands (first two cards only)" />
                    <Row label="Insurance" value="Side bet up to half your original bet when dealer shows an Ace" />
                </section>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Blackjack</p>
                    <Row label="What it is" value="Ace + any 10-value card on your first two cards" />
                    <Row label="Payout" value="3:2 — unless dealer also has blackjack (push)" />
                    <Row label="Split aces" value="Each ace gets one card; blackjack does not apply" />
                </section>

                <section className="px-6 py-5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Betting</p>
                    <Row label="Minimum bet" value="$10" />
                    <Row label="Maximum bet" value="Your full bankroll" />
                </section>
            </div>
        </div>
    );
}
