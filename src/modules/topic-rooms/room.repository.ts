import { pool } from '../../db/db.js';
import { CreateRoomDto, TopicRoom, RoomMessage } from './room.types.js';

export async function createRoom(creatorId: number, dto: CreateRoomDto): Promise<TopicRoom> {
  const expiresAt = new Date(Date.now() + dto.durationMinutes * 60000);
  
  const { rows } = await pool.query(
    `INSERT INTO topic_rooms (title, category, creator_id, max_users, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, category, creator_id AS "creatorId", max_users AS "maxUsers", created_at AS "createdAt", expires_at AS "expiresAt"`,
    [dto.title, dto.category, creatorId, dto.maxUsers || 50, expiresAt]
  );
  return rows[0];
}

export async function listActiveRooms(category?: string, search?: string): Promise<TopicRoom[]> {
  let query = `
    SELECT 
      t.id, t.title, t.category, 
      t.creator_id AS "creatorId", 
      t.max_users AS "maxUsers", 
      t.created_at AS "createdAt", 
      t.expires_at AS "expiresAt",
      COALESCE(COUNT(p.user_id), 0)::int AS "participantCount"
    FROM topic_rooms t
    LEFT JOIN room_participants p ON t.id = p.room_id
    WHERE t.expires_at > NOW()
  `;
  const params: any[] = [];

  if (category && category !== 'All') {
    params.push(category);
    query += ` AND t.category = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND t.title ILIKE $${params.length}`;
  }

  query += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT 50`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getRoomById(roomId: number): Promise<TopicRoom | null> {
  const { rows } = await pool.query(
    `SELECT 
      id, title, category, 
      creator_id AS "creatorId", 
      max_users AS "maxUsers", 
      created_at AS "createdAt", 
      expires_at AS "expiresAt"
     FROM topic_rooms WHERE id = $1 AND expires_at > NOW()`,
    [roomId]
  );
  return rows[0] || null;
}

export async function joinRoom(roomId: number, userId: number): Promise<void> {
  await pool.query(
    `INSERT INTO room_participants (room_id, user_id) 
     VALUES ($1, $2) 
     ON CONFLICT (room_id, user_id) DO NOTHING`,
    [roomId, userId]
  );
}

export async function leaveRoom(roomId: number, userId: number): Promise<void> {
  await pool.query(
    `DELETE FROM room_participants WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId]
  );
}

export async function getRoomMessages(roomId: number, limit = 50): Promise<RoomMessage[]> {
  const { rows } = await pool.query(
    `SELECT 
       m.id, m.room_id AS "roomId", m.user_id AS "userId", m.content, m.created_at AS "createdAt",
       u.id AS "senderId", u.display_name AS "senderDisplayName", u.avatar_url AS "senderAvatarUrl"
     FROM room_messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.room_id = $1
     ORDER BY m.created_at ASC
     LIMIT $2`,
    [roomId, limit]
  );
  
  return rows.map((row: any) => ({
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    content: row.content,
    createdAt: row.createdAt,
    sender: {
      id: row.senderId,
      displayName: row.senderDisplayName,
      avatarUrl: row.senderAvatarUrl,
    }
  }));
}

export async function createRoomMessage(roomId: number, userId: number, content: string): Promise<RoomMessage> {
  const { rows } = await pool.query(
    `INSERT INTO room_messages (room_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, room_id AS "roomId", user_id AS "userId", content, created_at AS "createdAt"`,
    [roomId, userId, content]
  );
  
  // Fetch sender details for real-time broadcast
  const { rows: userRows } = await pool.query('SELECT display_name, avatar_url FROM users WHERE id = $1', [userId]);
  const sender = userRows[0];
  
  return {
    ...rows[0],
    sender: {
      id: userId,
      displayName: sender?.display_name,
      avatarUrl: sender?.avatar_url
    }
  };
}

export async function getRoomParticipantCount(roomId: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM room_participants WHERE room_id = $1`, 
    [roomId]
  );
  return parseInt(rows[0].count, 10);
}
