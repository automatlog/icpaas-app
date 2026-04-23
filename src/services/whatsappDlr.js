export const DLR_STATUS = Object.freeze({
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN',
});

const DISPLAY_STATUS = Object.freeze({
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAIL: 'Failed',
  UNKNOWN: 'Unknown',
});

export const normalizeDlrStatus = (rawStatus) => {
  const value = (rawStatus || '').toString().trim().toLowerCase();

  if (['sent', 'accepted', 'queued'].includes(value)) return DLR_STATUS.SENT;
  if (value === 'delivered') return DLR_STATUS.DELIVERED;
  if (value === 'read') return DLR_STATUS.READ;
  if (['failed', 'fail', 'undelivered', 'error'].includes(value)) return DLR_STATUS.FAIL;
  return DLR_STATUS.UNKNOWN;
};

export const toDisplayStatus = (status) => DISPLAY_STATUS[status] || DISPLAY_STATUS.UNKNOWN;

const cleanString = (value) => (value === null || value === undefined ? null : String(value).trim());

const parseTimestampMs = (rawTimestamp) => {
  const parsed = Number(rawTimestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return Date.now();
  return parsed > 1e12 ? parsed : parsed * 1000;
};

export const extractWhatsAppStatusEvents = (payload = {}) => {
  const events = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  entries.forEach((entry) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    changes.forEach((change) => {
      const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
      statuses.forEach((status) => {
        const rawStatus = cleanString(status?.status) || '';
        const normalizedStatus = normalizeDlrStatus(rawStatus);
        const timestampMs = parseTimestampMs(status?.timestamp);
        const firstError = status?.errors?.[0] || null;

        events.push({
          messageId: cleanString(status?.id),
          recipientId: cleanString(status?.recipient_id),
          callbackData: cleanString(status?.biz_opaque_callback_data),
          normalizedStatus,
          status: toDisplayStatus(normalizedStatus),
          rawStatus,
          timestampMs,
          timestamp: new Date(timestampMs).toISOString(),
          errorCode: firstError?.code || null,
          errorMessage: firstError?.message || null,
          raw: status || null,
        });
      });
    });
  });

  return events;
};

export const verifyWebhookChallenge = (query = {}, verifyToken = '') => {
  const getValue = (key) => {
    if (typeof query.get === 'function') return query.get(key) || '';
    return query[key] || query[key.replace(/\./g, '_')] || '';
  };

  const mode = getValue('hub.mode');
  const challenge = getValue('hub.challenge');
  const token = getValue('hub.verify_token');

  if (!challenge) return { ok: false, statusCode: 400, body: 'Missing hub.challenge' };
  if (mode !== 'subscribe') return { ok: false, statusCode: 400, body: 'Invalid hub.mode' };
  if (verifyToken && token !== verifyToken) return { ok: false, statusCode: 403, body: 'Invalid verify token' };
  return { ok: true, statusCode: 200, body: challenge };
};
