alter table public.inventory
add column interview_questions jsonb not null default '[]'::jsonb;
