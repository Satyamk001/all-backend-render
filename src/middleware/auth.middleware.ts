import { Response, Request, NextFunction } from 'express';
import { getAuth } from '../config/clerk.js';
import { UnauthorizedError } from '../lib/errors.js';
import { getUserFromClerk } from '../modules/chat-app/users/user.service.js';

export async function resolveUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      throw new UnauthorizedError('You must be signed in');
    }

    const profile = await getUserFromClerk(auth.userId);
    (req as any).user = profile.user;
    next();
  } catch (err) {
    next(err);
  }
}
