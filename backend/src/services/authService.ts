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
  email?: string | null;
  location?: string | null;
  password: string;
  pin?: string | null;
}) {
  const existingUser = await prisma.merchantUser.findFirst({
    where: {
      OR: [
        { phone: data.business_phone },
        ...(data.email ? [{ email: data.email }] : []),
      ],
    },
    include: { merchant: true },
  });

  if (existingUser && existingUser.status === 'ACTIVE' && existingUser.password_hash) {
    throw new Error('A user account with this phone number or email already exists.');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : null;

  let merchant;
  let user;

  if (existingUser) {
    // Upgrade pending user & merchant to ACTIVE
    merchant = await prisma.merchant.update({
      where: { id: existingUser.merchant_id },
      data: {
        business_name: data.business_name,
        business_phone: data.business_phone,
        email: data.email || null,
        location: data.location || null,
        status: 'ACTIVE',
      },
    });

    user = await prisma.merchantUser.update({
      where: { id: existingUser.id },
      data: {
        name: data.name,
        email: data.email || null,
        password_hash: passwordHash,
        pin_hash: pinHash,
        status: 'ACTIVE',
        otp_code: null,
        otp_expires_at: null,
      },
    });
  } else {
    // Transactionally create Merchant + MerchantUser
    merchant = await prisma.merchant.create({
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
    user = merchant.users[0];
  }
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

  // If user does not exist yet, create a pending merchant account awaiting OTP verification
  if (!user) {
    const merchant = await prisma.merchant.create({
      data: {
        business_name: 'Pending Workspace',
        business_phone: cleanPhone,
        status: 'INACTIVE',
        users: {
          create: {
            name: 'Pending Merchant User',
            phone: cleanPhone,
            role: 'MERCHANT',
            status: 'PENDING_VERIFICATION',
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

  if (!smsResult.success) {
    console.error(`[OTP SMS FAILED] Phone: ${cleanPhone} | Error: ${smsResult.error}`);
    throw new Error(smsResult.error || 'Failed to deliver OTP SMS. Please try again later.');
  }

  return {
    message: 'OTP sent successfully',
    smsSent: true,
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

  if (user.status === 'SUSPENDED' || user.merchant.status === 'SUSPENDED' || user.merchant.status === 'ARCHIVED') {
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

export async function resetPin(phone: string, otp: string, newPin: string) {
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

  if (new Date() > user.otp_expires_at) {
    throw new Error('OTP has expired. Please request a new code.');
  }

  const isValidOtp = await bcrypt.compare(otp, user.otp_code);
  if (!isValidOtp) {
    throw new Error('Invalid OTP verification code.');
  }

  const pinHash = await bcrypt.hash(newPin, 10);
  await prisma.merchantUser.update({
    where: { id: user.id },
    data: {
      pin_hash: pinHash,
      otp_code: null,
      otp_expires_at: null,
    },
  });

  return { message: 'PIN passcode updated successfully! You can now log in with your new PIN.' };
}

export async function checkPhoneExists(phone: string) {
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

  if (!user) {
    throw new Error('The phone number inserted is not registered in our system.');
  }

  return {
    registered: true,
    phone: user.phone,
    name: user.name,
    business_name: user.merchant?.business_name || 'LUMO Merchant',
  };
}

export async function resetPassword(data: { phone: string; otp: string; new_password?: string; new_pin?: string | null }) {
  const cleanPhone = data.phone.trim();
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

  if (new Date() > user.otp_expires_at) {
    throw new Error('OTP code has expired. Please request a new code.');
  }

  const isValidOtp = await bcrypt.compare(data.otp, user.otp_code);
  if (!isValidOtp) {
    throw new Error('Invalid OTP verification code. Please check the 6-digit code received via SMS.');
  }

  const updateData: any = {
    otp_code: null,
    otp_expires_at: null,
  };

  if (data.new_password) {
    updateData.password_hash = await bcrypt.hash(data.new_password, 10);
  }

  if (data.new_pin) {
    updateData.pin_hash = await bcrypt.hash(data.new_pin, 10);
  }

  await prisma.merchantUser.update({
    where: { id: user.id },
    data: updateData,
  });

  return {
    message: 'Your account credentials have been updated successfully! You can now log in with your new password.',
  };
}

export async function verifyPin(phone: string, pin: string) {
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

  if (!user) {
    throw new Error('User profile not found for this phone number.');
  }

  if (user.status !== 'ACTIVE' || user.merchant.status !== 'ACTIVE') {
    throw new Error('Account is inactive or suspended.');
  }

  if (!user.pin_hash) {
    // If user has no PIN set yet, auto-initialize with whatever 4-digit PIN they enter (e.g. 2323, 1234)
    if (pin && pin.length === 4 && /^\d{4}$/.test(pin)) {
      const pinHash = await bcrypt.hash(pin, 10);
      await prisma.merchantUser.update({
        where: { id: user.id },
        data: { pin_hash: pinHash },
      });
      console.log(`[PIN AUTO-SET] Profile ${user.phone} initialized PIN.`);
    } else {
      throw new Error('Please enter a valid 4-digit numeric PIN passcode.');
    }
  } else {
    const isValidPin = await bcrypt.compare(pin, user.pin_hash);
    if (!isValidPin) {
      throw new Error('Invalid PIN passcode. Please check your 4-digit PIN.');
    }
  }

  const token = jwt.sign({ userId: user.id, merchantId: user.merchant_id, role: user.role }, config.jwtSecret, {
    expiresIn: '7d',
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: user.merchant_id,
      user_id: user.id,
      action: 'USER_LOGIN_PIN',
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

export async function verifyPassword(identifier: string, password: string) {
  const cleanId = identifier.trim();
  const normalized = cleanId.startsWith('0') ? '255' + cleanId.substring(1) : cleanId;

  const user = await prisma.merchantUser.findFirst({
    where: {
      OR: [
        { phone: cleanId },
        { phone: normalized },
        { email: cleanId },
      ],
    },
    include: { merchant: true },
  });

  if (!user || !user.password_hash) {
    throw new Error('Invalid credentials. Check your phone/email and password.');
  }

  if (user.status !== 'ACTIVE' || user.merchant.status !== 'ACTIVE') {
    throw new Error('Account is inactive or suspended.');
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials. Check your phone/email and password.');
  }

  const token = jwt.sign({ userId: user.id, merchantId: user.merchant_id, role: user.role }, config.jwtSecret, {
    expiresIn: '7d',
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: user.merchant_id,
      user_id: user.id,
      action: 'USER_LOGIN_PASSWORD',
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

export async function getOperators() {
  const users = await prisma.merchantUser.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      avatar_url: true,
      merchant: {
        select: {
          business_name: true,
        },
      },
    },
    take: 10,
  });

  if (users.length === 0) {
    return [
      { id: 'agent-1', name: 'agent-1', phone: '0627204980', role: 'MERCHANT' },
      { id: 'agent-2', name: 'agent-2', phone: '0712345678', role: 'STAFF' },
    ];
  }

  return users.map((u: any) => ({
    id: u.id,
    name: u.name || u.phone,
    phone: u.phone,
    role: u.role,
    business_name: u.merchant?.business_name || 'LUMO Merchant',
    avatar_url: u.avatar_url,
  }));
}

