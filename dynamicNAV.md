# Sending Sales Invoice PDFs via WhatsApp from Dynamics NAV / Business Central

This document mirrors the existing `SendInvoiceViaEmail(DocNo)` C/AL function and adds a parallel
`SendInvoiceViaWhatsApp(DocNo)` that delivers the **same signed PDF** through the WhatsApp
Cloud API (wrapped by Greens MS at `wbbox.greensms.in`).

```
Endpoint host : https://wbbox.greensms.in
Phone number id: 951210344748495
API version    : v23.0
Bearer token   : 2d69d2fd-bfe3-47e5-9d5c-dcab0d36cc42
```

> Treat the bearer token like a password. Move it to a setup table (`WhatsApp Setup`) or the
> `Web Service Aggregator Setup` — do not leave it inline in code that ships to production.

---

## 1. Data fields available inside `SendInvoiceViaEmail`

These are the values the function already has in scope by the time the email is built, so the
WhatsApp version can reuse the same locals without extra reads. Use any of them as template
variables.

| Field (C/AL expression) | Meaning | Suggested template var |
|---|---|---|
| `SalesInvoiceHeader."No."` | Posted invoice number | `{{2}}` |
| `SalesInvoiceHeader."Posting Date"` | Invoice date | `{{3}}` |
| `SalesInvoiceHeader."Order No."` | Sales order no (direct) | feeds `OrderNo` |
| `OrderNo` (resolved local) | Final order no — direct or walked through `Sales Shipment Header` | `{{4}}` |
| `SalesInvoiceHeader."Amount to Customer"` (after `CALCFIELDS`) | Total invoice amount | `{{5}}` |
| `SalesInvoiceHeader."Bill-to Customer No."` | Customer key | (lookup) |
| `Cust.Name` | Customer display name | `{{1}}` |
| `Cust."E-Mail"` | Recipient email (existing) | n/a |
| `Cust."Phone No."` / `Cust."Mobile Phone No."` | Recipient WhatsApp number | `to` |
| `SalesInvoiceHeader."Shipping Agent Code"` | Transporter code | (lookup) |
| `Transporter."Phone No."` → `TransporterPhNo` | Transporter contact | `{{6}}` |
| `COMPANYNAME` | Sender company | `{{7}}` and chooses the PDF folder |
| `SalesInvoiceLine."Shipment No."` | Shipment(s) on the invoice | feeds `OrderNo` |
| `SalesShipmentHeader."Order No."` | Source sales order from the shipment | feeds `OrderNo` |
| `UserSetup` (when `UserSetup.GET(USERID)`) | User-level overrides | optional sender mapping |
| Local PDF path (built per company) | Signed PDF on disk | uploaded as media |

The signed PDF path is the same one the email attaches:

- `Charu Overseas Pvt. Ltd.` → `C:\Users\Public\Downloads\CHARU INVOICE OUT\<No.>_SIGNED.pdf`
- `NEOTERIC COMPOUNDS` → `C:\Users\Public\Downloads\NEOTERIC INVOICE OUT\<No.>_SIGNED.pdf`

---

## 2. Recommended WhatsApp template (one-time setup)

Create this once in WhatsApp Manager (or via the `POST /{wabaId}/message_templates` endpoint).
Approval typically takes a few minutes for `UTILITY` category.

```
Name      : invoice_dispatched
Language  : en
Category  : UTILITY
Header    : DOCUMENT (the signed invoice PDF)
Body      :
  Dear {{1}},

  Please find attached your invoice *{{2}}* dated *{{3}}*.
  Your material has been dispatched against sales order *{{4}}*.
  Total amount: INR {{5}}.
  For tracking, contact the transporter at *{{6}}*.

  Request you to confirm receipt by replying to this message.
  The shipment will be deemed delivered in full and good condition
  if no communication is received within 72 hours of the E-Way Bill.

Footer    : Thank you, {{7}}
```

Sample values for the seven body variables (mirrors the email body):

