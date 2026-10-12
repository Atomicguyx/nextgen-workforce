import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — NextGen Matrix" },
      { name: "description", content: "Choose a new password for your NextGen Matrix account." },
      { property: "og:title", content: "Set a new password — NextGen Matrix" },
      { property: "og:description", content: "Choose a new password for your NextGen Matrix account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    nav({ to: "/dashboard" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <Input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" required />
        <Button className="w-full" type="submit">Save password</Button>
      </form>
    </div>
  );
}
