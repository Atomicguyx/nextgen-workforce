ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';

CREATE OR REPLACE FUNCTION public.is_auditor(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'auditor')
$$;

CREATE OR REPLACE FUNCTION public.is_finance(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active(_user_id) AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('finance','admin','super_admin'))
$$;

CREATE TYPE public.invoice_status AS ENUM ('draft','sent','part_paid','paid','cancelled');

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL DEFAULT ('INV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  description text,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  amount_ngn numeric NOT NULL DEFAULT 0 CHECK (amount_ngn >= 0),
  paid_ngn numeric NOT NULL DEFAULT 0 CHECK (paid_ngn >= 0),
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  paid_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance or auditor read invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_finance(auth.uid()) OR public.is_auditor(auth.uid()));
CREATE POLICY "finance create invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "finance update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "admin delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX invoices_status_idx ON public.invoices(status, due_date);

-- Auditor: read everything
CREATE POLICY "auditor read tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read jobs" ON public.jobs FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read job updates" ON public.job_updates FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read attendance" ON public.attendance FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));
CREATE POLICY "auditor read invites" ON public.invites FOR SELECT TO authenticated USING (public.is_auditor(auth.uid()));

-- Auditor: never write
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','jobs','job_updates','leads','attendance','announcements','invites','invoices'] LOOP
    EXECUTE format('CREATE POLICY "auditor no insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_auditor(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "auditor no update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_auditor(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "auditor no delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_auditor(auth.uid()))', t);
  END LOOP;
END $$;