"""Generate WhatsApp API Complete Setup Documentation PDF."""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted,
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime

PRIMARY = colors.HexColor("#128C7E")        # WhatsApp green
ACCENT = colors.HexColor("#25D366")
DARK = colors.HexColor("#1F2937")
MID = colors.HexColor("#4B5563")
LIGHT = colors.HexColor("#E5E7EB")
HEADER_BG = colors.HexColor("#DCFCE7")
CODE_BG = colors.HexColor("#F3F4F6")
NOTE_BG = colors.HexColor("#FEF3C7")
CREATE_BG = colors.HexColor("#ECFDF5")
SEND_BG = colors.HexColor("#EFF6FF")


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._states = []

    def showPage(self):
        self._states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._states)
        for state in self._states:
            self.__dict__.update(state)
            self._draw_footer(total)
            super().showPage()
        super().save()

    def _draw_footer(self, total):
        self.setStrokeColor(LIGHT)
        self.setLineWidth(0.5)
        self.line(0.75 * inch, 0.55 * inch, 7.75 * inch, 0.55 * inch)
        self.setFont("Helvetica", 8)
        self.setFillColor(MID)
        self.drawString(0.75 * inch, 0.4 * inch, "WhatsApp API - Complete Setup Documentation v2.0")
        self.drawRightString(7.75 * inch, 0.4 * inch, f"Page {self._pageNumber} of {total}")


styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Heading1"], fontSize=30, textColor=PRIMARY,
    alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=18,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontSize=15, textColor=DARK,
    alignment=TA_CENTER, spaceAfter=8,
)
meta_style = ParagraphStyle(
    "Meta", parent=styles["Normal"], fontSize=10, textColor=MID,
    alignment=TA_CENTER, fontName="Helvetica-Oblique",
)
h1 = ParagraphStyle(
    "H1", parent=styles["Heading1"], fontSize=20, textColor=PRIMARY,
    fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=10, keepWithNext=True,
)
h2 = ParagraphStyle(
    "H2", parent=styles["Heading2"], fontSize=14, textColor=DARK,
    fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=8, keepWithNext=True,
)
h3 = ParagraphStyle(
    "H3", parent=styles["Heading3"], fontSize=11.5, textColor=MID,
    fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=6, keepWithNext=True,
)
body = ParagraphStyle(
    "Body", parent=styles["Normal"], fontSize=10, textColor=DARK,
    leading=14, alignment=TA_JUSTIFY, spaceAfter=8,
)
note = ParagraphStyle(
    "Note", parent=styles["Normal"], fontSize=9, textColor=MID,
    fontName="Helvetica-Oblique", leftIndent=14, spaceAfter=8,
)
def _code_style(bg):
    return ParagraphStyle(
        f"Code_{bg.hexval()}", parent=styles["Code"], fontName="Courier", fontSize=8.2,
        textColor=DARK, leading=11,
        leftIndent=8, rightIndent=8,
        spaceBefore=6, spaceAfter=10,
        backColor=bg, borderColor=LIGHT, borderWidth=0.6,
        borderPadding=(8, 8, 8, 8),
    )


def code_block(code: str, bg=CODE_BG):
    """Render a fixed-width code block that splits across pages if needed."""
    return Preformatted(code, _code_style(bg))


def info_table(rows):
    tbl = Table(rows, colWidths=[1.6 * inch, 4.9 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, -1), DARK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Courier"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, LIGHT),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def callout(text, bg=NOTE_BG):
    p = Paragraph(text, ParagraphStyle("callout", parent=body, fontSize=9, textColor=DARK))
    tbl = Table([[p]], colWidths=[6.5 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


story = []

# ---------- COVER ----------
story.append(Spacer(1, 1.6 * inch))
story.append(Paragraph("WhatsApp API", title_style))
story.append(Paragraph("Complete Setup Documentation", subtitle_style))
story.append(Spacer(1, 0.15 * inch))
story.append(Paragraph("Version 2.0 &mdash; Enhanced Edition with Template Creation", meta_style))
story.append(Spacer(1, 0.8 * inch))

cover_box = Table(
    [[Paragraph(
        "<b>What's inside</b><br/><br/>"
        "&bull; API key setup &amp; authentication<br/>"
        "&bull; Create templates with TEXT, IMAGE, VIDEO, DOCUMENT, LOCATION headers<br/>"
        "&bull; Interactive buttons: Quick Reply, URL, Phone, Copy Code<br/>"
        "&bull; Carousel and Flow templates<br/>"
        "&bull; Send templates with every header type, carousel cards, and flows<br/>"
        "&bull; Conversation API: free-form text, image, document, video, audio, replies<br/>"
        "&bull; Webhook configuration for inbound events<br/>"
        "&bull; Template lifecycle: Get, Get by ID, Edit, Delete<br/>"
        "&bull; Channel management &amp; additional APIs (wallet, media)",
        body,
    )]],
    colWidths=[5.5 * inch],
)
cover_box.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CREATE_BG),
    ("BOX", (0, 0), (-1, -1), 0.8, ACCENT),
    ("LEFTPADDING", (0, 0), (-1, -1), 18),
    ("RIGHTPADDING", (0, 0), (-1, -1), 18),
    ("TOPPADDING", (0, 0), (-1, -1), 14),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
]))
story.append(cover_box)
story.append(Spacer(1, 0.6 * inch))
story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", meta_style))
story.append(PageBreak())

