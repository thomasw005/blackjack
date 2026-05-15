import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();

    // Join wallets → profiles, aggregate transaction stats per user
    const { data: wallets, error } = await supabase
        .from("wallets")
        .select("balance, user_id, profiles!inner(username)")
        .order("balance", { ascending: false })
        .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = (wallets ?? []).map((w) => w.user_id);

    // Aggregate transaction stats for these users
    const { data: txStats } = await supabase
        .from("transactions")
        .select("user_id, type, amount")
        .in("user_id", userIds);

    const statsMap: Record<string, { wins: number; losses: number; pushes: number; netProfit: number }> = {};
    for (const tx of txStats ?? []) {
        if (!statsMap[tx.user_id]) {
            statsMap[tx.user_id] = { wins: 0, losses: 0, pushes: 0, netProfit: 0 };
        }
        const s = statsMap[tx.user_id];
        if (tx.type === "win" || tx.type === "blackjack") s.wins++;
        else if (tx.type === "lose") s.losses++;
        else if (tx.type === "push") s.pushes++;
        s.netProfit += tx.amount;
    }

    const leaderboard = (wallets ?? []).map((w) => {
        const stats = statsMap[w.user_id] ?? { wins: 0, losses: 0, pushes: 0, netProfit: 0 };
        const totalHands = stats.wins + stats.losses + stats.pushes;
        return {
            username: (w.profiles as unknown as { username: string }).username,
            bankroll: w.balance,
            netProfit: stats.netProfit,
            wins: stats.wins,
            losses: stats.losses,
            pushes: stats.pushes,
            handsPlayed: totalHands,
            winRate: totalHands > 0 ? Math.round((stats.wins / totalHands) * 100) : 0,
        };
    });

    return NextResponse.json({ leaderboard });
}
