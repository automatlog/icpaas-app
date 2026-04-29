"""Generate a synthetic Flipkart-style tax invoice for testing.

All seller/buyer/GSTIN/order-id values are intentionally placeholder data so the
output cannot be mistaken for a real invoice. Only the amounts match the values
the user requested.
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

DARK = colors.HexColor("#1F2937")
MID = colors.HexColor("#4B5563")
LINE = colors.HexColor("#9CA3AF")
HEADER_BG = colors.HexColor("#F3F4F6")

style_title = ParagraphStyle(
    "title", fontName="Helvetica-Bold", fontSize=13, textColor=DARK,
    alignment=TA_CENTER, spaceAfter=4,
)
style_h = ParagraphStyle(
    "h", fontName="Helvetica-Bold", fontSize=9, textColor=DARK, leading=11, spaceAfter=2,
)
style_body = ParagraphStyle(
    "body", fontName="Helvetica", fontSize=8.5, textColor=DARK, leading=11,
)
style_small = ParagraphStyle(
    "small", fontName="Helvetica", fontSize=8, textColor=MID, leading=10,
)
style_th = ParagraphStyle(
    "th", fontName="Helvetica-Bold", fontSize=8.5, textColor=DARK,
    alignment=TA_CENTER, leading=11,
)
style_td = ParagraphStyle(
    "td", fontName="Helvetica", fontSize=8, textColor=DARK, leading=10,
)
style_td_r = ParagraphStyle(
    "tdr", fontName="Helvetica", fontSize=8, textColor=DARK, leading=10,
    alignment=2,  # right
)


SELLER_NAME = "ACME TEST MATTRESS PRIVATE LIMITED"
SELLER_GSTIN = "27AAAAA0000A1Z5"
SELLER_PAN = "AAAAA0000A"
SELLER_ADDR = (
    "Plot No. 0, Test Industrial Estate,<br/>"
    "Sample Block, Demo District,<br/>"
    "Maharashtra, MUMBAI - 400000"
)
SELLER_REGD_ADDR = (
    "ACME TEST MATTRESS PRIVATE LIMITED,<br/>"
    "0/0, Sample Road, Test Layout,<br/>"
    "BANGALORE - 560000."
)

BUYER_NAME = "John Doe"
BUYER_ADDR = (
    "123 Sample Street, Apt 0,<br/>"
    "Test Township, Demo Road,<br/>"
    "Sample City - 000000, IN-XX"
)

ORDER_ID = "ODTEST0000000000000000"
INVOICE_NO = "TESTINV000000001"
ORDER_DATE = "06-03-2026, 01:09 AM"
INVOICE_DATE = "11-03-2026, 09:30 AM"

PRODUCT_DESC = (
    "Sample Test Mattress &mdash; Queen High Resilience Foam, 72 inch x 60 inch<br/>"
    "Model: TEST-QN-6072 | 0 day Replacement Guarantee ** | IMEI/SrNo: [[]]"
)
HSN_LINE = "HSN: 940429 | IGST: 18.00% | CESS: 0.00%"

AMT_GROSS = "7386.00"
AMT_DISCOUNT = "-887.00"
AMT_TAXABLE = "5503.40"
AMT_IGST = "991.60"
AMT_CESS = "0.00"
AMT_TOTAL = "6500.00"


def _hr():
    t = Table([[""]], colWidths=[180 * mm])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, LINE)]))
    return t


def build():
    out = r"c:\Users\AMAN\Downloads\icpaas-app\UI image\Tax_Invoice_TEST_FIXTURE.pdf"
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=12 * mm, rightMargin=12 * mm,
        topMargin=12 * mm, bottomMargin=12 * mm,
        title="Tax Invoice (TEST FIXTURE)",
        author="Synthetic test fixture",
    )

    story = []

    # Top banner
    story.append(Paragraph("Tax Invoice", style_title))
    banner = Paragraph(
        "<font color='#B91C1C'><b>SYNTHETIC TEST FIXTURE &mdash; ALL PARTY / GSTIN / ORDER "
        "DETAILS ARE FICTIONAL. NOT A VALID INVOICE.</b></font>",
        ParagraphStyle("banner", fontName="Helvetica-Bold", fontSize=8.5, alignment=TA_CENTER),
    )
    banner_tbl = Table([[banner]], colWidths=[180 * mm])
    banner_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#B91C1C")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(banner_tbl)
    story.append(Spacer(1, 4 * mm))

    # Header meta row
    meta = Table(
        [[
            Paragraph(f"<b>Order Id:</b> {ORDER_ID}<br/>"
                      f"<b>Order Date:</b> {ORDER_DATE}", style_body),
            Paragraph(f"<b>Invoice No:</b> {INVOICE_NO}<br/>"
                      f"<b>Invoice Date:</b> {INVOICE_DATE}", style_body),
            Paragraph(f"<b>GSTIN:</b> {SELLER_GSTIN}<br/>"
                      f"<b>PAN:</b> {SELLER_PAN}", style_body),
        ]],
        colWidths=[60 * mm, 60 * mm, 60 * mm],
    )
    meta.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta)
    story.append(_hr())
    story.append(Spacer(1, 3 * mm))

    # Address row
    addr = Table(
        [[
            Paragraph(f"<b>Sold By</b><br/>{SELLER_NAME},<br/>{SELLER_ADDR}<br/>"
                      f"GST: {SELLER_GSTIN}", style_body),
            Paragraph(f"<b>Billing Address</b><br/>{BUYER_NAME},<br/>{BUYER_ADDR}", style_body),
            Paragraph(f"<b>Shipping Address</b><br/>{BUYER_NAME},<br/>{BUYER_ADDR}", style_body),
        ]],
        colWidths=[60 * mm, 60 * mm, 60 * mm],
    )
    addr.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
    ]))
    story.append(addr)
    story.append(Spacer(1, 4 * mm))

    # Item table header + rows
    headers = [
        Paragraph("Product Description", style_th),
        Paragraph("Qty", style_th),
        Paragraph("Gross<br/>Amount", style_th),
        Paragraph("Discount", style_th),
        Paragraph("Taxable<br/>Value", style_th),
        Paragraph("IGST", style_th),
        Paragraph("CESS", style_th),
        Paragraph("Total", style_th),
    ]

    desc_cell = Paragraph(
        f"{PRODUCT_DESC}<br/><font color='#4B5563'>{HSN_LINE}</font>",
        style_td,
    )

    item_rows = [
        headers,
        [
            desc_cell,
            Paragraph("1", style_td_r),
            Paragraph(AMT_GROSS, style_td_r),
            Paragraph(AMT_DISCOUNT, style_td_r),
            Paragraph(AMT_TAXABLE, style_td_r),
            Paragraph(AMT_IGST, style_td_r),
            Paragraph(AMT_CESS, style_td_r),
            Paragraph(AMT_TOTAL, style_td_r),
        ],
        [
            Paragraph("Handling Fee", style_td),
            Paragraph("1", style_td_r),
            Paragraph("0.00", style_td_r),
            Paragraph("0", style_td_r),
            Paragraph("0.00", style_td_r),
            Paragraph("0.00", style_td_r),
            Paragraph("0.00", style_td_r),
            Paragraph("0.00", style_td_r),
        ],
    ]

    item_tbl = Table(
        item_rows,
        colWidths=[70 * mm, 10 * mm, 16 * mm, 14 * mm, 16 * mm, 14 * mm, 12 * mm, 16 * mm],
    )
    item_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(item_tbl)
    story.append(Spacer(1, 3 * mm))

    # Totals strip
    totals = Table(
        [[
            Paragraph("<b>TOTAL QTY:</b> 1", style_body),
            Paragraph(f"<b>TOTAL PRICE:</b> {AMT_TOTAL}", style_body),
            Paragraph("<i>All values are in INR</i>", style_small),
        ]],
        colWidths=[40 * mm, 60 * mm, 80 * mm],
    )
    totals.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(totals)
    story.append(Spacer(1, 5 * mm))

    # Footer block
    story.append(_hr())
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        f"<b>Seller Registered Address:</b> {SELLER_REGD_ADDR}", style_small,
    ))
    story.append(Paragraph("<b>FSSAI License number:</b> null", style_small))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "** Conditions Apply. Please refer to the product page for more details. "
        "E. & O.E.",
        style_small,
    ))
    story.append(Spacer(1, 6 * mm))

    sig = Table(
        [[
            Paragraph("<b>Ordered Through</b><br/>(synthetic test fixture)", style_small),
            Paragraph(
                f"For {SELLER_NAME}<br/><br/><br/>"
                "____________________________<br/>Authorized Signature",
                style_small,
            ),
        ]],
        colWidths=[80 * mm, 100 * mm],
    )
    sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(sig)

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(
        "<font color='#B91C1C'><b>This document was generated as a test fixture and contains no "
        "real party data. Do not use for any tax, accounting, reimbursement, or legal purpose.</b></font>",
        ParagraphStyle("foot", fontName="Helvetica-Bold", fontSize=7.5, alignment=TA_CENTER),
    ))

    doc.build(story)
    print(f"Wrote: {out}")


if __name__ == "__main__":
    build()
