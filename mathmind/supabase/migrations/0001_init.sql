-- MathMind schema: profiles, skill graph, misconception bank, sessions/turns,
-- per-skill mastery, and the misconception_events feed that powers the teacher
-- dashboard (via Supabase Realtime). RLS keeps students to their own rows and
-- lets teachers read their class's students.

create extension if not exists "pgcrypto";

-- Roles for a person using the app.
create type user_role as enum ('student', 'teacher');

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         user_role not null default 'student',
  display_name text not null default '',
  grade        int,
  teacher_id   uuid references profiles (id),  -- a student's teacher
  created_at   timestamptz not null default now()
);

create table skills (
  id         text primary key,
  code       text not null,
  title      text not null,
  domain     text not null,
  grade      int  not null,
  prereq_ids text[] not null default '{}'
);

create table misconceptions (
  tag         text primary key,
  skill_id    text not null references skills (id) on delete cascade,
  description text not null,
  remediation text not null
);

create table sessions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  skill_id   text not null references skills (id),
  started_at timestamptz not null default now()
);

create table turns (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references sessions (id) on delete cascade,
  student_id        uuid not null references profiles (id) on delete cascade,
  skill_id          text not null references skills (id),
  prompt            text not null,
  student_answer    text not null,
  student_thinking  text,
  is_correct        boolean not null,
  is_on_track       boolean not null,
  misconception_tag text references misconceptions (tag),
  difficulty        int not null,
  created_at        timestamptz not null default now()
);

create table mastery (
  student_id uuid not null references profiles (id) on delete cascade,
  skill_id   text not null references skills (id),
  level      real not null default 0,       -- 0..1
  difficulty int  not null default 1,        -- 1..3
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

create table misconception_events (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles (id) on delete cascade,
  skill_id    text not null references skills (id),
  tag         text not null references misconceptions (tag),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles              enable row level security;
alter table sessions              enable row level security;
alter table turns                 enable row level security;
alter table mastery               enable row level security;
alter table misconception_events  enable row level security;
-- skills + misconceptions are shared reference data (readable by all authed users).
alter table skills                enable row level security;
alter table misconceptions        enable row level security;

create policy "read reference skills" on skills
  for select using (auth.role() = 'authenticated');
create policy "read reference misconceptions" on misconceptions
  for select using (auth.role() = 'authenticated');

-- A profile is visible to its owner, and to that student's teacher.
create policy "own or teacher profile" on profiles
  for select using (
    id = auth.uid()
    or teacher_id = auth.uid()
    or id = (select teacher_id from profiles where id = auth.uid())
  );
create policy "update own profile" on profiles
  for update using (id = auth.uid());

-- Helper: is the current user the student, or the student's teacher?
create or replace function is_student_or_teacher(target_student uuid)
returns boolean language sql stable as $$
  select target_student = auth.uid()
      or exists (
        select 1 from profiles p
        where p.id = target_student and p.teacher_id = auth.uid()
      );
$$;

create policy "student/teacher read sessions" on sessions
  for select using (is_student_or_teacher(student_id));
create policy "student write sessions" on sessions
  for insert with check (student_id = auth.uid());

create policy "student/teacher read turns" on turns
  for select using (is_student_or_teacher(student_id));
create policy "student write turns" on turns
  for insert with check (student_id = auth.uid());

create policy "student/teacher read mastery" on mastery
  for select using (is_student_or_teacher(student_id));
create policy "student upsert mastery" on mastery
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "student/teacher read events" on misconception_events
  for select using (is_student_or_teacher(student_id));
create policy "student write events" on misconception_events
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Realtime for the teacher dashboard's live misconception feed + mastery updates.
alter publication supabase_realtime add table misconception_events;
alter publication supabase_realtime add table mastery;
