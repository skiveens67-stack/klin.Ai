alter table public.workforce_applications drop constraint if exists workforce_applications_status_check;
alter table public.workforce_applications add constraint workforce_applications_status_check check (status in ('submitted','reviewing','interview','offered','hired','rejected','withdrawn'));
create table if not exists public.workforce_employees (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  employee_user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.workforce_jobs(id) on delete cascade,
  application_id uuid not null unique references public.workforce_applications(id) on delete cascade,
  status text not null default 'active' check (status in ('active','inactive')),
  hired_at timestamptz not null default now(),
  unique(owner_user_id, employee_user_id)
);
alter table public.workforce_employees enable row level security;
grant select, insert, update, delete on public.workforce_employees to authenticated;
create policy "Employers and employees can view their work relationships" on public.workforce_employees for select to authenticated using (owner_user_id = (select auth.uid()) or employee_user_id = (select auth.uid()));
create policy "Employers can add employees from their own jobs" on public.workforce_employees for insert to authenticated with check (
 owner_user_id = (select auth.uid()) and exists (select 1 from public.workforce_jobs j where j.id = job_id and j.owner_user_id = (select auth.uid())) and exists (select 1 from public.workforce_applications a where a.id = application_id and a.job_id = job_id and a.applicant_user_id = employee_user_id)
);
create policy "Employers can update employee records" on public.workforce_employees for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Employers can remove employee records" on public.workforce_employees for delete to authenticated using (owner_user_id = (select auth.uid()));
