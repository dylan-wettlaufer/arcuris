create table public.inventory (
  user_id uuid primary key references auth.users (id) on delete cascade,
  resume_text text,
  parsed_json jsonb not null default '{}'::jsonb,
  interview_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_inventory_updated_at
before update on public.inventory
for each row
execute function public.set_updated_at();

alter table public.inventory enable row level security;

create policy "Users can read their own inventory"
on public.inventory
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own inventory"
on public.inventory
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own inventory"
on public.inventory
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own inventory"
on public.inventory
for delete
to authenticated
using ((select auth.uid()) = user_id);