# ---------- TOC ----------
story.append(Paragraph("Table of Contents", h1))
toc = [
    ["1.", "Introduction"],
    ["2.", "API Key Setup"],
    ["3.", "Create Template API"],
    ["", "    3.1  Template with TEXT Header"],
    ["", "    3.2  Template with IMAGE Header"],
    ["", "    3.3  Template with VIDEO Header"],
    ["", "    3.4  Template with DOCUMENT Header"],
    ["", "    3.5  Template with LOCATION Header"],
    ["", "    3.6  Templates with Buttons (Quick Reply, URL, Phone, Copy Code)"],
    ["", "    3.7  Carousel Template"],
    ["", "    3.8  Flow Template"],
    ["4.", "Send Template Message API"],
    ["", "    4.1  TEXT / IMAGE / VIDEO / DOCUMENT / LOCATION header sends"],
    ["", "    4.2  Send Carousel Template"],
    ["", "    4.3  Send Template that triggers a Flow"],
    ["5.", "Conversation API (Free-form Messages)"],
    ["", "    5.1  Text  /  5.2  Image  /  5.3  Document"],
    ["", "    5.4  Video  /  5.5  Audio  /  5.6  Reply with context"],
    ["6.", "Webhook Configuration"],
    ["7.", "Template Management Endpoints (Get, Get by ID, Edit, Delete)"],
    ["8.", "Channel Management"],
    ["9.", "Additional APIs (Wallet Balance, Media Upload)"],
]
toc_tbl = Table(toc, colWidths=[0.6 * inch, 5.9 * inch])
toc_tbl.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 10.5),
    ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story.append(toc_tbl)
story.append(PageBreak())

# ---------- 1. INTRODUCTION ----------
story.append(Paragraph("1. Introduction", h1))
story.append(Paragraph(
    "The WhatsApp Business API enables organizations to manage and automate customer "
    "communication through secure, scalable endpoints. This documentation covers template "
    "creation, message sending, webhook configuration, and full template lifecycle "
    "management.",
    body,
))
story.append(Paragraph(
    "Throughout this guide, sample <b>curl</b> requests use <font face='Courier'>{{Your domain name}}</font> "
    "as the host placeholder and <font face='Courier'>{{User-Access-Token}}</font> for the bearer token. "
    "Replace these with your actual values when integrating.",
    body,
))
story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("Workflow at a glance", h3))
flow = [
    ["1", "Obtain your API Key from My Profile"],
    ["2", "Upload media (if your template uses an image, video, or document header)"],
    ["3", "Create the template via POST /message_templates and wait for approval"],
    ["4", "Send messages using the approved template name and parameters"],
    ["5", "Receive inbound messages and delivery events through your Webhook URL"],
]
flow_tbl = Table(flow, colWidths=[0.4 * inch, 6.1 * inch])
flow_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), PRIMARY),
    ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("BOX", (0, 0), (-1, -1), 0.5, LIGHT),
    ("INNERGRID", (0, 0), (-1, -1), 0.3, LIGHT),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story.append(flow_tbl)
story.append(PageBreak())

# ---------- 2. API KEY SETUP ----------
story.append(Paragraph("2. API Key Setup", h1))
story.append(Paragraph(
    "An API Key is required for every request. It authenticates the caller and authorizes "
    "access to your WhatsApp Business Account resources.",
    body,
))
story.append(Paragraph("Steps to retrieve your key", h3))
steps = [
    "Sign in to the WhatsApp Business dashboard.",
    "Open the <b>Account</b> menu and click <b>My Profile</b>.",
    "Locate the <b>API Key</b> section.",
    "Copy the key and store it in a secure secret manager.",
]
for i, s in enumerate(steps, 1):
    story.append(Paragraph(f"{i}. {s}", body))
story.append(Spacer(1, 0.1 * inch))
story.append(callout(
    "<b>Security:</b> never commit API keys to version control or share them publicly. "
    "Use environment variables or a secret manager, and rotate keys if a leak is suspected.",
))
story.append(PageBreak())

# ---------- 3. CREATE TEMPLATE ----------
story.append(Paragraph("3. Create Template API", h1))
story.append(Paragraph(
    "Templates must be created and approved by WhatsApp before they can be sent to users. "
    "This section shows the create-template payload for every supported header type and "
    "every interactive button type.",
    body,
))
story.append(info_table([
    ["Endpoint", "POST /{version}/{wabaId}/message_templates"],
    ["Method", "POST"],
    ["Version", "v23.0"],
    ["Headers", "Authorization: Bearer {{User-Access-Token}}"],
    ["", "Content-Type: application/json"],
]))
story.append(Spacer(1, 0.15 * inch))

