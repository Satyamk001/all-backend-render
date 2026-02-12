
import { type Client } from 'pg';

export async function up(db: Client) {
  // Add last_online_at to users
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  `);

  // Add status to direct_messages
  // We use text with a check constraint to simulate an enum without the hassle of managing enum types in migrations
  await db.query(`
    ALTER TABLE direct_messages
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));
  `);
  
  // Create index for performance
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_last_online ON users(last_online_at);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON direct_messages(status);
  `);
}

export async function down(db: Client) {
  await db.query(`
    ALTER TABLE users
    DROP COLUMN IF NOT EXISTS last_online_at;
  `);

  await db.query(`
    ALTER TABLE direct_messages
    DROP COLUMN IF NOT EXISTS status;
  `);
}
