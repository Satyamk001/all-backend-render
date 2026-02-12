import * as roomRepo from './room.repository.js';
import { CreateRoomDto } from './room.types.js';

export async function createRoom(userId: number, dto: CreateRoomDto) {
  return await roomRepo.createRoom(userId, dto);
}

export async function listRooms(category?: string, search?: string) {
  return await roomRepo.listActiveRooms(category, search);
}

export async function getRoom(roomId: number) {
  const room = await roomRepo.getRoomById(roomId);
  if (!room) return null;
  
  const participantCount = await roomRepo.getRoomParticipantCount(roomId);
  return { ...room, participantCount };
}

export async function joinRoom(roomId: number, userId: number) {
  const room = await roomRepo.getRoomById(roomId);
  if (!room) throw new Error('Room not found or expired');
  
  const count = await roomRepo.getRoomParticipantCount(roomId);
  if (count >= room.maxUsers) throw new Error('Room is full');
  
  await roomRepo.joinRoom(roomId, userId);
  return room;
}

export async function getMessages(roomId: number) {
  return await roomRepo.getRoomMessages(roomId);
}

export async function createRoomMessage(roomId: number, userId: number, content: string) {
  return await roomRepo.createRoomMessage(roomId, userId, content);
}
