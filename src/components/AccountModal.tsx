"use client";

import { useState } from "react";
import { updateUsername, updateEmail, updatePassword, deleteUser, signOut } from "@/lib/auth";

interface Props {
    initialUsername: string;
    initialEmail: string;
    onClose: () => void;
    onUsernameChange: (u: string) => void;
}

type Msg = { ok: boolean; text: string } | null;

const inputCls = "rounded-lg px-3 py-2 text-sm outline-none transition-all";
const inputStyle = { background: "#262626", border: "1px solid var(--border)", color: "var(--text)" };
const focusBrand = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "var(--brand)");
const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "var(--border)");

const saveBtnCls = "px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-75 disabled:opacity-40 shrink-0";
const saveBtnStyle = { background: "var(--brand)", color: "#0f0f0f" };

function StatusLine({ msg }: { msg: Msg }) {
    if (!msg) return null;
    return <p className="text-xs" style={{ color: msg.ok ? "var(--brand)" : "#f87171" }}>{msg.text}</p>;
}

export default function AccountModal({ initialUsername, initialEmail, onClose, onUsernameChange }: Props) {
    const [username, setUsername] = useState(initialUsername);
    const [usernameSaving, setUsernameSaving] = useState(false);
    const [usernameMsg, setUsernameMsg] = useState<Msg>(null);

    const [email, setEmail] = useState(initialEmail);
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailMsg, setEmailMsg] = useState<Msg>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<Msg>(null);

    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteErr, setDeleteErr] = useState<string | null>(null);

    async function handleUpdateUsername() {
        setUsernameSaving(true);
        setUsernameMsg(null);
        const result = await updateUsername(username.trim());
        if (result?.error) {
            setUsernameMsg({ ok: false, text: result.error });
        } else {
            setUsernameMsg({ ok: true, text: "Username updated." });
            onUsernameChange(username.trim());
        }
        setUsernameSaving(false);
    }

    async function handleUpdateEmail() {
        setEmailSaving(true);
        setEmailMsg(null);
        const result = await updateEmail(email.trim());
        if (result?.error) {
            setEmailMsg({ ok: false, text: result.error });
        } else {
            setEmailMsg({ ok: true, text: "Confirmation emails sent to both addresses — you must confirm the link in each inbox before the change takes effect." });
        }
        setEmailSaving(false);
    }

    async function handleUpdatePassword() {
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ ok: false, text: "Passwords do not match." });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ ok: false, text: "Password must be at least 6 characters." });
            return;
        }
        setPasswordSaving(true);
        setPasswordMsg(null);
        const result = await updatePassword(newPassword, currentPassword);
        if (result?.error) {
            setPasswordMsg({ ok: false, text: result.error });
        } else {
            setPasswordMsg({ ok: true, text: "Password updated." });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
        setPasswordSaving(false);
    }

    async function handleDelete() {
        setDeleting(true);
        setDeleteErr(null);
        const result = await deleteUser();
        if (result?.error) {
            setDeleteErr(result.error);
            setDeleting(false);
        }
    }

    const sectionBorder = { borderTop: "1px solid var(--border)" };

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
                <div className="flex justify-between items-center px-6 py-4" style={sectionBorder}>
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Account Settings</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all hover:bg-white/10"
                        style={{ color: "var(--muted)" }}
                    >
                        ✕
                    </button>
                </div>

                {/* Username */}
                <section className="px-6 py-5 flex flex-col gap-3" style={sectionBorder}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Username</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`flex-1 ${inputCls}`}
                            style={inputStyle}
                            onFocus={focusBrand}
                            onBlur={blurBorder}
                        />
                        <button
                            onClick={handleUpdateUsername}
                            disabled={usernameSaving || !username.trim() || username.trim() === initialUsername}
                            className={saveBtnCls}
                            style={saveBtnStyle}
                        >
                            {usernameSaving ? "Saving…" : "Save"}
                        </button>
                    </div>
                    <StatusLine msg={usernameMsg} />
                </section>

                {/* Email */}
                <section className="px-6 py-5 flex flex-col gap-3" style={sectionBorder}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Email</p>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`flex-1 ${inputCls}`}
                            style={inputStyle}
                            onFocus={focusBrand}
                            onBlur={blurBorder}
                        />
                        <button
                            onClick={handleUpdateEmail}
                            disabled={emailSaving || !email.trim() || email.trim() === initialEmail}
                            className={saveBtnCls}
                            style={saveBtnStyle}
                        >
                            {emailSaving ? "Saving…" : "Save"}
                        </button>
                    </div>
                    <StatusLine msg={emailMsg} />
                </section>

                {/* Password */}
                <section className="px-6 py-5 flex flex-col gap-3" style={sectionBorder}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Password</p>
                    <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={focusBrand}
                        onBlur={blurBorder}
                    />
                    <input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={focusBrand}
                        onBlur={blurBorder}
                    />
                    <div className="flex gap-2">
                        <input
                            type="password"
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`flex-1 ${inputCls}`}
                            style={inputStyle}
                            onFocus={focusBrand}
                            onBlur={blurBorder}
                        />
                        <button
                            onClick={handleUpdatePassword}
                            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                            className={saveBtnCls}
                            style={saveBtnStyle}
                        >
                            {passwordSaving ? "Saving…" : "Save"}
                        </button>
                    </div>
                    <StatusLine msg={passwordMsg} />
                </section>

                {/* Sign out */}
                <section className="px-6 py-5 flex flex-col gap-3" style={sectionBorder}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Session</p>
                    <form action={signOut}>
                        <button
                            className="self-start px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-white/10"
                            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                            Sign out
                        </button>
                    </form>
                </section>

                {/* Danger zone */}
                <section className="px-6 py-5 flex flex-col gap-3" style={sectionBorder}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#f87171" }}>Danger Zone</p>
                    {!deleteConfirm ? (
                        <button
                            onClick={() => setDeleteConfirm(true)}
                            className="self-start px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-red-500/10"
                            style={{ border: "1px solid #f87171", color: "#f87171" }}
                        >
                            Delete account
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                                This permanently deletes your account, all games, and transaction history. It cannot be undone.
                            </p>
                            {deleteErr && <p className="text-xs" style={{ color: "#f87171" }}>{deleteErr}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-90 disabled:opacity-50"
                                    style={{ background: "#f87171", color: "#0f0f0f" }}
                                >
                                    {deleting ? "Deleting…" : "Yes, delete everything"}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10"
                                    style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
