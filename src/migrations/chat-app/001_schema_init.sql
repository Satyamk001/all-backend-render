-- 0001_users.sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    clerk_user_id TEXT NOT NULL UNIQUE,
    display_name TEXT,
    handle TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 0002_threads_core.sql
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS threads (
   id BIGSERIAL PRIMARY KEY,
   category_id BIGINT NOT NULL REFERENCES categories(id),
   author_user_id BIGINT NOT NULL REFERENCES users(id),
   title TEXT NOT NULL,
   body TEXT NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_category_created_at
   ON threads (category_id, created_at DESC);

INSERT INTO categories (slug, name, description)
VALUES 
  ('general',  'General',  'Anything dev-related, off-topic but friendly.'),
  ('q-and-a',  'Q&A',      'Ask and answer coding and career questions.'),
  ('showcase', 'Showcase', 'Share what you are building or learning.'),
  ('help',     'Help',     'Stuck on something? Ask for help here.')
ON CONFLICT (slug) DO NOTHING;

-- 0003_replies_like.sql
CREATE TABLE IF NOT EXISTS replies (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    author_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_thread_created_at
  ON replies (thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS thread_reactions (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_thread_reaction UNIQUE (thread_id, user_id) 
);

CREATE INDEX IF NOT EXISTS idx_thread_reactions_thread
   ON thread_reactions (thread_id);

-- 0004_notifications.sql
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('REPLY_ON_THREAD', 'LIKE_ON_THREAD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
   ON notifications (user_id, read_at);

-- 0005_chat.sql
CREATE TABLE IF NOT EXISTS direct_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_sender_recipient_created_at 
  ON direct_messages (sender_user_id, recipient_user_id, created_at DESC);
