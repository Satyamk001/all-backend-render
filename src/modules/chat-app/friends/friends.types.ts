export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendUser {
  id: number;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  friendshipId: number;
  status: FriendshipStatus;
  isRequester: boolean; // true if the current user sent the request
}

export interface CreateFriendRequestDto {
  targetUserId: number;
}

export interface RespondFriendRequestDto {
  requestId: number;
  status: 'accepted' | 'rejected';
}