# 3.1 TEXT
story.append(Paragraph("3.1 Create Template with TEXT Header", h2))
story.append(Paragraph("<i>Text headers display a single line of text at the top of the message.</i>", note))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "welcome_message",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Welcome to Our Service!"
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}! Thank you for joining us. We are excited to have you onboard.",
      "example": { "body_text": [["Pablo"]] }
    },
    {
      "type": "FOOTER",
      "text": "Reply STOP to unsubscribe"
    }
  ]
}'""", bg=CREATE_BG))
story.append(PageBreak())

# 3.2 IMAGE
story.append(Paragraph("3.2 Create Template with IMAGE Header", h2))
story.append(Paragraph("<i>Image headers add a banner visual &mdash; ideal for product promotions.</i>", note))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "product_promotion",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["https://example.com/product-image.jpg"]
      }
    },
    {
      "type": "BODY",
      "text": "Check out our {{1}} with {{2}} off! Limited time offer.",
      "example": { "body_text": [["Premium Headphones", "50%"]] }
    },
    {
      "type": "FOOTER",
      "text": "Offer valid until stock lasts"
    }
  ]
}'""", bg=CREATE_BG))
story.append(callout(
    "<b>Note &mdash; media handle vs. media ID:</b><br/>"
    "&bull; <b>At template creation</b>, <font face='Courier'>header_handle</font> accepts a public URL "
    "<i>or</i> a media ID returned by the Media Upload API (section 9.2). Upload first, then reference "
    "the returned <font face='Courier'>id</font> here.<br/>"
    "&bull; <b>At send time</b>, the header parameter switches to "
    "<font face='Courier'>{ \"type\": \"image\", \"image\": { \"id\": \"&lt;MEDIA_ID&gt;\" } }</font> "
    "&mdash; reuse the same media ID, or upload a fresh one per send."
))
story.append(PageBreak())

# 3.3 VIDEO
story.append(Paragraph("3.3 Create Template with VIDEO Header", h2))
story.append(Paragraph("<i>Video headers engage users with tutorials, demos, or promotional clips.</i>", note))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "tutorial_video",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "VIDEO",
      "example": {
        "header_handle": ["https://example.com/setup-guide.mp4"]
      }
    },
    {
      "type": "BODY",
      "text": "Watch this quick {{1}} tutorial to get started with your new device.",
      "example": { "body_text": [["5-minute"]] }
    },
    {
      "type": "FOOTER",
      "text": "Need help? Contact support"
    }
  ]
}'""", bg=CREATE_BG))
story.append(callout(
    "<b>Note &mdash; media handle vs. media ID:</b><br/>"
    "&bull; Video must be MP4, max 16&nbsp;MB.<br/>"
    "&bull; <b>At template creation</b>, <font face='Courier'>header_handle</font> accepts a public URL "
    "<i>or</i> a media ID from the Media Upload API (section 9.2).<br/>"
    "&bull; <b>At send time</b>, pass the media ID as "
    "<font face='Courier'>{ \"type\": \"video\", \"video\": { \"id\": \"&lt;MEDIA_ID&gt;\" } }</font>."
))
story.append(PageBreak())

# 3.4 DOCUMENT
story.append(Paragraph("3.4 Create Template with DOCUMENT Header", h2))
story.append(Paragraph("<i>Document headers attach PDFs, invoices, reports, or catalogs.</i>", note))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "invoice_delivery",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "DOCUMENT",
      "example": {
        "header_handle": ["https://example.com/invoice-sample.pdf"]
      }
    },
    {
      "type": "BODY",
      "text": "Your invoice {{1}} for amount {{2}} is ready. Please download the attached document.",
      "example": { "body_text": [["INV-2026-001", "$1,250.00"]] }
    },
    {
      "type": "FOOTER",
      "text": "Thank you for your business"
    }
  ]
}'""", bg=CREATE_BG))
story.append(callout(
    "<b>Note &mdash; media handle vs. media ID:</b><br/>"
    "&bull; Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (max 100&nbsp;MB).<br/>"
    "&bull; <b>At template creation</b>, <font face='Courier'>header_handle</font> accepts a public URL "
    "<i>or</i> a media ID from the Media Upload API (section 9.2).<br/>"
    "&bull; <b>At send time</b>, pass the media ID as "
    "<font face='Courier'>{ \"type\": \"document\", \"document\": { \"id\": \"&lt;MEDIA_ID&gt;\", "
    "\"filename\": \"invoice.pdf\" } }</font>."
))
story.append(PageBreak())

# 3.5 LOCATION
story.append(Paragraph("3.5 Create Template with LOCATION Header", h2))
story.append(Paragraph("<i>Location headers show map pins for stores or service locations.</i>", note))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "store_location",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "LOCATION"
    },
    {
      "type": "BODY",
      "text": "Visit our {{1}} store! We are open from {{2}}.",
      "example": { "body_text": [["Ahmedabad", "10:00 AM - 9:00 PM"]] }
    },
    {
      "type": "FOOTER",
      "text": "See you soon!"
    }
  ]
}'""", bg=CREATE_BG))
story.append(callout(
    "<b>Note:</b> Latitude, longitude, name, and address are supplied at <i>send</i> time, "
    "not during template creation (see section 4.5)."
))
story.append(PageBreak())

