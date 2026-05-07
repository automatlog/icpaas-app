# WhatsApp Cloud API — payload reference

> Examples for sending every message type the API supports, plus the media upload endpoint, written against the channel below. Replace the placeholders before using.
>
> Sources: [Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages/), [Messages reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/), [Media reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media/), [Interactive Reply Buttons](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages/), [Interactive List](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages/), [Document messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages/).

## Channel under test

```json
{
  "wabaNumber":     "15557307460",
  "phoneNumberId":  "959117713945251",
  "wabaBusinessId": "843773431908059"
}
```

## Common pattern

Every send is a `POST` to `/v24.0/{phoneNumberId}/messages` with a Bearer token:

```bash
POST https://graph.facebook.com/v24.0/959117713945251/messages
Authorization: Bearer ${ACCESS_TOKEN}
Content-Type: application/json
```

Every body has the same envelope; only the `type` and matching content key change:

```json
{
  "messaging_product": "whatsapp",
  "recipient_type":    "individual",
  "to":   "919428587817",
  "type": "<text|image|video|audio|document|sticker|location|contacts|interactive|template|reaction>",
  "<type>": { ... }
}
```

Successful response (Meta returns this for every type):

```json
{
  "messaging_product": "whatsapp",
  "contacts": [ { "input": "919428587817", "wa_id": "919428587817" } ],
  "messages": [ { "id": "wamid.HBgM…", "message_status": "accepted" } ]
}
```

`messages[0].id` is the `wamid.*` you correlate with later `statuses` webhooks (`sent` → `delivered` → `read`/`failed`).

---

## 1. Text

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Hi"
  }
}
```

`preview_url: true` makes WhatsApp render an OG-style link card for the first URL in the body.

---

## 2. Image

By **link** (Meta caches the URL for 10 min):

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "image",
  "image": {
    "link": "https://cdn.example.com/promo/spring-sale.jpg",
    "caption": "Spring sale — 30% off everything."
  }
}
```

By **media id** (after `/media` upload — see §11):

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "image",
  "image": {
    "id": "1234567890123456",
    "caption": "Spring sale — 30% off everything."
  }
}
```

Limits: JPEG / PNG, up to **5 MB**.

---

## 3. Video

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "video",
  "video": {
    "link": "https://cdn.example.com/clips/demo.mp4",
    "caption": "60-second product walkthrough."
  }
}
```

Limits: MP4 / 3GPP, up to **16 MB**. Use `id` instead of `link` for uploaded media.

---

## 4. Audio

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "audio",
  "audio": {
    "link": "https://cdn.example.com/voice/note.mp3"
  }
}
```

Audio messages do **not** support captions. Limits: AAC / MP4 / AMR / MP3 / OGG (Opus), up to **16 MB**.

---

## 5. Document

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "document",
  "document": {
    "link": "https://cdn.example.com/invoices/INV-1042.pdf",
    "filename": "Invoice INV-1042.pdf",
    "caption": "Invoice for your March order."
  }
}
```

Limits: PDF / DOC(X) / XLS(X) / PPT(X) / TXT, up to **100 MB**. The `filename` is what the recipient sees and saves to disk.

---

## 6. Sticker

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "sticker",
  "sticker": {
    "link": "https://cdn.example.com/stickers/thanks.webp"
  }
}
```

Stickers must be **WebP**. Static ≤ 100 KB, animated ≤ 500 KB.

---

## 7. Location

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "location",
  "location": {
    "latitude":  19.0760,
    "longitude": 72.8777,
    "name":      "Gateway of India",
    "address":   "Apollo Bandar, Colaba, Mumbai, Maharashtra 400001"
  }
}
```

`name` and `address` render under the map pin; both optional but strongly recommended.

---

## 8. Contacts (vCard-equivalent)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "contacts",
  "contacts": [
    {
      "name": {
        "formatted_name": "Aman Yadav",
        "first_name": "Aman",
        "last_name": "Yadav"
      },
      "phones": [
        { "phone": "+919428587817", "type": "MOBILE", "wa_id": "919428587817" }
      ],
      "emails": [
        { "email": "aman@example.com", "type": "WORK" }
      ],
      "org": { "company": "ICPAAS", "title": "Engineer" }
    }
  ]
}
```

You can send multiple contacts in a single message — just push more entries into the array.

---

## 9. Interactive — Reply Buttons (up to 3)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "Order #1042"
    },
    "body":   { "text": "Your order ships tomorrow. What would you like to do?" },
    "footer": { "text": "Reply within 24 h" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "TRACK_1042",  "title": "Track order"   } },
        { "type": "reply", "reply": { "id": "CHANGE_1042", "title": "Change address" } },
        { "type": "reply", "reply": { "id": "CANCEL_1042", "title": "Cancel"        } }
      ]
    }
  }
}
```

`header` can also be `image` / `video` / `document` (with the same `link`/`id` shape as §2–§5). Button `id` comes back to your webhook in `messages[0].interactive.button_reply.id` when tapped.

