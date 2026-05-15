import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Entry = { username: string; amount: number };

async function getPeriodLeaderboard(since: Date): Promise<{ gains: Entry[]; losses: Entry[] }> {
    const admin = createAdminClient();
    const { data: txns } = await admin
        .from("transactions")
        .select("user_id, amount")
        .gte("created_at", since.toISOString());

    if (!txns || txns.length === 0) return { gains: [], losses: [] };

    const byUser: Record<string, number> = {};
    for (const t of txns) {
        byUser[t.user_id] = (byUser[t.user_id] ?? 0) + t.amount;
    }

    const userIds = Object.keys(byUser);
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", userIds);

    const usernameMap: Record<string, string> = {};
    for (const p of profiles ?? []) usernameMap[p.id] = p.username;

    const entries: Entry[] = userIds.map((uid) => ({
        username: usernameMap[uid] ?? "Unknown",
        amount: byUser[uid],
    }));

    const gains = entries.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 10);
    const losses = entries.filter((e) => e.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 10);

    return { gains, losses };
}

export async function GET() {
    const admin = createAdminClient();
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [daily, weekly, monthly, walletsResult] = await Promise.all([
        getPeriodLeaderboard(day),
        getPeriodLeaderboard(week),
        getPeriodLeaderboard(month),
        admin.from("wallets").select("user_id, balance").order("balance", { ascending: false }).limit(10),
    ]);

    let richest: Entry[] = [];
    const wallets = walletsResult.data ?? [];
    if (wallets.length > 0) {
        const richIds = wallets.map((w) => w.user_id);
        const { data: richProfiles } = await admin.from("profiles").select("id, username").in("id", richIds);
        const richMap: Record<string, string> = {};
        for (const p of richProfiles ?? []) richMap[p.id] = p.username;
        richest = wallets.map((w) => ({ username: richMap[w.user_id] ?? "Unknown", amount: w.balance }));
    }

    return NextResponse.json({
        dailyGains: daily.gains,
        dailyLosses: daily.losses,
        weeklyGains: weekly.gains,
        weeklyLosses: weekly.losses,
        monthlyGains: monthly.gains,
        monthlyLosses: monthly.losses,
        richest,
    });
}
