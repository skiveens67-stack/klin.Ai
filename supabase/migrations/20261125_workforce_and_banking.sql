create table if not exists public.workforce_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 20 and 8000),
  location text not null default 'Remote',
  employment_type text not null default 'Full-time' check (employment_type in ('Full-time','Part-time','Contract','Temporary','Internship')),
  pay_range text,
  status text not null default 'published' check (status in ('draft','published','paused','closed')),
  is_promoted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workforce_jobs_status_created_idx on public.workforce_jobs(status, created_at desc);
create index if not exists workforce_jobs_owner_idx on public.workforce_jobs(owner_user_id);
alter table public.workforce_jobs enable row level security;
grant select, insert, update, delete on public.workforce_jobs to authenticated;
create policy "Published workforce jobs are visible to signed-in users" on public.workforce_jobs for select to authenticated using (status = 'published' or owner_user_id = (select auth.uid()));
create policy "Business owners can create workforce jobs" on public.workforce_jobs for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "Business owners can update their workforce jobs" on public.workforce_jobs for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Business owners can delete their workforce jobs" on public.workforce_jobs for delete to authenticated using (owner_user_id = (select auth.uid()));

create table if not exists public.workforce_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.workforce_jobs(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  applicant_name text not null check (char_length(applicant_name) between 2 and 100),
  cover_note text not null default '' check (char_length(cover_note) <= 4000),
  resume_url text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','interview','offered','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, applicant_user_id)
);
create index if not exists workforce_applications_job_idx on public.workforce_applications(job_id, created_at desc);
create index if not exists workforce_applications_applicant_idx on public.workforce_applications(applicant_user_id, created_at desc);
alter table public.workforce_applications enable row level security;
grant select, insert, update on public.workforce_applications to authenticated;
create policy "Applicants and hiring businesses can view applications" on public.workforce_applications for select to authenticated using (
  applicant_user_id = (select auth.uid()) or exists (
    select 1 from public.workforce_jobs j where j.id = job_id and j.owner_user_id = (select auth.uid())
  )
);
create policy "Users can apply to published jobs as themselves" on public.workforce_applications for insert to authenticated with check (
  applicant_user_id = (select auth.uid()) and exists (
    select 1 from public.workforce_jobs j where j.id = job_id and j.status = 'published' and j.owner_user_id <> (select auth.uid())
  )
);
create policy "Hiring businesses can update application status" on public.workforce_applications for update to authenticated using (
  exists (select 1 from public.workforce_jobs j where j.id = job_id and j.owner_user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.workforce_jobs j where j.id = job_id and j.owner_user_id = (select auth.uid()))
);

create table if not exists public.workforce_courses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 3000),
  course_url text not null,
  meeting_url text,
  session_at timestamptz,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.workforce_courses enable row level security;
grant select, insert, update, delete on public.workforce_courses to authenticated;
create policy "Published training is visible to signed-in users" on public.workforce_courses for select to authenticated using (published or owner_user_id = (select auth.uid()));
create policy "Training hosts manage their courses" on public.workforce_courses for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "Training hosts update their courses" on public.workforce_courses for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Training hosts delete their courses" on public.workforce_courses for delete to authenticated using (owner_user_id = (select auth.uid()));

create table if not exists public.workforce_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.workforce_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(course_id, user_id)
);
alter table public.workforce_enrollments enable row level security;
grant select, insert, delete on public.workforce_enrollments to authenticated;
create policy "Learners and course hosts can view enrollments" on public.workforce_enrollments for select to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.workforce_courses c where c.id = course_id and c.owner_user_id = (select auth.uid()))
);
create policy "Learners can enroll themselves in published courses" on public.workforce_enrollments for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.workforce_courses c where c.id = course_id and c.published)
);
create policy "Learners can withdraw their own enrollment" on public.workforce_enrollments for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.business_banking_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null check (char_length(bank_name) between 2 and 120),
  business_name text not null check (char_length(business_name) between 2 and 120),
  country_code text not null default 'US',
  status text not null default 'partner_required' check (status in ('draft','partner_required','provider_review','submitted','approved','rejected')),
  provider_application_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_banking_intakes enable row level security;
grant select, insert, update on public.business_banking_intakes to authenticated;
create policy "Business owners can view their own banking requests" on public.business_banking_intakes for select to authenticated using (user_id = (select auth.uid()));
create policy "Business owners can create their own banking requests" on public.business_banking_intakes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Business owners can update their own banking requests" on public.business_banking_intakes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