| Slot | Sample |
|---|---|
| `{{1}}` | `Vibhor Agrawal` |
| `{{2}}` | `SI/26-27/00012` |
| `{{3}}` | `28-04-2026` |
| `{{4}}` | `SO/26-27/00045` |
| `{{5}}` | `1,28,450.00` |
| `{{6}}` | `+91 98290 12345` |
| `{{7}}` | `Charu Overseas Pvt. Ltd.` |

---

## 3. New function — `SendInvoiceViaWhatsApp(DocNo)`

Drop this next to `SendInvoiceViaEmail` in the same codeunit. The body intentionally repeats the
order-no resolution and transporter lookup so it works standalone (call it from a page action,
from the email function after `SMTPMail.Send`, or both).

```cal
SendInvoiceViaWhatsApp(DocNo : Code[60])
SalesInvoiceHeader.RESET;
SalesInvoiceHeader.SETFILTER("No.",'%1',DocNo);
IF NOT SalesInvoiceHeader.FINDFIRST THEN EXIT;

SalesInvoiceHeader.CALCFIELDS("Amount to Customer");

// --- 1. resolve order no (same logic as email) -----------------------------
IF SalesInvoiceHeader."Order No." <> '' THEN
   OrderNo := SalesInvoiceHeader."Order No."
ELSE BEGIN
   SalesInvoiceLine.RESET;
   SalesInvoiceLine.SETFILTER("Document No.",'%1',SalesInvoiceHeader."No.");
   SalesInvoiceLine.SETFILTER("Shipment No.",'<>%1','');
   IF SalesInvoiceLine.FINDFIRST THEN BEGIN
      REPEAT
         SalesShipmentHeader.SETFILTER("No.",'%1',SalesInvoiceLine."Shipment No.");
         IF SalesShipmentHeader.FINDFIRST THEN
            REPEAT
               OrderNo := SalesShipmentHeader."Order No.";
            UNTIL SalesShipmentHeader.NEXT = 0;
      UNTIL SalesInvoiceLine.NEXT = 0;
   END;
END;

// --- 2. transporter phone --------------------------------------------------
TransporterPhNo := '';
Transporter.RESET;
Transporter.SETFILTER("No.",'%1',SalesInvoiceHeader."Shipping Agent Code");
IF Transporter.FINDFIRST THEN
   TransporterPhNo := Transporter."Phone No.";

// --- 3. customer phone (E.164 without '+') --------------------------------
IF NOT Cust.GET(SalesInvoiceHeader."Bill-to Customer No.") THEN EXIT;
RecipientPhone := NormalizePhoneE164(Cust."Phone No.");
IF RecipientPhone = '' THEN
   RecipientPhone := NormalizePhoneE164(Cust."Mobile Phone No.");
IF RecipientPhone = '' THEN
   ERROR('No phone number found for customer %1.', Cust."No.");

// --- 4. resolve signed PDF path -------------------------------------------
IF COMPANYNAME = 'Charu Overseas Pvt. Ltd.' THEN
   PdfPath := 'C:\Users\Public\Downloads\CHARU INVOICE OUT\' + SalesInvoiceHeader."No." + '_SIGNED.pdf'
ELSE IF COMPANYNAME = 'NEOTERIC COMPOUNDS' THEN
   PdfPath := 'C:\Users\Public\Downloads\NEOTERIC INVOICE OUT\' + SalesInvoiceHeader."No." + '_SIGNED.pdf'
ELSE
   ERROR('No PDF folder mapping for company %1.', COMPANYNAME);

PdfFileName := SalesInvoiceHeader."No." + '_SIGNED.pdf';

// --- 5. upload media to WhatsApp ------------------------------------------
MediaId := UploadPdfToWhatsAppMedia(PdfPath, PdfFileName);
IF MediaId = '' THEN
   ERROR('WhatsApp media upload failed for invoice %1.', SalesInvoiceHeader."No.");

// --- 6. build the send-template request -----------------------------------
AmountText := FORMAT(SalesInvoiceHeader."Amount to Customer", 0,
                    '<Precision,2:2><Standard Format,0>');
DateText   := FORMAT(SalesInvoiceHeader."Posting Date", 0, '<Day,2>-<Month,2>-<Year4>');

Body := '{' +
   '"messaging_product":"whatsapp",' +
   '"recipient_type":"individual",' +
   '"to":"' + RecipientPhone + '",' +
   '"type":"template",' +
   '"template":{' +
      '"name":"invoice_dispatched",' +
      '"language":{"code":"en"},' +
      '"components":[' +
         '{"type":"header","parameters":[' +
            '{"type":"document","document":{' +
               '"id":"' + MediaId + '",' +
               '"filename":"' + PdfFileName + '"}}]},' +
         '{"type":"body","parameters":[' +
            '{"type":"text","text":"' + JsonEscape(Cust.Name)         + '"},' +
            '{"type":"text","text":"' + JsonEscape(SalesInvoiceHeader."No.") + '"},' +
            '{"type":"text","text":"' + JsonEscape(DateText)          + '"},' +
            '{"type":"text","text":"' + JsonEscape(OrderNo)           + '"},' +
            '{"type":"text","text":"' + AmountText                    + '"},' +
            '{"type":"text","text":"' + JsonEscape(TransporterPhNo)   + '"},' +
            '{"type":"text","text":"' + JsonEscape(COMPANYNAME)       + '"}]}]}}';

// --- 7. POST /messages -----------------------------------------------------
CLEAR(WaClient);
CLEAR(WaReq);
WaContent.WriteFrom(Body);
WaContent.GetHeaders(WaHeaders);
WaHeaders.Remove('Content-Type');
WaHeaders.Add('Content-Type','application/json');
WaReq.SetRequestUri('https://wbbox.greensms.in/v23.0/951210344748495/messages');
WaReq.Method := 'POST';
WaReq.Content := WaContent;
WaReq.GetHeaders(WaHeaders);
WaHeaders.Add('Authorization','Bearer 2d69d2fd-bfe3-47e5-9d5c-dcab0d36cc42');

IF NOT WaClient.Send(WaReq, WaResp) THEN
   ERROR('WhatsApp send failed (transport).');
WaResp.Content.ReadAs(RespText);
IF NOT WaResp.IsSuccessStatusCode THEN
   ERROR('WhatsApp send failed: %1\n%2', WaResp.HttpStatusCode, RespText);

MESSAGE('WhatsApp invoice sent to %1.', RecipientPhone);
```

