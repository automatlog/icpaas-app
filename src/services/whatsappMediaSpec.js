// src/services/whatsappMediaSpec.js — Meta WhatsApp Cloud API media constraints
// Source: developers.facebook.com/docs/whatsapp/cloud-api/reference/media
//
// Type      Formats                              Max size
// Image     JPG, JPEG, PNG                       5 MB
// Video     MP4, 3GPP                            16 MB
// Audio     AAC, MP3, AMR, OGG, OPUS             16 MB
// Document  PDF, DOC(X), PPT(X), XLS(X), TXT     100 MB
// Sticker   WEBP static / animated               100 KB / 500 KB

export const MEDIA_KINDS = {
  image:    { label: 'Image',    mimes: ['image/jpeg', 'image/jpg', 'image/png'],                                                                                       maxBytes: 5  * 1024 * 1024,  exts: ['jpg', 'jpeg', 'png'] },
  video:    { label: 'Video',    mimes: ['video/mp4', 'video/3gpp'],                                                                                                    maxBytes: 16 * 1024 * 1024,  exts: ['mp4', '3gp', '3gpp'] },
  audio:    { label: 'Audio',    mimes: ['audio/aac', 'audio/mp3', 'audio/mpeg', 'audio/amr', 'audio/ogg', 'audio/opus'],                                              maxBytes: 16 * 1024 * 1024,  exts: ['aac', 'mp3', 'amr', 'ogg', 'opus'] },
  document: { label: 'Document',
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
    maxBytes: 100 * 1024 * 1024,
    exts: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'] },
  sticker:  { label: 'Sticker',  mimes: ['image/webp'],                                                                                                                 maxBytes: 100 * 1024,         exts: ['webp'] }, // static; animated capped at 500KB checked below
};

export const STICKER_ANIMATED_MAX = 500 * 1024;

// Map a file's mimeType + filename to a kind, or null if unsupported.
export const detectKind = ({ mimeType, name }) => {
  const mime = String(mimeType || '').toLowerCase();
  const ext = String(name || '').split('.').pop().toLowerCase();

  for (const [kind, spec] of Object.entries(MEDIA_KINDS)) {
    if (spec.mimes.includes(mime)) return kind;
    if (spec.exts.includes(ext))   return kind;
  }
  return null;
};

// Returns null if valid, or { reason } when invalid.
export const validateForWhatsApp = ({ mimeType, name, size }) => {
  const kind = detectKind({ mimeType, name });
  if (!kind) {
    return { reason: 'Unsupported file type. Allowed: image (JPG/PNG), video (MP4/3GPP), audio (AAC/MP3/AMR/OGG/OPUS), document (PDF/DOC/PPT/XLS/TXT), or sticker (WEBP).' };
  }
  const spec = MEDIA_KINDS[kind];
  const maxBytes = spec.maxBytes;
  if (typeof size === 'number' && size > maxBytes) {
    return { reason: `${spec.label} files must be ≤ ${formatBytes(maxBytes)}. Yours is ${formatBytes(size)}.` };
  }
  return { kind, mime: mimeType || spec.mimes[0] };
};

export const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || !isFinite(bytes)) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024)        return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

// All supported MIME types for the document picker (flattened union)
export const ALL_MIMES = Object.values(MEDIA_KINDS).flatMap((s) => s.mimes);
