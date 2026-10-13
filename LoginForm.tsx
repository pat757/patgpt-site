"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ error }: { error?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ cls: "" | "ok" | "err"; text: string }>(
    error ? { cls: "err", text: "That sign-in link didn't work or has expired. Request a new one." } : { cls: "", text: "" },
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setState({ cls: "", text: "" });
    const { error } = await getBrowserClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Only the admin account you created in Supabase can sign in. Nobody can sign up.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/admin`,
      },
    });
    setBusy(false);
    if (error && /rate|too many|seconds/i.test(error.message)) {
      setState({ cls: "err", text: "Too many attempts. Wait a minute, then try again." });
      return;
    }
    // Same message either way, so the form doesn't reveal which emails have accounts.
    setState({ cls: "ok", text: "If that's the admin email, a sign-in link is on its way. Check your inbox." });
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="lEmail">Email</label>
        <input id="lEmail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      <div className={`status ${state.cls}`} role="status">
        {state.text}
      </div>
    </form>
  );
}