## 10. Interactive — List (up to 10 sections × 10 rows)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Pick a service" },
    "body":   { "text": "Tell us what you'd like help with today." },
    "footer": { "text": "Powered by ICPAAS" },
    "action": {
      "button": "Choose",
      "sections": [
        {
          "title": "Sales",
          "rows": [
            { "id": "SALES_PRICING", "title": "Pricing & plans",   "description": "See per-channel rates" },
            { "id": "SALES_DEMO",    "title": "Book a demo",        "description": "30 min walkthrough"   }
          ]
        },
        {
          "title": "Support",
          "rows": [
            { "id": "SUP_TECH",  "title": "Technical issue", "description": "API, webhooks, SDKs" },
            { "id": "SUP_BILL",  "title": "Billing question" }
          ]
        }
      ]
    }
  }
}
```

Tapped row arrives at your webhook as `interactive.list_reply.id`.

---

## 11. Template (Meta-approved)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "template",
  "template": {
    "name": "order_shipped",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "image", "image": { "link": "https://cdn.example.com/orders/1042.jpg" } }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Aman" },
          { "type": "text", "text": "1042"  },
          { "type": "text", "text": "BLR-DEL-9821" }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [ { "type": "text", "text": "1042" } ]
      }
    ]
  }
}
```

The only message type allowed **outside** the 24-hour customer-service window. `name` + `language.code` must match a template Meta has already approved for this WABA.

---

## 12. Reaction (emoji on a previous message)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "type": "reaction",
  "reaction": {
    "message_id": "wamid.HBgMOTE5NDI4NTg3ODE3FQIAEhgUM0E5RTk2QkE1QkY5OEM2RTk0QjAA",
    "emoji": "👍"
  }
}
```

Send `"emoji": ""` (empty string) to **remove** an existing reaction.

---

## 13. Reply / quote context (works on any type)

Add a `context` block alongside `type` — works for text, media, interactive, template, etc.:

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919428587817",
  "context": {
    "message_id": "wamid.HBgM…the-message-being-replied-to"
  },
  "type": "text",
  "text": { "body": "Yes — confirmed for Friday." }
}
```

---

## 14. Media upload — `POST /v24.0/{phoneNumberId}/media`

When you don't have a public URL for the file (e.g. agent attaches from device), upload to Meta first and use the returned `id`:

```bash
curl -X POST "https://graph.facebook.com/v24.0/959117713945251/media" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "messaging_product=whatsapp" \
  -F "type=image/jpeg" \
  -F "file=@/local/path/photo.jpg;type=image/jpeg"
```

Response:

```json
{ "id": "1234567890123456" }
```

Meta keeps the upload **90 days**. Plug the `id` into any of §2–§6 above (`{ "image": { "id": "1234..." } }` etc.).

---

## 15. Status webhooks (what comes back later)

For every send you make, Meta will POST a `statuses[*]` entry to your webhook URL — one per status transition:

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id":        "wamid.HBgM…",
          "status":    "sent | delivered | read | failed",
          "timestamp": "1717000000",
          "pricing":   { "billable": true, "category": "service" },
          "errors":    [ /* present only when status = failed */ ]
        }]
      }
    }]
  }]
}
```

Match by `id` to the `wamid.*` you stored from the send response.

---

## 16. Quick error catalogue

| Code | Meaning |
|---|---|
| `131009` | Parameter value not valid (often a malformed `to` number) |
| `131026` | Receiver is incapable of receiving message (no WhatsApp account, blocked) |
| `131047` | Re-engagement message — outside 24 h window, sent free-form instead of template |
| `131051` | Unsupported message type |
| `132000` | Generic Meta-side parameter mismatch |

Full list: [Cloud API Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/).

---

## Notes for icpaas-app integration

If you eventually go the **direct-to-Meta** route from mobile (skipping the OmniApp `UserLiveChat/SendChatMessage` 302 problem), each send becomes:

1. `LiveChatAPI.getChannelConfig(wabaNumber)` → returns `{ phoneNumberId, accessToken }` (this endpoint **must be scoped to the authenticated user's owned channels** — see Part 1 of the chat answer).
2. `axios.post('https://graph.facebook.com/v24.0/' + phoneNumberId + '/messages', body, { headers: { Authorization: 'Bearer ' + accessToken }})`.
3. On `messages[0].id` → write that wamid into the optimistic row's `MessageId` so subsequent webhook-driven `DeliveryStatusUpdate` events correlate cleanly.

Caveat: the `accessToken` would then live in the device's RAM during the send. For long-lived tokens that's still risky vs the proxy pattern (mobile → OmniApp REST → Meta), where the token never leaves the server.

---

## Sources

- [Cloud API — Send Messages guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages/)
- [Messages API reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/)
- [Media reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media/)
- [Document messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages/)
- [Interactive Reply Buttons](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages/)
- [Interactive List Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages/)
- [Service messages overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)
- [WhatsApp Business Phone Number — Message API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api)
- [Media Upload API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/media-upload-api)
