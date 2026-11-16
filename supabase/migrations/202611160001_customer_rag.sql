-- Relational customer history and vector retrieval for the Enterprise Sales Copilot.
-- Apply in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists vector with schema extensions;

create table if not exists public.sales_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'salesperson' check (role in ('salesperson', 'manager', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id text primary key,
  name text not null,
  industry text,
  location text,
  relationship_since date,
  owner text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_assignments (
  account_id text not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create table if not exists public.contacts (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  full_name text not null,
  email text,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  name text not null,
  status text not null,
  stage text,
  opened_at date,
  closed_at date,
  updated_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  opportunity_id text references public.opportunities(id) on delete set null,
  name text not null,
  status text not null default 'Active',
  started_at date,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  opportunity_id text references public.opportunities(id) on delete set null,
  channel text not null,
  title text not null,
  source_type text not null,
  event_date date not null,
  summary text,
  content text not null default '',
  participants text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  account_id text references public.accounts(id) on delete cascade,
  title text not null,
  document_type text not null,
  source text,
  version text,
  effective_date date,
  access_scope text not null default 'account' check (access_scope in ('account', 'singtel_global')),
  content text not null default '',
  storage_path text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (
    (access_scope = 'singtel_global' and account_id is null)
    or (access_scope = 'account' and account_id is not null)
  )
);

create table if not exists public.document_chunks (
  id text primary key,
  account_id text references public.accounts(id) on delete cascade,
  opportunity_id text references public.opportunities(id) on delete set null,
  document_id text references public.documents(id) on delete cascade,
  interaction_id text references public.interactions(id) on delete cascade,
  source_title text not null,
  source_type text not null,
  source_date date,
  chunk_index integer not null default 0,
  content text not null,
  embedding extensions.vector(384) not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (document_id is not null or interaction_id is not null)
);

create table if not exists public.follow_up_actions (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  opportunity_id text references public.opportunities(id) on delete set null,
  interaction_id text references public.interactions(id) on delete set null,
  action text not null,
  owner text,
  due_date date,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create table if not exists public.suggestions (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  opportunity_id text references public.opportunities(id) on delete set null,
  interaction_id text references public.interactions(id) on delete set null,
  suggestion_type text not null,
  title text not null,
  content text not null,
  evidence jsonb not null default '[]',
  status text not null default 'open',
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists interactions_account_date_idx
  on public.interactions (account_id, event_date desc);
create index if not exists documents_account_date_idx
  on public.documents (account_id, effective_date desc);
create index if not exists chunks_account_opportunity_idx
  on public.document_chunks (account_id, opportunity_id);
create index if not exists chunks_embedding_hnsw_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

create or replace function public.match_customer_chunks(
  query_embedding extensions.vector(384),
  filter_account_id text,
  result_limit integer default 5,
  filter_opportunity_id text default null
)
returns table (
  id text,
  source_title text,
  source_type text,
  source_date date,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select c.id, c.source_title, c.source_type, c.source_date, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks as c
  where (c.account_id = filter_account_id or c.account_id is null)
    and (filter_opportunity_id is null or c.opportunity_id = filter_opportunity_id or c.opportunity_id is null)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(result_limit, 20));
$$;

alter table public.sales_profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_assignments enable row level security;
alter table public.contacts enable row level security;
alter table public.services enable row level security;
alter table public.opportunities enable row level security;
alter table public.interactions enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.follow_up_actions enable row level security;
alter table public.suggestions enable row level security;

create policy "profile owner can read own profile" on public.sales_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "users can read own account assignments" on public.account_assignments
  for select to authenticated using (user_id = auth.uid());

create policy "assigned users can read accounts" on public.accounts
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = accounts.id and a.user_id = auth.uid())
  );
create policy "assigned users can read contacts" on public.contacts
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = contacts.account_id and a.user_id = auth.uid())
  );
create policy "assigned users can read services" on public.services
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = services.account_id and a.user_id = auth.uid())
  );
create policy "assigned users can read opportunities" on public.opportunities
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = opportunities.account_id and a.user_id = auth.uid())
  );
create policy "assigned users can read interactions" on public.interactions
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = interactions.account_id and a.user_id = auth.uid())
  );
create policy "assigned users and signed-in users can read documents" on public.documents
  for select to authenticated using (
    (access_scope = 'singtel_global' and account_id is null)
    or exists (select 1 from public.account_assignments a where a.account_id = documents.account_id and a.user_id = auth.uid())
  );
create policy "assigned users and signed-in users can read chunks" on public.document_chunks
  for select to authenticated using (
    account_id is null
    or exists (select 1 from public.account_assignments a where a.account_id = document_chunks.account_id and a.user_id = auth.uid())
  );
create policy "assigned users can read follow ups" on public.follow_up_actions
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = follow_up_actions.account_id and a.user_id = auth.uid())
  );
create policy "assigned users can read suggestions" on public.suggestions
  for select to authenticated using (
    exists (select 1 from public.account_assignments a where a.account_id = suggestions.account_id and a.user_id = auth.uid())
  );
