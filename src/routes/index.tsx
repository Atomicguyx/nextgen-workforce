import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NextGen Matrix Workforce — Remote agent operations" },
      { name: "description", content: "The workspace where NextGen Matrix engineers and agents clock in, receive tasks and stay aligned." },
      { property: "og:title", content: "NextGen Matrix Workforce" },
      { property: "og:description", content: "Clock in, get tasks and stay aligned: the operations hub for NextGen Matrix teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  ["01", "Time clock", "One tap to start and end a shift, with a full day's hours tracked."],
  ["02", "Task board", "Installations, maintenance and site surveys, assigned and tracked from start to finish."],
  ["03", "Invite-only access", "Agents join by invitation and an admin approves them. Every role sees only what it needs."],
  ["04", "Audit trail", "Every access change is recorded for compliance."],
];

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-0" />
      <header className="relative flex items-center justify-between px-6 py-6 md:px-16">
        <span className="font-mono text-xs tracking-[0.3em] text-primary">NEXTGEN MATRIX</span>
        <Button asChild variant="outline" size="sm"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="relative px-6 pb-24 pt-16 md:px-16 md:pt-28">
        <p className="kicker">Workforce operations</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] md:text-7xl">
          Run the people side of your <span className="text-primary">infrastructure</span>.
        </h1>
        <p className="mt-6 max-w-xl text-muted-foreground">
          Solar, IoT and security deployments depend on engineers in the field. This is where they clock in, get their tasks and stay aligned with HQ.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg" className="glow"><Link to="/auth">Enter workspace</Link></Button>
          <Button asChild size="lg" variant="ghost"><a href="https://www.nextgenm.com.ng" target="_blank" rel="noreferrer">Company site ↗</a></Button>
        </div>
        <div className="mt-24 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
          {FEATURES.map(([n, t, d]) => (
            <div key={n} className="bg-card p-6">
              <p className="font-mono text-xs text-primary">{n}</p>
              <h3 className="mt-3 font-medium">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
