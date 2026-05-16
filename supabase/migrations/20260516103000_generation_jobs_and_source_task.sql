-- Async resume generation: map Celery task to user + JD
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  celery_task_id text not null,
  job_description text not null,
  application_id uuid references public.applications (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint generation_jobs_celery_task_id_key unique (celery_task_id)
);

create index generation_jobs_user_created_at_idx
on public.generation_jobs (user_id, created_at desc);

alter table public.generation_jobs enable row level security;

create policy "Users can read their own generation jobs"
on public.generation_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own generation jobs"
on public.generation_jobs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own generation jobs"
on public.generation_jobs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own generation jobs"
on public.generation_jobs
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Idempotent finalize when multiple clients poll the same Celery task
alter table public.applications
add column source_task_id text;

create unique index applications_source_task_id_uidx
on public.applications (source_task_id)
where source_task_id is not null;
