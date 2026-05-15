"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "./supabase/server";

export async function signUp(
    email: string,
    password: string,
    username: string
): Promise<{ error: string } | void> {
    const admin = createAdminClient();
    const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
    if (existing) return { error: "Username already taken." };

    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username, full_name: username },
            emailRedirectTo: `${siteUrl}/auth/confirm`,
        },
    });
    if (error) return { error: error.message };
    redirect("/check-email");
}

export async function signIn(
    email: string,
    password: string
): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    redirect("/game");
}

export async function signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function getUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function updateUsername(username: string): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in" };

    const admin = createAdminClient();
    const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();

    if (existing) return { error: "Username already taken." };

    const { error } = await admin.from("profiles").update({ username }).eq("id", user.id);
    if (error) return { error: error.message };

    await supabase.auth.updateUser({ data: { username, full_name: username } });
}

export async function updateEmail(email: string): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${siteUrl}/email-changed` }
    );
    if (error) return { error: error.message };
}

export async function resetPassword(email: string): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/confirm?next=/update-password`,
    });
    if (error) return { error: error.message };
}

export async function updatePassword(newPassword: string, currentPassword?: string): Promise<{ error: string } | void> {
    const supabase = await createClient();

    if (currentPassword) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return { error: "Not logged in" };
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
        });
        if (authError) return { error: "Current password is incorrect." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
}

export async function deleteUser(): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in" };

    const admin = createAdminClient();

    const { data: games } = await admin.from("games").select("id").eq("user_id", user.id);
    const gameIds = (games ?? []).map((g: { id: string }) => g.id);

    if (gameIds.length > 0) {
        await admin.from("hands").delete().in("game_id", gameIds);
    }

    await Promise.all([
        admin.from("transactions").delete().eq("user_id", user.id),
        admin.from("games").delete().eq("user_id", user.id),
    ]);

    await Promise.all([
        admin.from("wallets").delete().eq("user_id", user.id),
        admin.from("profiles").delete().eq("id", user.id),
    ]);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: error.message };
    redirect("/signup");
}