# 3.6 BUTTONS
story.append(Paragraph("3.6 Create Templates with Buttons", h2))
story.append(Paragraph(
    "Interactive buttons drive user actions and improve engagement. Each template may include "
    "one BUTTONS component containing up to ten buttons.",
    body,
))

story.append(Paragraph("3.6.1 Quick Reply Buttons", h3))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "order_confirmation",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Order Confirmed!"
    },
    {
      "type": "BODY",
      "text": "Your order {{1}} has been confirmed. Expected delivery: {{2}}.",
      "example": { "body_text": [["ORD-2026-12345", "April 30, 2026"]] }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "Track Order" },
        { "type": "QUICK_REPLY", "text": "Cancel Order" }
      ]
    }
  ]
}'""", bg=CREATE_BG))
story.append(PageBreak())

story.append(Paragraph("3.6.2 URL Button (Call-to-Action)", h3))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "flash_sale",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["https://example.com/flash-sale-banner.jpg"]
      }
    },
    {
      "type": "BODY",
      "text": "Flash Sale! Get {{1}} off on all items. Only {{2}} left!",
      "example": { "body_text": [["70%", "24 hours"]] }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Shop Now",
          "url": "https://example.com/sale?code={{1}}",
          "example": ["FLASH24"]
        }
      ]
    }
  ]
}'""", bg=CREATE_BG))
story.append(Spacer(1, 0.1 * inch))

story.append(Paragraph("3.6.3 Phone Number Button", h3))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "support_contact",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Need Help?"
    },
    {
      "type": "BODY",
      "text": "Our {{1}} is available 24/7 to assist you with any questions.",
      "example": { "body_text": [["Tech Support Team"]] }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "PHONE_NUMBER",
          "text": "Call Support",
          "phone_number": "+917912345678"
        }
      ]
    }
  ]
}'""", bg=CREATE_BG))
story.append(PageBreak())

story.append(Paragraph("3.6.4 Copy Code Button", h3))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "promo_code",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Congratulations! Use the code below for {{1}} off your next purchase.",
      "example": { "body_text": [["30%"]] }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "COPY_CODE", "example": ["SAVE30NOW"] }
      ]
    }
  ]
}'""", bg=CREATE_BG))
story.append(PageBreak())

# 3.7 CAROUSEL TEMPLATE
story.append(Paragraph("3.7 Create Carousel Template", h2))
story.append(Paragraph(
    "A carousel template displays a single text bubble followed by up to ten horizontally "
    "scrollable cards. Every card must share the same media header format and the same "
    "button combination. Cards can include up to two buttons each (Quick Reply, URL, or "
    "Phone Number).",
    body,
))
story.append(callout(
    "<b>Rules:</b> the message bubble (top BODY) is text-only and may contain variables. "
    "All cards must use the same header <i>format</i> (all IMAGE or all VIDEO) and the same "
    "button types in the same order. Maximum 10 cards per carousel."
))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "summer_collection_carousel",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{1}}! Check out our latest arrivals.",
      "example": { "body_text": [["Pablo"]] }
    },
    {
      "type": "CAROUSEL",
      "cards": [
        {
          "components": [
            {
              "type": "HEADER",
              "format": "IMAGE",
              "example": {
                "header_handle": ["https://example.com/products/card1.jpg"]
              }
            },
            {
              "type": "BODY",
              "text": "Premium headphones with {{1}} discount.",
              "example": { "body_text": [["20%"]] }
            },
            {
              "type": "BUTTONS",
              "buttons": [
                { "type": "QUICK_REPLY", "text": "More info" },
                {
                  "type": "URL",
                  "text": "Buy now",
                  "url": "https://example.com/p/{{1}}",
                  "example": ["headphones"]
                }
              ]
            }
          ]
        },
        {
          "components": [
            {
              "type": "HEADER",
              "format": "IMAGE",
              "example": {
                "header_handle": ["https://example.com/products/card2.jpg"]
              }
            },
            {
              "type": "BODY",
              "text": "Smart watch with {{1}} discount.",
              "example": { "body_text": [["30%"]] }
            },
            {
              "type": "BUTTONS",
              "buttons": [
                { "type": "QUICK_REPLY", "text": "More info" },
                {
                  "type": "URL",
                  "text": "Buy now",
                  "url": "https://example.com/p/{{1}}",
                  "example": ["smartwatch"]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}'""", bg=CREATE_BG))
story.append(PageBreak())

# 3.8 FLOW TEMPLATE
story.append(Paragraph("3.8 Create Flow Template", h2))
story.append(Paragraph(
    "A flow template embeds a WhatsApp Flow behind a CTA button. The recipient taps the "
    "button to open a multi-screen interactive form (sign-up, appointment booking, lead "
    "capture, etc.). The Flow itself must already be created and <b>published</b> in the "
    "WhatsApp Manager before it can be referenced here.",
    body,
))
story.append(callout(
    "<b>Required Flow button fields:</b> "
    "<font face='Courier'>flow_id</font> (published flow ID), "
    "<font face='Courier'>navigate_screen</font> (ID of the first screen to open &mdash; required when "
    "<font face='Courier'>flow_action</font> is <font face='Courier'>navigate</font>), "
    "<font face='Courier'>flow_action</font> "
    "(<font face='Courier'>navigate</font> for static flows or <font face='Courier'>data_exchange</font> "
    "for dynamic flows that fetch screens from your endpoint)."
))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "name": "appointment_booking",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Book your appointment"
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}, tap below to choose a time that works for you.",
      "example": { "body_text": [["Pablo"]] }
    },
    {
      "type": "FOOTER",
      "text": "We will confirm by SMS"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "FLOW",
          "text": "Book now",
          "flow_id": "<FLOW_ID>",
          "navigate_screen": "BOOKING_SCREEN",
          "flow_action": "navigate"
        }
      ]
    }
  ]
}'""", bg=CREATE_BG))
story.append(PageBreak())

