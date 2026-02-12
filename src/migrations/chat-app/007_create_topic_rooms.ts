import { Client } from 'pg';

export async function up(db: Client) {
  // 1. Create topic_rooms table
  await db.query(`
    CREATE TABLE IF NOT EXISTS topic_rooms (
      id SERIAL PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      max_users INTEGER NOT NULL DEFAULT 50,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // 2. Create room_participants table
  await db.query(`
    CREATE TABLE IF NOT EXISTS room_participants (
      room_id INTEGER NOT NULL REFERENCES topic_rooms(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      socket_id VARCHAR(255),
      PRIMARY KEY (room_id, user_id)
    );
  `);

  // 3. Create room_messages table (Ephemeral)
  await db.query(`
    CREATE TABLE IF NOT EXISTS room_messages (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES topic_rooms(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 4. Indexes for performance
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_topic_rooms_expires_at ON topic_rooms(expires_at);
    CREATE INDEX IF NOT EXISTS idx_topic_rooms_category ON topic_rooms(category);
    CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
  `);
}

export async function down(db: Client) {
  await db.query(`DROP TABLE IF EXISTS room_messages;`);
  await db.query(`DROP TABLE IF EXISTS room_participants;`);
  await db.query(`DROP TABLE IF EXISTS topic_rooms;`);
}
