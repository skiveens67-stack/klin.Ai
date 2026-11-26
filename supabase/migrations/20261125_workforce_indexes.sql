create index if not exists business_banking_intakes_user_idx on public.business_banking_intakes(user_id);
create index if not exists workforce_courses_owner_idx on public.workforce_courses(owner_user_id);
create index if not exists workforce_employees_employee_user_idx on public.workforce_employees(employee_user_id);
create index if not exists workforce_employees_job_idx on public.workforce_employees(job_id);
create index if not exists workforce_enrollments_user_idx on public.workforce_enrollments(user_id);