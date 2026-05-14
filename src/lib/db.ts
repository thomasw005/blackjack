import { createClient } from "./supabase/server";

export async function getProfile(userId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    return data;
}

export async function getWallet(userId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();
    return data;
}