### Variables to declare on the function

| Name | Type | Subtype |
|---|---|---|
| `SalesInvoiceHeader` | Record | Sales Invoice Header |
| `SalesInvoiceLine` | Record | Sales Invoice Line |
| `SalesShipmentHeader` | Record | Sales Shipment Header |
| `Cust` | Record | Customer |
| `Transporter` | Record | Shipping Agent |
| `OrderNo` | Code[20] | |
| `TransporterPhNo` | Text[30] | |
| `RecipientPhone` | Text[20] | |
| `PdfPath` / `PdfFileName` | Text[250] / Text[100] | |
| `MediaId` / `Body` / `RespText` / `AmountText` / `DateText` | Text | |
| `WaClient` | HttpClient | |
| `WaReq` | HttpRequestMessage | |
| `WaResp` | HttpResponseMessage | |
| `WaHeaders` | HttpHeaders | |
| `WaContent` | HttpContent | |

> NAV 2018+ / BC have the built-in `HttpClient` family. On NAV 2017 or older replace
> them with `DotNet System.Net.Http.HttpClient` and `MultipartFormDataContent`.

---

## 4. Helper — `UploadPdfToWhatsAppMedia(PdfPath; FileName) : Text`

Multipart upload to `POST /{phoneNumberId}/media`. Returns the media `id` on success, empty
string on failure.

