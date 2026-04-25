-- ─────────────────────────────────────────────
-- 00005 — Proyectos, tareas, milestones (módulo 3)
-- ─────────────────────────────────────────────

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  deal_id uuid references public.deals(id) on delete set null,
  name text not null,
  kind service_kind not null,
  status project_status not null default 'planificado',
  starts_on date,
  ends_on date,
  hours_estimated numeric(7,2),
  hours_real numeric(7,2) not null default 0,
  owner_id uuid references public.users_profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_alive on public.projects(deleted_at) where deleted_at is null;
drop trigger if exists tg_projects_updated on public.projects;
create trigger tg_projects_updated before update on public.projects
  for each row execute function public.fn_set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  assignee_id uuid references public.users_profiles(id) on delete set null,
  due_on date,
  hours_estimated numeric(6,2),
  hours_real numeric(6,2) not null default 0,
  depends_on uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due on public.tasks(due_on);
drop trigger if exists tg_tasks_updated on public.tasks;
create trigger tg_tasks_updated before update on public.tasks
  for each row execute function public.fn_set_updated_at();

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  due_on date,
  reached_at timestamptz,
  payment_pct int check (payment_pct between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_milestones_project on public.milestones(project_id);
drop trigger if exists tg_milestones_updated on public.milestones;
create trigger tg_milestones_updated before update on public.milestones
  for each row execute function public.fn_set_updated_at();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;

create policy projects_select on public.projects for select to authenticated using (deleted_at is null);
create policy projects_insert on public.projects for insert to authenticated with check (true);
create policy projects_update on public.projects for update to authenticated using (true) with check (true);
create policy projects_delete on public.projects for delete to authenticated using (false);

create policy tasks_select on public.tasks for select to authenticated using (deleted_at is null);
create policy tasks_insert on public.tasks for insert to authenticated with check (true);
create policy tasks_update on public.tasks for update to authenticated using (true) with check (true);
create policy tasks_delete on public.tasks for delete to authenticated using (false);

create policy milestones_select on public.milestones for select to authenticated using (true);
create policy milestones_insert on public.milestones for insert to authenticated with check (true);
create policy milestones_update on public.milestones for update to authenticated using (true) with check (true);
create policy milestones_delete on public.milestones for delete to authenticated using (false);

-- Plantillas de tareas por tipo de proyecto
create table if not exists public.project_templates (
  kind service_kind primary key,
  task_titles text[] not null
);
insert into public.project_templates(kind, task_titles) values
  ('chatbot',    array['Kickoff','Mapeo de flujos','Prompt engineering','Integración Evolution API','Testing','Go-live','Training cliente'])
  on conflict (kind) do nothing;
insert into public.project_templates(kind, task_titles) values
  ('web',        array['Kickoff','Wireframes','Diseño visual','Maquetación','Conexión datos','SEO básico','Go-live'])
  on conflict (kind) do nothing;
insert into public.project_templates(kind, task_titles) values
  ('software_custom', array['Kickoff','Discovery & specs','Diseño de schema','MVP backend','MVP frontend','QA','Despliegue','Soporte 30 días'])
  on conflict (kind) do nothing;
insert into public.project_templates(kind, task_titles) values
  ('social_media_management', array['Kickoff & accesos','Auditoría','Plan editorial','Producción mes 1','Publicación','Reporte mensual'])
  on conflict (kind) do nothing;
