import { Router, Request, Response } from 'express';
import { recordAnalyticsEvent } from '../services/trafficAnalyticsService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

/**
 * POST /api/track
 * Public endpoint (no auth required) for recording page views and visitor events.
 * Called by the frontend PageTracker component on every navigation.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      eventType,
      sessionId,
      visitorId,
      page,
      referrer,
      deviceType,
      browser,
      os,
    } = req.body;

    if (!eventType || !page) {
      return sendError(res, 'VALIDATION_ERROR', 'eventType and page are required', 400);
    }

    // Extract IP from request (supports proxied environments like Nginx)
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    await recordAnalyticsEvent({
      eventType: eventType || 'PAGE_VIEW',
      sessionId: sessionId || undefined,
      anonymousVisitorId: visitorId || undefined,
      page,
      referrer: referrer || (req.headers['referer'] as string) || undefined,
      deviceType: deviceType || undefined,
      browser: browser || undefined,
      operatingSystem: os || undefined,
      ipAddress: ip,
    });

    return sendSuccess(res, { tracked: true });
  } catch (err: any) {
    // Tracking failures must never break the user experience
    console.error('[TRACK ERROR]', err.message);
    return sendSuccess(res, { tracked: false });
  }
});

export default router;
