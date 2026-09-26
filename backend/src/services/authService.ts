import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { generateSecureToken } from '../utils/token';
import { notificationService } from '../notifications/adapter';

export async function registerMerchant(data: {
  business_name: string;
  business_phone: string;
  name: string;
  email?: string;
  location?: string;
  password: string;
  pin?: string;
}) {
  const existingUser = await prisma.merchantUser.findFirst({
    where: {
      OR: [
        { phone: data.business_phone },
        ...(data.email ? [{ email: data.email }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new Error('A user account with this phone number or email already exists.');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : null;

  // Transactionally create Merchant + MerchantUser
  const merchant = await prisma.merchant.create({
    data: {
      business_name: data.business_name,
      business_phone: data.business_phone,
      email: data.email || null,
      location: data.location || null,
      status: 'ACTIVE',
      users: {
        create: {
          name: data.name,
          phone: data.business_phone,
          email: data.email || null,
          role: 'MERCHANT',
          password_hash: passwordHash,
          pin_hash: pinHash,
          status: 'ACTIVE',
        },
      },
    },
    include: {
      users: true,
    },
  });

  const user = merchant.users[0];
  const token = jwt.sign({ userId: user.id, merchantId: merchant.id, role: user.role }, config.jwtSecret, {
    expiresIn: '7d',
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      merchant_id: merchant.id,
      user_id: user.id,
      action: 'MERCHANT_REGISTERED',
      object_type: 'MERCHANT',
      object_id: merchant.id,
      metadata: JSON.stringify({ business_name: merchant.business_name }),
    },
  });

  // Welcome SMS
  try {
    await notificationService['adapter'].sendSMS(
      data.business_phone,
      `Welcome to LUMO! Your business ${data.business_name} has been successfully registered to the Delivery Tracking Platform.`
    );
  } catch (err) {
    console.error('[Welcome SMS Failed]', err);
  }

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
    merchant: {
      id: merchant.id,
      business_name: merchant.business_name,
      business_phone: merchant.business_phone,
      logo_url: merchant.logo_url,
      brand_color: merchant.brand_color,
    },
  };
}

export async function requestOtp(phone: string) {
  const cleanPhone = phone.trim();
  const normalized = cleanPhone.startsWith('0') ? '255' + cleanPhone.substring(1) : cleanPhone;
  const local = cleanPhone.startsWith('255') ? '0' + cleanPhone.substring(3) : cleanPhone;

  let user = await prisma.merchantUser.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        { phone: normalized },
        { phone: local },
        { phone: `+${normalized}` },
      ],
    },
  });

  // If user does not exist yet, auto-create a default merchant account for smooth onboarding
  if (!user) {
    const merchant = await prisma.merchant.create({
      data: {
        business_name: 'Merchant Workspace',
        business_phone: cleanPhone,
        status: 'ACTIVE',
        users: {
          create: {
            name: 'Merchant User',
            phone: cleanPhone,
            role: 'MERCHANT',
            status: 'ACTIVE',
          },
        },
      },
      include: { users: true },
    });
    user = merchant.users[0];
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  
  // Set expiration to 10 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  await prisma.merchantUser.update({
    where: { id: user.id },
    data: {
      otp_code: otpHash,
      otp_expires_at: expiresAt,
    },
  });

  console.log(`[OTP GENERATED] Phone: ${cleanPhone} (${normalized}) | Code: ${otp}`);

  // Send OTP via SMS
  const smsResult = await notificationService['adapter'].sendSMS(
    cleanPhone,
    `Your LUMO verification code is: ${otp}. Valid for 10 minutes.`
  );

  return {
    message: 'OTP sent successfully',
    smsSent: smsResult.success,
  };
}

export async function verifyOtp(phone: string, otp: string) {
  const cleanPhone = phone.trim();
  const normalized = cleanPhone.startsWith('0') ? '255' + cleanPhone.substring(1) : cleanPhone;
  const local = cleanPhone.startsWith('255') ? '0' + cleanPhone.substring(3) : cleanPhone;

  const user = await prisma.merchantUser.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        { phone: normalized },
        { phone: local },
        { phone: `+${normalized}` },
      ],
    },
    include: { merchant: true },
  });

  if (!user || !user.otp_code || !user.otp_expires_at) {
    throw new Error('No OTP requested or OTP has expired.');
  }

  // Check if OTP expired
  if (new Date() > user.otp_expires_at) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  const isValidOtp = await bcrypt.compare(otp, user.otp_code);
  if (!isValidOtp) {
    throw new Error('Invalid OTP. Please try again.');
  }

  if (user.status !== 'ACTIVE' || user.merchant.status !== 'ACTIVE') {
    throw new Error('Account is inactive or suspended.');
  }

  // Clear OTP
  await prisma.merchantUser.update({
    where: { id: user.id },
    data: {
      otp_code: null,
      otp_expires_at: null,
    },
  });

  const token = jwt.sign({ userId: user.id, merchantId: user.merchant_id, role: user.role }, config.jwtSecret, {
    expiresIn: '7d',
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      merchant_id: user.merchant_id,
      user_id: user.id,
      action: 'USER_LOGIN_OTP',
      object_type: 'USER',
      object_id: user.id,
    },
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
    merchant: {
      id: user.merchant.id,
      business_name: user.merchant.business_name,
      business_phone: user.merchant.business_phone,
      logo_url: user.merchant.logo_url,
      brand_color: user.merchant.brand_color,
      whatsapp_number: user.merchant.whatsapp_number,
    },
  };
}
