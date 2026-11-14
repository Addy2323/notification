import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import * as confirmationReceiptController from '../controllers/confirmationReceiptController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', orderController.createOrder);
router.get('/', orderController.listOrders);
router.get('/metrics', orderController.getOrderMetrics);
router.get('/:id', orderController.getOrderDetail);
router.patch('/:id', orderController.editOrder);
router.delete('/:id', orderController.deleteOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id/payment', orderController.updateOrderPaymentStatus);
router.post('/:id/refund', orderController.refundOrder);
router.post('/:id/assign-driver', orderController.assignDriver);
router.post('/:id/notifications/:notificationId/retry', orderController.retryNotification);

// Confirmation Receipt & PDF endpoints
router.get('/:id/receipt', confirmationReceiptController.getOrderReceipt);
router.post('/:id/receipt/generate', confirmationReceiptController.generateOrderReceipt);
router.get('/:id/receipt/pdf', confirmationReceiptController.downloadOrderReceiptPdf);
router.post('/:id/receipt/resend-sms', confirmationReceiptController.resendOrderReceiptSms);
router.post('/:id/receipt/revoke', confirmationReceiptController.revokeOrderReceipt);

export default router;
