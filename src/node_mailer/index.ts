import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = new Resend(env.RESEND_API_KEY);

const sendMail = async ({ from, subject, text }: { from: string; subject: string; text: string }) => {
  try {
    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to: env.EMAIL,
      subject: `New message from ${subject}`,
      text: `Email: ${from}\n\nMessage:\n${text}`
    });

    return { success: true };
  } catch (error) {
    console.error('Mail error:', error);
    return { success: false, error };
  }
};

export default sendMail;
