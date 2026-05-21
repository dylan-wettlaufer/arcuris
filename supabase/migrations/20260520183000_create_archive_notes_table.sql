create table public.archive_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('experience', 'project')),
  item_index integer not null check (item_index >= 0),
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index archive_notes_user_item_idx
on public.archive_notes (user_id, item_type, item_index, created_at desc);

create trigger set_archive_notes_updated_at
before update on public.archive_notes
for each row
execute function public.set_updated_at();

alter table public.archive_notes enable row level security;

create policy "Users can read their own archive notes"
on public.archive_notes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own archive notes"
on public.archive_notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own archive notes"
on public.archive_notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own archive notes"
on public.archive_notes
for delete
to authenticated
using ((select auth.uid()) = user_id);
