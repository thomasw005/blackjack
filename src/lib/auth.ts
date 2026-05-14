"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "./supabase/server";

export async function signUp(
    email: string,
    password: string,
    username: string
): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, full_name: username } },
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

export async function deleteUser(): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in" };

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: error.message };
    redirect("/signup");
}
