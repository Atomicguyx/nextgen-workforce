import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NextGen Matrix Workforce" },
      { name: "description", content: "Secure sign-in for NextGen Matrix staff and field agents." },
      { property: "og:title", content: "Sign in — NextGen Matrix Workforce" },
      { property: "og:description", content: "Secure sign-in for NextGen Matrix staff and field agents." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="grid-lines pointer-events-none absolute inset-0" />
      <form onSubmit={submit} className="relative w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 glow">
        <Link to="/" className="kicker block">NextGen Matrix</Link>
        <h1 className="text-2xl font-semibold">
          {mode === "in" ? "Sign in to work" : mode === "up" ? "Create your account" : "Reset password"}
        </h1>
        {mode === "up" && (
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {mode !== "reset" && (
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
        </Button>
        <div className="flex justify-between text-xs text-muted-foreground">
          {mode !== "in" ? (
            <button type="button" onClick={() => setMode("in")}>Back to sign in</button>
          ) : (
            <>
              <button type="button" onClick={() => setMode("up")}>Invited? Create account</button>
              <button type="button" onClick={() => setMode("reset")}>Forgot password</button>
            </>
          )}
        </div>
        {mode === "up" && (
          <p className="text-xs text-muted-foreground">
            New accounts stay pending until an admin approves them, unless your email was invited.
          </p>
        )}
      </form>
    </div>
  );
}
