// schema DB vs that we r going to expose to api

export type UserRow = {
  id: number;
  clerk_user_id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
  last_online_at: Date | null;
};

export type User = {
  id: number;
  clerkUserId: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastOnlineAt: Date | null;
};

export type UserProfile = {
  user: User;
  clerkEmail: string | null;
  clerkFullName: string | null;
};

export type UserProfileResponse = {
  id: number;
  clerkUserId: string;
  displayName: string | null;
  email: string | null;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
  lastOnlineAt: Date | null;
};

export function toUserProfileResponse(profile: UserProfile): UserProfileResponse {
  const { user, clerkEmail, clerkFullName } = profile;

  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: clerkEmail ?? null,
    displayName: user.displayName ?? clerkFullName ?? null,
    handle: user.handle ?? null,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    lastOnlineAt: user.lastOnlineAt ?? null
  };
}
