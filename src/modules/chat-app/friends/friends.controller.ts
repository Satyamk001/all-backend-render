import { Router, Request, Response } from 'express';
import { requireAuthApi } from '../../../config/clerk.js';
import { resolveUser } from '../../../middleware/auth.middleware.js';
import * as friendService from './friends.service.js';

const router = Router();

// Send Request
router.post('/request', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await friendService.sendFriendRequest(userId, req.body);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Respond Request
router.post('/respond', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await friendService.respondToFriendRequest(userId, req.body);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List Requests
router.get('/requests', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await friendService.getPendingRequests(userId);
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List Friends
router.get('/', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await friendService.getFriends(userId);
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search Users
router.get('/search', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const query = (req.query.q as string) || '';
    // if (!query) return res.json({ data: [] }); // ALLOW empty query for suggestions
    
    const result = await friendService.searchNewUsers(userId, query);
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const friendRouter = router;
