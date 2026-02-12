-- 006_add_last_online_and_status.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_messages' AND column_name='status') THEN
        ALTER TABLE direct_messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_last_online ON users(last_online_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON direct_messages(status);

-- 007_create_topic_rooms.sql
CREATE TABLE IF NOT EXISTS topic_rooms (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_users INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS room_participants (
  room_id INTEGER NOT NULL REFERENCES topic_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  socket_id VARCHAR(255),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES topic_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_rooms_expires_at ON topic_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_topic_rooms_category ON topic_rooms(category);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);

-- 008_create_friendships.sql
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id),
  addressee_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 009_update_notifications.sql
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='friendship_id') THEN
    ALTER TABLE notifications ADD COLUMN friendship_id INTEGER REFERENCES friendships(id) ON DELETE CASCADE;
  END IF;

  ALTER TABLE notifications ALTER COLUMN thread_id DROP NOT NULL;
  
  -- We drop the constraint here and re-add it in the next block/step or just update it once
  -- But since we are concatenating, let's just make sure we end up with the final state.
  -- The original 009 added (REPLY, LIKE, FRIEND_REQUEST, ACCEPTED).
  -- The original 010 added (REJECTED).
  -- We can just go straight to the final state if we want, OR keep the history. 
  -- To be safe and "keep logic intact" as requested, we can sequentially apply them, 
  -- OR just apply the final constraint once.
  -- Let's apply the final constraint state to avoid churn if this is a fresh run, 
  -- but strictly satisfying "reduce files" while "keeping schema intact".
  -- Using the final constraint state is cleaner.
  
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('REPLY_ON_THREAD', 'LIKE_ON_THREAD', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FRIEND_REJECTED'));
END $$;
