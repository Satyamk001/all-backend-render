import { pool } from '../../../db/db.js';
import { Friendship, FriendshipStatus, FriendUser } from './friends.types.js';

export async function createFriendship(requesterId: number, addresseeId: number): Promise<Friendship> {
  const { rows } = await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     RETURNING id, requester_id AS "requesterId", addressee_id AS "addresseeId", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [requesterId, addresseeId]
  );
  return rows[0];
}

export async function getFriendship(user1Id: number, user2Id: number): Promise<Friendship | null> {
  const { rows } = await pool.query(
    `SELECT id, requester_id AS "requesterId", addressee_id AS "addresseeId", status, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [user1Id, user2Id]
  );
  return rows[0] || null;
}

export async function getFriendshipById(id: number): Promise<Friendship | null> {
  const { rows } = await pool.query(
    `SELECT id, requester_id AS "requesterId", addressee_id AS "addresseeId", status, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM friendships WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateFriendshipStatus(id: number, status: FriendshipStatus): Promise<Friendship> {
  const { rows } = await pool.query(
    `UPDATE friendships
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, requester_id AS "requesterId", addressee_id AS "addresseeId", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, status]
  );
  return rows[0];
}

export async function listFriends(userId: number): Promise<FriendUser[]> {
  const { rows } = await pool.query(
    `SELECT 
       u.id, u.display_name AS "displayName", u.handle, u.avatar_url AS "avatarUrl",
       f.id AS "friendshipId", f.status,
       CASE WHEN f.requester_id = $1 THEN true ELSE false END AS "isRequester"
     FROM friendships f
     JOIN users u ON (CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END) = u.id
     WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       AND f.status = 'accepted'
     ORDER BY u.display_name ASC`,
    [userId]
  );
  return rows;
}

export async function listPendingRequests(userId: number): Promise<FriendUser[]> {
  // Incoming requests: requester_id is OTHER, addressee_id is ME, status is pending
  // Outgoing requests: requester_id is ME, addressee_id is OTHER, status is pending
  
  const { rows } = await pool.query(
    `SELECT 
       u.id, u.display_name AS "displayName", u.handle, u.avatar_url AS "avatarUrl",
       f.id AS "friendshipId", f.status,
       CASE WHEN f.requester_id = $1 THEN true ELSE false END AS "isRequester"
     FROM friendships f
     JOIN users u ON (CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END) = u.id
     WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function searchUsers(userId: number, query: string): Promise<any[]> {
  // Find users mirroring listChatUsers logic but excluding already connected friends/pending
  // If query is empty, return random users as suggestions
  const isSearch = query.trim().length > 0;
  
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name AS "displayName", u.handle, u.avatar_url AS "avatarUrl"
     FROM users u
     WHERE u.id != $1
       AND ($2 = '' OR u.display_name ILIKE $3 OR u.handle ILIKE $3)
       AND NOT EXISTS (
         SELECT 1 FROM friendships f 
         WHERE (f.requester_id = $1 AND f.addressee_id = u.id) 
            OR (f.requester_id = u.id AND f.addressee_id = $1)
       )
     ORDER BY ${isSearch ? `COALESCE(u.display_name, u.handle) ASC` : `RANDOM()`}
     LIMIT 20`,
    [userId, query, `%${query}%`]
  );
  return rows;
}