```cal
UploadPdfToWhatsAppMedia(PdfPath : Text; FileName : Text) : Text
TempBlob.Init;
TempBlob.Blob.CREATEOUTSTREAM(MultipartOut);

Boundary := '----NAVBoundary' + DELCHR(FORMAT(CREATEGUID),'=','{}-');
CRLF := FORMAT(13) + FORMAT(10); // not literal — use Char.NewLine helper if you have one

WriteLine(MultipartOut, '--' + Boundary);
WriteLine(MultipartOut, 'Content-Disposition: form-data; name="messaging_product"');
WriteLine(MultipartOut, '');
WriteLine(MultipartOut, 'whatsapp');

WriteLine(MultipartOut, '--' + Boundary);
WriteLine(MultipartOut, 'Content-Disposition: form-data; name="type"');
WriteLine(MultipartOut, '');
WriteLine(MultipartOut, 'application/pdf');

WriteLine(MultipartOut, '--' + Boundary);
WriteLine(MultipartOut, 'Content-Disposition: form-data; name="file"; filename="' + FileName + '"');
WriteLine(MultipartOut, 'Content-Type: application/pdf');
WriteLine(MultipartOut, '');

// stream the PDF bytes in
FileMgt.BLOBImportFromServerFile(FileBlob, PdfPath);
FileBlob.CreateInStream(FileIn);
COPYSTREAM(MultipartOut, FileIn);

WriteLine(MultipartOut, '');
WriteLine(MultipartOut, '--' + Boundary + '--');

TempBlob.Blob.CREATEINSTREAM(MultipartIn);
WaContent.WriteFrom(MultipartIn);
WaContent.GetHeaders(WaHeaders);
WaHeaders.Remove('Content-Type');
WaHeaders.Add('Content-Type','multipart/form-data; boundary=' + Boundary);

WaReq.SetRequestUri('https://wbbox.greensms.in/v23.0/951210344748495/media');
WaReq.Method := 'POST';
WaReq.Content := WaContent;
WaReq.GetHeaders(WaHeaders);
WaHeaders.Add('Authorization','Bearer 2d69d2fd-bfe3-47e5-9d5c-dcab0d36cc42');

IF NOT WaClient.Send(WaReq, WaResp) THEN
   EXIT('');
WaResp.Content.ReadAs(RespText);
IF NOT WaResp.IsSuccessStatusCode THEN
   EXIT('');

// parse {"id":"<media-id>"}
RespJson.ReadFrom(RespText);
IF RespJson.AsObject.Get('id', JTok) THEN
   EXIT(JTok.AsValue.AsText);
EXIT('');
```

Variables for the helper: `TempBlob` (Codeunit "Temp Blob"), `FileBlob` (Codeunit "Temp Blob"
or Record), `FileMgt` (Codeunit "File Management"), `MultipartIn`/`MultipartOut`/`FileIn`
(InStream/OutStream), `Boundary`/`CRLF`/`RespText` (Text), `RespJson` (JsonToken),
`JTok` (JsonToken), plus the same `Wa*` set as above.

> Sample response on success: `{"messaging_product":"whatsapp","id":"2171225710283963"}`.
> The id is then used in step 6 of the main function as the `header.parameters[0].document.id`.

---

## 5. Helper — `NormalizePhoneE164(Phone) : Text`

Strips spaces, dashes, parentheses and the leading `+`, then prepends India country code if the
number is 10 digits.

```cal
NormalizePhoneE164(Phone : Text) : Text
Phone := DELCHR(Phone, '=', ' -()+_/'); // keep digits only
IF Phone = '' THEN
   EXIT('');
IF STRLEN(Phone) = 10 THEN
   Phone := '91' + Phone;
EXIT(Phone);
```

Adjust the `91` prefix logic if you ship to non-India numbers — read the country code from
`Cust."Country/Region Code"` and look up the dial code from a setup table.

---

## 6. Helper — `JsonEscape(S) : Text`

