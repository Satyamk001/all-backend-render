export interface TopicRoom {
  id: number;
  title: string;
  category: string;
  creatorId: number;
  maxUsers: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface RoomParticipant {
  roomId: number;
  userId: number;
  joinedAt: Date;
  socketId: string | null;
}

export interface RoomMessage {
  id: number;
  roomId: number;
  userId: number;
  content: string;
  createdAt: Date;
  sender?: {
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface CreateRoomDto {
  title: string;
  category: string;
  durationMinutes: number;
  maxUsers?: number;
}
