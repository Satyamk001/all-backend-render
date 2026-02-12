import * as friendRepo from './friends.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import { CreateFriendRequestDto, RespondFriendRequestDto } from './friends.types.js';
import { getIo } from '../../../realtime/io.js';
import { query } from '../../../db/db.js';

async function getUserBasic(userId: number) {
  const { rows } = await query('SELECT id, display_name, handle, avatar_url FROM users WHERE id = $1', [userId]);
  return rows[0];
}

export async function sendFriendRequest(requesterId: number, dto: CreateFriendRequestDto) {
  const { targetUserId } = dto;
  
  if (requesterId === targetUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  const existing = await friendRepo.getFriendship(requesterId, targetUserId);
  if (existing) {
    if (existing.status === 'accepted') throw new Error('Already friends');
    if (existing.status === 'pending') throw new Error('Friend request already pending');
    if (existing.status === 'rejected') throw new Error('Friend request was rejected');
  }

  const friendship = await friendRepo.createFriendship(requesterId, targetUserId);
  
  // Real-time notification
  try {
    const io = getIo();
    if (io) {
      const requester = await getUserBasic(requesterId);
      
      io.to(`notifications:user:${targetUserId}`).emit('friend:request', {
        friendshipId: friendship.id,
        requester: {
          id: requester.id,
          displayName: requester.display_name,
          handle: requester.handle,
          avatarUrl: requester.avatar_url
        },
        createdAt: friendship.createdAt
      });
    }
  } catch (err) {
    console.error('Failed to emit socket event:', err);
  }

  // Persist notification
  try {
    await notificationService.createFriendRequestNotification({
        friendshipId: friendship.id,
        actorUserId: requesterId,
        targetUserId: targetUserId
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }

  return friendship;
}

export async function respondToFriendRequest(userId: number, dto: RespondFriendRequestDto) {
  const { requestId, status } = dto;
  
  const friendship = await friendRepo.getFriendshipById(requestId);
  if (!friendship) throw new Error('Friend request not found');

  // Use Number() casting for robust comparison (DB IDs might be strings)
  if (Number(friendship.addresseeId) !== Number(userId)) {
    throw new Error('Not authorized to respond to this request');
  }

  if (friendship.status !== 'pending') {
    throw new Error('Request is not pending');
  }

  const updated = await friendRepo.updateFriendshipStatus(requestId, status);
  
  // Real-time notification if accepted
  if (status === 'accepted') {
    try {
      const io = getIo();
      if (io) {
        const accepter = await getUserBasic(userId);
        
        io.to(`notifications:user:${friendship.requesterId}`).emit('friend:accepted', {
           friendshipId: friendship.id,
           accepter: {
             id: accepter.id,
             displayName: accepter.display_name,
             handle: accepter.handle,
             avatarUrl: accepter.avatar_url
           },
           updatedAt: updated.updatedAt
        });
      }
    } catch (err) {
      console.error('Failed to emit socket event:', err);
    }

    // Persist notification
    try {
      await notificationService.createFriendAcceptedNotification({
          friendshipId: friendship.id,
          actorUserId: userId,
          targetUserId: friendship.requesterId
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  // Real-time notification if rejected
  if (status === 'rejected') {
     try {
      const io = getIo();
      if (io) {
        const rejecter = await getUserBasic(userId);
        
        io.to(`notifications:user:${friendship.requesterId}`).emit('friend:rejected', {
           friendshipId: friendship.id,
           rejecter: {
             id: rejecter.id,
             displayName: rejecter.display_name,
             handle: rejecter.handle,
             avatarUrl: rejecter.avatar_url
           },
           updatedAt: updated.updatedAt
        });
      }
    } catch (err) {
      console.error('Failed to emit socket event:', err);
    }

    // Persist notification
    try {
      await notificationService.createFriendRejectedNotification({
          friendshipId: friendship.id,
          actorUserId: userId,
          targetUserId: friendship.requesterId
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  return updated;
}

export async function getFriends(userId: number) {
  return await friendRepo.listFriends(userId);
}

export async function getPendingRequests(userId: number) {
  return await friendRepo.listPendingRequests(userId);
}

export async function searchNewUsers(userId: number, query: string) {
  return await friendRepo.searchUsers(userId, query);
}

export async function checkAreFriends(user1Id: number, user2Id: number): Promise<boolean> {
  const friendship = await friendRepo.getFriendship(user1Id, user2Id);
  return friendship?.status === 'accepted';
}