Avoids breaking the JSON body when names or codes contain `"`, `\` or newlines.

```cal
JsonEscape(S : Text) : Text
S := S.Replace('\','\\');
S := S.Replace('"','\"');
S := S.Replace(FORMAT(13),' ');
S := S.Replace(FORMAT(10),' ');
EXIT(S);
```

---

## 7. Wiring it up

Two common ways to trigger the new function:

**(a) Send WhatsApp **after** the email** — append two lines to `SendInvoiceViaEmail`, just
before `MESSAGE('Email Send!!')`:

```cal
IF Cust."Phone No." <> '' THEN
   SendInvoiceViaWhatsApp(SalesInvoiceHeader."No.");
```

**(b) New page action on Posted Sales Invoice** — add an action `&WhatsApp` that calls
`SendInvoiceViaWhatsApp(Rec."No.")`. This lets the user resend by hand without re-emailing.

---

## 8. Edge cases & gotchas

- **24-hour window** — free-form messages can only be sent within 24h of the customer's last
  inbound message. Templates (like `invoice_dispatched`) do **not** have that limit, which is
  why this implementation uses a template message instead of a free-form document.
- **Phone format** — WhatsApp wants E.164 *without* the leading `+`. The normalizer above
  produces `9198290XXXXX`. If `Cust."Phone No."` is blank the function falls back to
  `Cust."Mobile Phone No."`.
- **PDF must exist before send** — the email function calls `REPORT.SAVEASPDF` against the
  *unsigned* path (`CHARU INVOICE IN`), then attaches the *signed* one (`CHARU INVOICE OUT`).
  WhatsApp also needs the *signed* PDF, so call `SendInvoiceViaWhatsApp` only after the signing
  pipeline has produced the `_SIGNED.pdf` file.
- **Failures should not mask the email** — if you call WhatsApp from inside the email function,
  catch errors via a `Codeunit.Run` wrapper so a WhatsApp outage doesn't roll back the email
  send.
- **Token in source** — the token shown here (`2d69d2fd-...`) is for testing. In production,
  read it from a `WhatsApp Setup` table keyed by company so each tenant uses its own.
- **Greens MS wrapper vs Meta direct** — the host `wbbox.greensms.in` proxies the Meta Cloud
  API, so the JSON shapes and endpoints (`/v23.0/{phoneNumberId}/messages`,
  `/v23.0/{phoneNumberId}/media`) are identical to Meta's documented contracts. If you ever
  switch to direct Meta, only the host changes.
- **HSN / Place of Supply etc.** — if you also want them in the body, add them to the template
  and pass extra `body.parameters` entries. They're already on `SalesInvoiceHeader`
  (`Cust.Name`, `"Bill-to Country/Region Code"`, etc.).

---

## 9. Quick test (curl) — verify the template + token before wiring NAV

Before running C/AL, sanity-check the credentials and the template name with curl:

```bash
curl --location --globoff 'https://wbbox.greensms.in/v23.0/951210344748495/messages' \
  --header 'Authorization: Bearer 2d69d2fd-bfe3-47e5-9d5c-dcab0d36cc42' \
  --header 'Content-Type: application/json' \
  --data '{
    "messaging_product": "whatsapp",
    "to": "91XXXXXXXXXX",
    "type": "template",
    "template": {
      "name": "invoice_dispatched",
      "language": { "code": "en" },
      "components": [
        { "type": "header",
          "parameters": [
            { "type": "document",
              "document": { "id": "<MEDIA_ID>", "filename": "test_SIGNED.pdf" } } ] },
        { "type": "body",
          "parameters": [
            { "type": "text", "text": "Vibhor Agrawal" },
            { "type": "text", "text": "SI/26-27/00012" },
            { "type": "text", "text": "28-04-2026" },
            { "type": "text", "text": "SO/26-27/00045" },
            { "type": "text", "text": "1,28,450.00" },
            { "type": "text", "text": "+91 98290 12345" },
            { "type": "text", "text": "Charu Overseas Pvt. Ltd." } ] }
      ]
    }
  }'
```

Upload media first to get the `<MEDIA_ID>`:

```bash
curl --location --globoff --request POST \
  'https://wbbox.greensms.in/v23.0/951210344748495/media' \
  --header 'Authorization: Bearer 2d69d2fd-bfe3-47e5-9d5c-dcab0d36cc42' \
  --form 'file=@C:\Users\Public\Downloads\CHARU INVOICE OUT\SI_TEST_SIGNED.pdf' \
  --form 'type=application/pdf' \
  --form 'messaging_product=whatsapp'
```

A successful response looks like `{"messaging_product":"whatsapp","id":"2171225710283963"}`.
Once both calls work end-to-end with curl, the C/AL implementation will work too — it makes
the exact same HTTP requests.
