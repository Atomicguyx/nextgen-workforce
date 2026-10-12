import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({ meta: [{ title: "Compliance — NextGen Matrix Workforce" }] }),
  component: Compliance,
});

const PRO_CHECKLIST = [
  ["Lawyer", "Employment vs. contractor agreements for agents, under the Nigerian Labour Act. Getting this wrong affects tax, pensions and termination rights."],
  ["Lawyer / DPO", "Nigeria Data Protection Act 2023 (NDPA): privacy notice, lawful basis, and registration with the NDPC if you process data at scale. Any GPS tracking needs clear written consent."],
  ["Accountant", "PAYE deductions, state tax registration, and Withholding Tax on contractor payments. Also VAT on your solar and installation sales."],
  ["HR professional", "Pension (PenCom 8%+10%), NHF, NSITF and ITF obligations, and a written disciplinary policy before you issue any warning."],
  ["Insurance broker", "Group life insurance (required under the Pension Reform Act) plus cover for field installation risk, like working at height and electrical work."],
  ["Electrical certification", "Check that field technicians have the right qualifications (e.g. COREN/NEMSA where needed) and keep the certificates on file."],
];

function Compliance() {
  const logs = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">Risk & records</p>
        <h1 className="mt-2 text-3xl font-semibold">Compliance</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This app keeps records. It does not replace your lawyer, accountant or HR advisor. Get these items reviewed by a professional before you scale.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {PRO_CHECKLIST.map(([who, what]) => (
          <div key={who} className="rounded-xl border bg-card p-5">
            <p className="kicker text-warning">{who}</p>
            <p className="mt-2 text-sm">{what}</p>
          </div>
        ))}
      </div>
      <section className="rounded-xl border bg-card p-6">
        <p className="kicker">Audit log · latest 50</p>
        <ul className="mt-4 divide-y font-mono text-xs">
          {(logs.data ?? []).map((l) => (
            <li key={l.id} className="flex flex-wrap gap-x-4 py-2">
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              <span className="text-primary">{l.action}</span>
              <span>{l.target}</span>
              {l.details && <span className="text-muted-foreground">{JSON.stringify(l.details)}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