# ---------- 4. SEND MESSAGE ----------
story.append(Paragraph("4. Send Template Message API", h1))
story.append(Paragraph(
    "Once a template is approved, send it to a recipient using this endpoint. The payload "
    "varies depending on the template's components (header type, body variables, button "
    "parameters), but the endpoint and response shape are consistent.",
    body,
))
story.append(info_table([
    ["Endpoint", "POST /{version}/{phoneNumberId}/messages"],
    ["Method", "POST"],
    ["Version", "v23.0"],
    ["Headers", "Authorization: Bearer {{User-Access-Token}}"],
    ["", "Content-Type: application/json"],
]))
story.append(Spacer(1, 0.1 * inch))
story.append(callout(
    "<b>Using media IDs at send time:</b> for templates with IMAGE / VIDEO / DOCUMENT headers, "
    "first upload the file via the Media Upload API (section 9.2) to receive a media "
    "<font face='Courier'>id</font>. Pass that id under the header parameter, e.g. "
    "<font face='Courier'>{ \"type\": \"image\", \"image\": { \"id\": \"&lt;MEDIA_ID&gt;\" } }</font>. "
    "The same media ID can be reused across multiple sends; alternatively a public "
    "<font face='Courier'>link</font> can be supplied instead of <font face='Courier'>id</font>."
))
story.append(Spacer(1, 0.1 * inch))

story.append(Paragraph("4.1 Send Template with TEXT Header", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "welcome_message",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Pablo" }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(callout(
    "<b>Tip:</b> if your TEXT header itself contains a variable like "
    "<font face='Courier'>{{1}}</font>, add a <font face='Courier'>header</font> component "
    "with a <font face='Courier'>{ \"type\": \"text\", \"text\": \"...\" }</font> parameter."
))
story.append(PageBreak())

