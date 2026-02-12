import { Router, Request, Response } from 'express';
import * as roomService from './room.service.js';
import { requireAuthApi, getAuth } from '../../config/clerk.js';
import { getUserFromClerk } from '../chat-app/users/user.service.js';

const router = Router();

// Middleware to get internal user ID
const resolveUser = async (req: Request, res: Response, next: Function) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const profile = await getUserFromClerk(auth.userId);
    (req as any).user = profile.user; // Attach internal user object
    next();
  } catch (err) {
    console.error('Auth User Resolution Error:', err);
    res.status(500).json({ error: 'Failed to resolve user' });
  }
};

// List Rooms
router.get('/', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const rooms = await roomService.listRooms(category as string, search as string);
    res.json({ data: rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

// Create Room
router.post('/', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const { title, category, durationMinutes, maxUsers } = req.body;
    const userId = (req as any).user.id;
    
    if (!title || !category || !durationMinutes) {
      return res.status(400).json({ error: 'Missing required fields' }); 
    }
    
    const room = await roomService.createRoom(userId, { title, category, durationMinutes, maxUsers });
    res.status(201).json({ data: room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get Room
router.get('/:id', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ data: room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Join Room (HTTP check, socket handles real-time)
router.post('/:id/join', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    const userId = (req as any).user.id;
    
    await roomService.joinRoom(roomId, userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to join room' });
  }
});

// Get Messages
router.get('/:id/messages', requireAuthApi, resolveUser, async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    const messages = await roomService.getMessages(roomId);
    res.json({ data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
