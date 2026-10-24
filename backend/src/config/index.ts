import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'https://lumotrack.lumo.co.tz',
  jwtSecret: process.env.JWT_SECRET as string,
  databaseUrl: process.env.DATABASE_URL as string,
  smsApiKey: process.env.MESEJI_API_KEY || process.env.SMS_PROVIDER_API_KEY || 'zs_f6ae2a4a1f321d11b1a3e296f377f070bacae5a212b456fd',
  snippe: {
    apiKey: process.env.SNIPPE_API_KEY || 'snp_e8d1cd22910f400d4b5cb3d7222bde781e18dc4896dba9f40a1f61a550735a44',
    apiUrl: process.env.SNIPPE_API_URL || 'https://api.snippe.sh',
    webhookSecret: process.env.SNIPPE_WEBHOOK_SECRET || 'whsec_b11c34170f637399848a7c7602f0da453cc1ac1704364dfb1',
  },
  adminAlertPhones: [
    process.env.ADMIN_ALERT_PHONE_1 || '0768828247',
    process.env.ADMIN_ALERT_PHONE_2 || '0711788830',
  ],
};