story.append(Paragraph("4.2 Send Template with IMAGE Header", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "product_promotion",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "image", "image": { "id": "<MEDIA_ID>" } }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Premium Headphones" },
          { "type": "text", "text": "50%" }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(callout(
    "Replace <font face='Courier'>{ \"id\": \"&lt;MEDIA_ID&gt;\" }</font> with "
    "<font face='Courier'>{ \"link\": \"https://example.com/img.jpg\" }</font> if you prefer "
    "a public URL over an uploaded media ID."
))
story.append(PageBreak())

story.append(Paragraph("4.3 Send Template with VIDEO Header", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "tutorial_video",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "video", "video": { "id": "<MEDIA_ID>" } }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "5-minute" }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(PageBreak())

story.append(Paragraph("4.4 Send Template with DOCUMENT Header", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "invoice_delivery",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "document",
            "document": {
              "id": "<MEDIA_ID>",
              "filename": "invoice-INV-2026-001.pdf"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "INV-2026-001" },
          { "type": "currency",
            "currency": {
              "fallback_value": "$1,250.00",
              "code": "USD",
              "amount_1000": 1250000
            }
          }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(callout(
    "<b>Note:</b> for monetary values use a <font face='Courier'>currency</font> parameter so "
    "WhatsApp can render the amount per the recipient's locale; "
    "<font face='Courier'>amount_1000</font> is the value multiplied by 1000."
))
story.append(PageBreak())

story.append(Paragraph("4.5 Send Template with LOCATION Header", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "store_location",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "location",
            "location": {
              "latitude": "23.0225",
              "longitude": "72.5714",
              "name": "Flagship Store - Ahmedabad",
              "address": "C.G. Road, Ahmedabad, Gujarat 380009"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Ahmedabad" },
          { "type": "text", "text": "10:00 AM - 9:00 PM" }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(PageBreak())

story.append(Paragraph("4.6 Send Carousel Template", h2))
story.append(Paragraph(
    "Each card carries its own <font face='Courier'>card_index</font> (zero-based) and lists "
    "only the components whose values change at send time &mdash; typically the header media "
    "and the URL/quick-reply button payloads.",
    body,
))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "summer_collection_carousel",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Pablo" }
        ]
      },
      {
        "type": "carousel",
        "cards": [
          {
            "card_index": 0,
            "components": [
              {
                "type": "header",
                "parameters": [
                  { "type": "image", "image": { "id": "<MEDIA_ID_1>" } }
                ]
              },
              {
                "type": "body",
                "parameters": [
                  { "type": "text", "text": "20%" }
                ]
              },
              {
                "type": "button",
                "sub_type": "url",
                "index": "1",
                "parameters": [
                  { "type": "text", "text": "headphones" }
                ]
              }
            ]
          },
          {
            "card_index": 1,
            "components": [
              {
                "type": "header",
                "parameters": [
                  { "type": "image", "image": { "id": "<MEDIA_ID_2>" } }
                ]
              },
              {
                "type": "body",
                "parameters": [
                  { "type": "text", "text": "30%" }
                ]
              },
              {
                "type": "button",
                "sub_type": "url",
                "index": "1",
                "parameters": [
                  { "type": "text", "text": "smartwatch" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(PageBreak())

story.append(Paragraph("4.7 Send Template that Triggers a Flow", h2))
story.append(Paragraph(
    "Templates created with a FLOW button (section 3.8) are sent with a "
    "<font face='Courier'>button</font> component using "
    "<font face='Courier'>sub_type: \"flow\"</font>. The "
    "<font face='Courier'>flow_token</font> is your opaque identifier echoed back in the "
    "Flow's data-exchange webhooks; <font face='Courier'>flow_action_data</font> "
    "pre-populates fields on the first screen.",
    body,
))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "appointment_booking",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Pablo" }
        ]
      },
      {
        "type": "button",
        "sub_type": "flow",
        "index": "0",
        "parameters": [
          {
            "type": "action",
            "action": {
              "flow_token": "user-12345-session-abc",
              "flow_action_data": {
                "customer_name": "Pablo",
                "customer_phone": "+91XXXXXXXXXX"
              }
            }
          }
        ]
      }
    ]
  }
}'""", bg=SEND_BG))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("Success response", h3))
story.append(code_block("""{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "91XXXXXXXXXX", "wa_id": "91XXXXXXXXXX" }],
  "messages": [{ "id": "wamid.HBgMOTE..." }]
}"""))

story.append(Paragraph("Failure response", h3))
story.append(code_block("""{
  "isValid": false,
  "response": [
    {
      "status": "Invalid phone number in template message.",
      "message": "An unexpected error occurred.",
      "statusCode": 500
    }
  ]
}"""))
story.append(PageBreak())

# ---------- 5. CONVERSATION API (FREE-FORM) ----------
story.append(Paragraph("5. Conversation API &mdash; Free-form Messages", h1))
story.append(Paragraph(
    "Once a user has messaged your number within the 24-hour customer-service window, you can "
    "reply with non-template (free-form) messages. Same endpoint as templates, different "
    "<font face='Courier'>type</font> values.",
    body,
))
story.append(info_table([
    ["Endpoint", "POST /{version}/{phoneNumberId}/messages"],
    ["Method", "POST"],
    ["Headers", "Authorization: Bearer {{User-Access-Token}}"],
    ["", "Content-Type: application/json"],
]))
story.append(callout(
    "<b>24-hour window:</b> free-form messages can only be sent within 24 hours of the "
    "recipient's last inbound message. After that, you must initiate with an approved template."
))
story.append(Spacer(1, 0.1 * inch))

# 5.1 TEXT
story.append(Paragraph("5.1 Send Text Message", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "text",
  "text": {
    "preview_url": true,
    "body": "Thanks for reaching out! Visit https://example.com for more info."
  }
}'""", bg=SEND_BG))
story.append(callout(
    "<b>preview_url:</b> set to <font face='Courier'>true</font> to render link previews. "
    "WhatsApp uses the first URL in the body."
))
story.append(PageBreak())

# 5.2 IMAGE
story.append(Paragraph("5.2 Send Image Message", h2))
story.append(Paragraph("By media ID (recommended &mdash; upload via section 9.2 first):", h3))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "image",
  "image": {
    "id": "<MEDIA_ID>",
    "caption": "Here is the product photo you asked about."
  }
}'""", bg=SEND_BG))
story.append(Paragraph("By public URL:", h3))
story.append(code_block("""--data '{
  "messaging_product": "whatsapp",
  "to": "91XXXXXXXXXX",
  "type": "image",
  "image": {
    "link": "https://example.com/photo.jpg",
    "caption": "Here is the product photo you asked about."
  }
}'""", bg=SEND_BG))
story.append(PageBreak())

# 5.3 DOCUMENT
story.append(Paragraph("5.3 Send Document Message", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "91XXXXXXXXXX",
  "type": "document",
  "document": {
    "id": "<MEDIA_ID>",
    "filename": "invoice-INV-2026-001.pdf",
    "caption": "Your invoice is attached."
  }
}'""", bg=SEND_BG))
story.append(callout(
    "<b>filename:</b> what the recipient sees and what gets used when they download. Always "
    "include it for documents &mdash; it also influences how WhatsApp renders the document tile."
))
story.append(Spacer(1, 0.1 * inch))

# 5.4 VIDEO
story.append(Paragraph("5.4 Send Video Message", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "to": "91XXXXXXXXXX",
  "type": "video",
  "video": {
    "id": "<MEDIA_ID>",
    "caption": "Quick walkthrough of the new feature."
  }
}'""", bg=SEND_BG))
story.append(PageBreak())

# 5.5 AUDIO
story.append(Paragraph("5.5 Send Audio Message", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "to": "91XXXXXXXXXX",
  "type": "audio",
  "audio": {
    "id": "<MEDIA_ID>"
  }
}'""", bg=SEND_BG))
story.append(callout(
    "Audio messages do not support captions. Use OGG/Opus for voice notes (auto-played in-app); "
    "MP3/AAC for music or longer audio."
))
story.append(Spacer(1, 0.1 * inch))

# 5.6 REPLY WITH CONTEXT
story.append(Paragraph("5.6 Reply Quoting an Inbound Message", h2))
story.append(Paragraph(
    "Quote the user's previous message by adding a <font face='Courier'>context.message_id</font> "
    "field. Works with any message type.",
    body,
))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/messages' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "messaging_product": "whatsapp",
  "to": "91XXXXXXXXXX",
  "context": {
    "message_id": "wamid.HBgMOTE..."
  },
  "type": "text",
  "text": {
    "body": "Got it &mdash; processing your refund now."
  }
}'""", bg=SEND_BG))
story.append(PageBreak())

# ---------- 6. WEBHOOK ----------
story.append(Paragraph("6. Webhook Configuration", h1))
story.append(Paragraph(
    "Inbound messages and delivery events are pushed to your configured Webhook URL. Configure "
    "the endpoint to acknowledge receipt with HTTP 200 within a few seconds &mdash; do heavy "
    "processing asynchronously.",
    body,
))
story.append(info_table([
    ["Endpoint", "POST /api/v1/meta/webhook"],
    ["Method", "POST"],
    ["Headers", "Authorization: Bearer {{User-Access-Token}}"],
]))
story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("Each webhook event delivers", h3))
for item in [
    "Sender's WhatsApp number",
    "Message type (text, image, interactive, button, location, etc.)",
    "Timestamp",
    "Message ID",
    "Business phone number ID",
    "Metadata for template responses and button interactions",
]:
    story.append(Paragraph(f"&bull; {item}", body))
story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("Reference: <font face='Courier'>https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components</font>", note))
story.append(PageBreak())

# ---------- 6. TEMPLATE MANAGEMENT ----------
story.append(Paragraph("7. Template Management Endpoints", h1))
story.append(Paragraph(
    "These endpoints cover the rest of the template lifecycle: listing, fetching, editing, "
    "and deleting templates.",
    body,
))

story.append(Paragraph("7.1 Get All Templates", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates' \\
--header 'Authorization: Bearer {{User-Access-Token}}'"""))
story.append(Paragraph("Response (excerpt)", h3))
story.append(code_block("""{
  "data": [
    {
      "name": "test1234",
      "language": "en",
      "category": "UTILITY",
      "id": "865679666122280",
      "status": "APPROVED",
      "components": [
        {
          "type": "BODY",
          "text": "Hello customer, your replacement order is confirmed."
        }
      ]
    }
  ]
}"""))
story.append(PageBreak())

story.append(Paragraph("7.2 Get Template by ID", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/<TEMPLATE_ID>' \\
--header 'Authorization: Bearer {{User-Access-Token}}'"""))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("7.3 Edit Template", h2))
story.append(Paragraph(
    "Editing reuses the template ID as the path parameter. Send only the components you want "
    "to update; the category cannot be changed once approved unless "
    "<font face='Courier'>allow_category_change</font> was set.",
    body,
))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/<TEMPLATE_ID>' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--header 'Content-Type: application/json' \\
--data '{
  "components": [
    {
      "type": "BODY",
      "text": "Updated body for {{1}} with new offer {{2}}.",
      "example": { "body_text": [["Pablo", "30%"]] }
    },
    {
      "type": "FOOTER",
      "text": "Updated footer text"
    }
  ]
}'"""))
story.append(callout(
    "<b>Tip:</b> Edits put the template back into review. The status returns to "
    "<font face='Courier'>PENDING</font> until WhatsApp re-approves it."
))
story.append(PageBreak())

story.append(Paragraph("7.4 Delete Template", h2))
story.append(Paragraph(
    "Delete by name (removes all language variants) or by ID (removes a single language). "
    "Pass the template name or <font face='Courier'>hsm_id</font> as a query parameter.",
    body,
))
story.append(code_block("""curl --location --globoff --request DELETE \\
'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates?name=order_confirmation' \\
--header 'Authorization: Bearer {{User-Access-Token}}'"""))
story.append(Spacer(1, 0.05 * inch))
story.append(Paragraph("Delete a single language variant by ID", h3))
story.append(code_block("""curl --location --globoff --request DELETE \\
'https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates?hsm_id=<TEMPLATE_ID>&name=order_confirmation' \\
--header 'Authorization: Bearer {{User-Access-Token}}'"""))
story.append(PageBreak())

# ---------- 7. CHANNEL MGMT ----------
story.append(Paragraph("8. Channel Management", h1))
story.append(Paragraph("8.1 Get Channels", h2))
story.append(code_block("""curl --location --globoff 'https://{{Your domain name}}/v23.0/channels' \\
--header 'Authorization: Bearer {{User-Access-Token}}'"""))
story.append(Paragraph("Response", h3))
story.append(code_block("""{
  "data": [
    {
      "id": "123456789",
      "name": "Customer Support",
      "phone_number": "+917912345678",
      "status": "ACTIVE"
    }
  ]
}"""))
story.append(PageBreak())

# ---------- 8. ADDITIONAL APIs ----------
story.append(Paragraph("9. Additional APIs", h1))

story.append(Paragraph("9.1 Get Wallet Balance", h2))
story.append(code_block("""curl --location --globoff --request GET 'https://{{Your domain name}}/api/v1/user/balance' \\
--header 'Authorization: Bearer {{User-Access-Token}}'"""))
story.append(Paragraph("Response &mdash; HTTP 200", h3))
story.append(code_block("""{
  "walletBalance": 83.2649
}"""))
story.append(Spacer(1, 0.1 * inch))

story.append(Paragraph("9.2 Upload WhatsApp Media", h2))
story.append(Paragraph(
    "Upload media before referencing it in template headers or send-message payloads. The "
    "returned <font face='Courier'>id</font> is what you pass in subsequent calls.",
    body,
))
story.append(code_block("""curl --location --globoff --request POST 'https://{{Your domain name}}/v23.0/{{phoneNumberId}}/media' \\
--header 'Authorization: Bearer {{User-Access-Token}}' \\
--form 'file=@product_image.jpg' \\
--form 'type=image/jpeg' \\
--form 'messaging_product=whatsapp'"""))
story.append(Paragraph("Response &mdash; HTTP 200", h3))
story.append(code_block("""{
  "id": "2171225710283963",
  "error": null
}"""))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("Supported media types &amp; size limits", h3))
media_rows = [
    ["Type", "Formats", "Max size"],
    ["Image", "JPG, JPEG, PNG", "5 MB"],
    ["Video", "MP4, 3GPP", "16 MB"],
    ["Audio", "AAC, MP3, AMR, OGG, OPUS", "16 MB"],
    ["Document", "PDF, DOC(X), PPT(X), XLS(X), TXT", "100 MB"],
    ["Sticker", "WEBP (static & animated)", "100 KB / 500 KB"],
]
mt = Table(media_rows, colWidths=[1.1 * inch, 3.4 * inch, 2.0 * inch])
mt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("BOX", (0, 0), (-1, -1), 0.5, LIGHT),
    ("INNERGRID", (0, 0), (-1, -1), 0.3, LIGHT),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HEADER_BG]),
]))
story.append(mt)
story.append(PageBreak())

