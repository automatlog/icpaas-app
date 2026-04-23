import {
  DLR_STATUS,
  extractWhatsAppStatusEvents,
  normalizeDlrStatus,
  verifyWebhookChallenge,
} from './whatsappDlr';

describe('whatsappDlr', () => {
  it('normalizes WhatsApp delivery statuses', () => {
    expect(normalizeDlrStatus('queued')).toBe(DLR_STATUS.SENT);
    expect(normalizeDlrStatus('delivered')).toBe(DLR_STATUS.DELIVERED);
    expect(normalizeDlrStatus('read')).toBe(DLR_STATUS.READ);
    expect(normalizeDlrStatus('failed')).toBe(DLR_STATUS.FAIL);
    expect(normalizeDlrStatus('unexpected')).toBe(DLR_STATUS.UNKNOWN);
  });

  it('extracts status events from a Meta webhook payload', () => {
    const events = extractWhatsAppStatusEvents({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wamid.123',
                    recipient_id: '919428587817',
                    status: 'delivered',
                    timestamp: '1776753853',
                    biz_opaque_callback_data: 'callback-1',
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(events).toEqual([
      {
        messageId: 'wamid.123',
        recipientId: '919428587817',
        callbackData: 'callback-1',
        normalizedStatus: 'DELIVERED',
        status: 'Delivered',
        rawStatus: 'delivered',
        timestampMs: 1776753853000,
        timestamp: '2026-04-21T06:44:13.000Z',
        errorCode: null,
        errorMessage: null,
        raw: {
          id: 'wamid.123',
          recipient_id: '919428587817',
          status: 'delivered',
          timestamp: '1776753853',
          biz_opaque_callback_data: 'callback-1',
        },
      },
    ]);
  });

  it('verifies webhook challenge requests', () => {
    expect(verifyWebhookChallenge({
      hub_mode: 'subscribe',
      hub_challenge: 'abc',
      hub_verify_token: 'secret',
    }, 'secret')).toEqual({
      ok: true,
      statusCode: 200,
      body: 'abc',
    });

    expect(verifyWebhookChallenge({
      hub_mode: 'subscribe',
      hub_challenge: 'abc',
      hub_verify_token: 'wrong',
    }, 'secret')).toEqual({
      ok: false,
      statusCode: 403,
      body: 'Invalid verify token',
    });
  });
});
