import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { dispatchOrderEvent } from '../notifications/orderNotificationEngine';
import { config } from '../config';

async function testSendRatingSms() {
  const targetPhone = '0768828247';
  console.log(`\n🚀 Preparing test ORDER_DELIVERED notification for: ${targetPhone}...`);

  try {
    // 1. Get or create a merchant
    let merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          business_name: 'LUMO Direct Store',
          business_phone: '0700000000',
          email: 'test@lumo.co.tz',
        },
      });
    }

    // 2. Generate unique rating token
    const ratingToken = crypto.randomUUID();
    const ratingUrl = `${config.frontendUrl}/rate/${ratingToken}`;

    // 3. Create test order
    const orderNumber = `LUMO-${Math.floor(1000 + Math.random() * 9000)}`;
    const order = await prisma.order.create({
      data: {
        merchant_id: merchant.id,
        order_number: orderNumber,
        customer_name: 'Test Customer',
        customer_phone: targetPhone,
        product_name: 'LUMO Test Delivery Item',
        delivery_address: 'Dar es Salaam, Tanzania',
        status: 'DELIVERED',
        delivered_at: new Date(),
        rating_token: ratingToken,
      } as any,
    });

    console.log(`✅ Test Order Created: #${order.order_number}`);
    console.log(`⭐ Generated Rating Token: ${ratingToken}`);
    console.log(`🔗 Rating Link: ${ratingUrl}`);

    // 4. Dispatch ORDER_DELIVERED event
    console.log(`\n📲 Dispatching SMS to ${targetPhone}...`);
    await dispatchOrderEvent({
      orderId: order.id,
      eventType: 'ORDER_DELIVERED',
      customerPhone: targetPhone,
      vars: {
        merchantName: merchant.business_name,
        customerName: order.customer_name,
        customerPhone: targetPhone,
        orderNumber: order.order_number,
        orderStatus: 'DELIVERED',
        deliveryAddress: order.delivery_address,
        ratingUrl: ratingUrl,
        trackingUrl: `${config.frontendUrl}/track/${order.tracking_token || 'test'}`,
        driverName: 'Driver',
        driverPhone: '0700000000',
        driverUrl: `${config.frontendUrl}/driver/test`,
      },
    });

    // Wait 2.5 seconds for background async dispatch to complete
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // 5. Query created notification record
    const notification = await prisma.orderNotification.findFirst({
      where: { order_id: order.id },
      orderBy: { created_at: 'desc' },
    });

    console.log('\n==================================================');
    console.log('📬 SMS DISPATCH RESULT SUMMARY');
    console.log('==================================================');
    if (notification) {
      console.log(`Status          : ${notification.status}`);
      console.log(`Recipient Phone : ${notification.recipient_phone}`);
      console.log(`Message Content :\n"${notification.message_body}"`);
      if (notification.failure_reason) {
        console.log(`Failure Reason  : ${notification.failure_reason}`);
      }
    } else {
      console.log('⚠️ No notification record found.');
    }
    console.log('==================================================\n');
  } catch (err: any) {
    console.error('❌ Error executing test script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testSendRatingSms();
