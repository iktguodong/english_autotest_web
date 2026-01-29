create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists word_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  source_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  word_list_id uuid not null references word_lists(id) on delete cascade,
  word text not null,
  meaning text not null,
  created_at timestamptz not null default now()
);

create index if not exists words_word_list_id_idx on words(word_list_id);

create table if not exists wrong_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  word_list_id uuid references word_lists(id) on delete cascade,
  wrong_count int not null default 0,
  last_wrong_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, word_id, word_list_id)
);

create index if not exists wrong_words_user_list_idx on wrong_words(user_id, word_list_id);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  word_list_id uuid references word_lists(id) on delete cascade,
  mode text not null,
  status text not null,
  order_ids uuid[] not null,
  correct_ids uuid[] not null default '{}',
  incorrect_ids uuid[] not null default '{}',
  current_index int not null default 0,
  accuracy int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists test_sessions_user_id_idx on test_sessions(user_id);

create table if not exists test_answers (
  id uuid primary key default gen_random_uuid(),
  test_session_id uuid not null references test_sessions(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists test_answers_session_id_idx on test_answers(test_session_id);
