create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  job_description text not null,
  resume_markdown text not null,
  draft_score integer not null check (draft_score between 1 and 10),
  refined_score integer not null check (refined_score between 1 and 10),
  status text not null default 'Applied' check (
    status in ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_created_at_idx
on public.applications (user_id, created_at desc);

create trigger set_applications_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

alter table public.applications enable row level security;

create policy "Users can read their own applications"
on public.applications
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own applications"
on public.applications
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own applications"
on public.applications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own applications"
on public.applications
for delete
to authenticated
using ((select auth.uid()) = user_id);