# ---------- APPENDIX ----------
story.append(Paragraph("Appendix: Calling the API from Postman", h1))
appendix = [
    "Open Postman, click <b>New</b> &rarr; <b>HTTP Request</b>.",
    "Set the request type to <b>POST</b> (or the verb required by the endpoint).",
    "Enter the URL, e.g. <font face='Courier'>https://{{Your domain name}}/v23.0/{{wabaId}}/message_templates</font>.",
    "In the <b>Headers</b> tab add: <font face='Courier'>Authorization: Bearer {{User-Access-Token}}</font> "
    "and <font face='Courier'>Content-Type: application/json</font>.",
    "In the <b>Body</b> tab choose <b>raw</b> &rarr; <b>JSON</b> and paste the payload.",
    "Click <b>Send</b> and inspect the response.",
]
for i, line in enumerate(appendix, 1):
    story.append(Paragraph(f"{i}. {line}", body))
story.append(Spacer(1, 0.2 * inch))

story.append(Paragraph("Style note for curl examples", h3))
story.append(Paragraph(
    "Throughout this document, curl examples use <font face='Courier'>--location --globoff</font> "
    "(follow redirects and disable URL globbing so brace placeholders survive) and the standard "
    "<font face='Courier'>Authorization: Bearer</font> header. Replace "
    "<font face='Courier'>{{Your domain name}}</font> and <font face='Courier'>{{User-Access-Token}}</font> "
    "with your actual host and API key before running.",
    body,
))

# ---------- BUILD ----------
out_path = r"c:\Users\AMAN\Downloads\icpaas-app\UI image\WhatsApp_API_Complete_Documentation.pdf"
doc = SimpleDocTemplate(
    out_path, pagesize=letter,
    rightMargin=0.75 * inch, leftMargin=0.75 * inch,
    topMargin=0.7 * inch, bottomMargin=0.75 * inch,
    title="WhatsApp API - Complete Setup Documentation",
    author="ICPaaS",
)
doc.build(story, canvasmaker=NumberedCanvas)
print(f"PDF written: {out_path}")
