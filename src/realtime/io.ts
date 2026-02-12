import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { getCachedUser, updateUserLastOnline } from '../modules/chat-app/users/user.service.js';
import { createDirectMessage, markMessagesAsDelivered, markMessagesAsRead } from '../modules/chat-app/chat/chat.service.js';
import { env } from '../config/env.js';
import { registerTopicRoomHandlers } from '../modules/topic-rooms/topic-rooms.handler.js';

let io: Server | null = null;

const onlineUsers = new Map<number, Set<string>>();

function addOnlineUser(rawUserId: unknown, socketId: string) {
  const userId = Number(rawUserId);
  if (!Number.isFinite(userId) || userId <= 0) return;

  const existing = onlineUsers.get(userId);

  if (existing) {
    existing.add(socketId);
  } else {
    onlineUsers.set(userId, new Set([socketId]));
  }
}

function removeOnlineUser(rawUserId: unknown, socketId: string) {
  const userId = Number(rawUserId);
  if (!Number.isFinite(userId) || userId <= 0) return;

  const existing = onlineUsers.get(userId);

  if (!existing) return;

  existing.delete(socketId);

  if (existing.size === 0) {
    onlineUsers.delete(userId);
  }
}

function getOnlineUserIds(): number[] {
  return Array.from(onlineUsers.keys());
}

function broadcasePresence() {
  io?.emit('presence:update', {
    onlineUserIds: getOnlineUserIds()
  });
}

export function initIo(httpServer: HttpServer) {
  if (io) return io; //safeguard -> only create once;

  io = new Server(httpServer, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:5173'],
      credentials: true
    }
  });

  io.on('connection', async socket => {
    console.log(`[io connection]------> ${socket.id}`);

    try {
      const clerkUserId = socket.handshake.auth?.userId;

      if (!clerkUserId || typeof clerkUserId !== 'string') {
        console.log(`[Missing clerk user id]------> ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      const profile = await getCachedUser(clerkUserId);
      const rawLocalUserId = profile.user.id;
      const localUserId = Number(rawLocalUserId);
      const displayName = profile.user.displayName ?? null;
      const handle = profile.user.handle ?? null;

      if (!Number.isFinite(localUserId) || localUserId <= 0) {
        console.log(`[Invalid user id]------> ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      (socket.data as {
        userId: number;
        displayName: string | null;
        handle: string | null;
      }) = {
        userId: localUserId,
        displayName,
        handle
      };

      //  Join noti room

      const notiRoom = `notifications:user:${localUserId}`;
      socket.join(notiRoom);

      // join DM room (create room)
      const dmRoom = `dm:user:${localUserId}`;
      socket.join(dmRoom);

      socket.on('dm:send', async (payload: unknown) => {
        try {
          const data = payload as {
            recipientUserId?: number;
            body?: string;
            imageUrl?: string;
          };

          const senderUserId = (socket.data as { userId?: number }).userId;
          if (!senderUserId) return;

          const recipientUserId = Number(data?.recipientUserId);
          if (!Number.isFinite(recipientUserId) || recipientUserId <= 0) {
            return;
          }

          //NO self DM
          if (senderUserId === recipientUserId) {
            return;
          }

          console.log(`dm:send`, senderUserId, recipientUserId);

          const message = await createDirectMessage({
            senderUserId,
            recipientUserId,
            body: data?.body ?? '',
            imageUrl: data?.imageUrl ?? null
          });

          // Check if recipient is online
          const isRecipientOnline = onlineUsers.has(recipientUserId);
          if (isRecipientOnline) {
             // Mark as delivered immediately
             await markMessagesAsDelivered(senderUserId, recipientUserId);
             message.status = 'delivered'; // Update object to send back to client
          }

          const senderRoom = `dm:user:${senderUserId}`;
          const recipientRoom = `dm:user:${recipientUserId}`;

          io?.to(senderRoom).to(recipientRoom).emit('dm:message', message);
        } catch (err: any) {
          console.error(err);
          const senderUserId = (socket.data as { userId?: number }).userId;
          if (senderUserId) {
             socket.emit('dm:error', { error: err.message || 'Failed to send message' });
          }
        }
      });

      socket.on('dm:read', async (payload: unknown) => {
        try {
           const data = payload as { messageIds: number[]; senderUserId: number };
           const { messageIds, senderUserId } = data;
           
           if (!Array.isArray(messageIds) || messageIds.length === 0) return;
           
           const readerUserId = (socket.data as { userId?: number }).userId;
           if (!readerUserId) return;

           await markMessagesAsRead(messageIds, readerUserId);
           
           // Notify the ORIGINAL sender that their messages were read
           const senderRoom = `dm:user:${senderUserId}`;
           io?.to(senderRoom).emit('dm:status_update', {
             messageIds,
             status: 'read',
             conversationId: readerUserId // The reader is the conversation partner
           });
           
        } catch (err) {
          console.error('Error handling read receipt:', err);
        }
      });

      socket.on('dm:typing', (payload: unknown) => {
        const data = payload as {
          recipientUserId?: number;
          isTyping?: boolean;
        };

        const senderUserId = (socket.data as { userId?: number }).userId;
        if (!senderUserId) return;

        const recipientUserId = Number(data?.recipientUserId);
        if (!Number.isFinite(recipientUserId) || recipientUserId <= 0) {
          return;
        }

        const recipientRoom = `dm:user:${recipientUserId}`;

        io?.to(recipientRoom).emit('dm:typing', {
          senderUserId,
          recipientRoom,
          isTyping: !!data?.isTyping
        });
      });

      addOnlineUser(localUserId, socket.id);
      broadcasePresence();

      // Register Topic Rooms handlers
      if (io) {
        registerTopicRoomHandlers(io, socket);
      }

      // Signal to client that setup is complete and handlers are ready
      socket.emit('ready', { userId: localUserId });

      socket.on('disconnect', async () => {
        console.log(`[io disconnect]------> ${socket.id}`);
        removeOnlineUser(localUserId, socket.id);
        broadcasePresence();
        
        // Update last online timestamp logic
        // Only update if no other sockets are connected for this user
        if (!onlineUsers.has(localUserId)) {
           try {
             await updateUserLastOnline(localUserId);
           } catch (err) {
             console.error('Failed to update last online:', err);
           }
        }
      });
    } catch (err) {
      console.log(`[Error while socket connection]------> ${err}`);
      socket.disconnect(true);
    }
  });
}

export function getIo() {
  return io;
}

// | What you want | Use |
// | -------------------- | ------------------------- |
// | Only this user | `socket.emit()` |
// | All users | `io.emit()` |
// | All except this user | `socket.broadcast.emit()` |
// | One room | `io.to(room).emit()` |
// | Room except sender | `socket.to(room).emit()` |
