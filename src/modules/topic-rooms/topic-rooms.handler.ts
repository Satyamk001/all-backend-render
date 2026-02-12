import { Server, Socket } from 'socket.io';
import * as roomService from './room.service.js';

export function registerTopicRoomHandlers(io: Server, socket: Socket) {
  const userId = (socket.data as any).userId;
  console.log(`[TopicRooms] Registering handlers for User ${userId}`);

  socket.on('room:join', async (roomId: number) => {
    console.log(`[TopicRooms] User ${userId} joining room ${roomId}`);
    try {
      if (!roomId) return;
      
      // Verify room access
      await roomService.joinRoom(roomId, userId);
      
      const roomChannel = `room:${roomId}`;
      socket.join(roomChannel);
      
      // Notify active count update? Optional but good for UI
      const count = await roomService.getRoom(roomId).then(r => r?.participantCount || 0);
      io.to(roomChannel).emit('room:participant_update', { roomId, count });
      
      console.log(`[TopicRooms] User ${userId} joined room ${roomId} success`);
    } catch (err: any) {
      console.error(`[TopicRooms] Join Error:`, err);
      socket.emit('room:error', { message: err.message || 'Failed to join room' });
    }
  });

  socket.on('room:leave', async (roomId: number) => {
    try {
      console.log(`[TopicRooms] User ${userId} leaving room ${roomId}`);
      const roomChannel = `room:${roomId}`;
      socket.leave(roomChannel);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('room:message', async (payload: { roomId: number; content: string }) => {
    console.log(`[TopicRooms] Message from ${userId} in ${payload.roomId}: ${payload.content}`);
    try {
      const { roomId, content } = payload;
      if (!roomId || !content) return;

      const message = await roomService.createRoomMessage(roomId as any, userId, content);
      
      io.to(`room:${roomId}`).emit('room:message', message);
    } catch (err: any) {
      console.error(`[TopicRooms] Message Error:`, err);
      socket.emit('room:error', { message: err.message || 'Failed to send message' });
    }
  });
}
