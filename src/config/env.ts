import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('5000'),
  DB_HOST: z.string(),
  DB_PORT: z.string().default('6450'),
  DB_NAME: z.string().default('realtime_chat_and_threads_app'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  DB_URL: z.string(),
  FRONTEND_URL: z.string().transform(url => url.trim().replace(/\/$/, '')),
  PORTFOLIO_FRONTEND_URL: z.string().transform(url => url.trim().replace(/\/$/, '')),
  EMAIL: z.string(),
  PASSWORD: z.string(),
  RESEND_API_KEY: z.string()
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  process.exit(1);
}

export const env = parsed.data;
