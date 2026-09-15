from pathlib import Path
import textwrap

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas


OUT_DIR = Path("exports")
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "kidventure-high-level-design.pdf"
JPG_PATH = OUT_DIR / "kidventure-high-level-design-architecture.jpg"

PAGE_W, PAGE_H = landscape(A4)

NAVY = HexColor("#18324B")
ORANGE = HexColor("#FF7A45")
YELLOW = HexColor("#FFD15C")
CREAM = HexColor("#FFF9F0")
MINT = HexColor("#DCF5EC")
SKY = HexColor("#DFF3FF")
LAVENDER = HexColor("#EEE5FF")
BLUSH = HexColor("#FFE5E1")
LEARN = HexColor("#55A9E8")
CREATE = HexColor("#9A74DC")
CONNECT = HexColor("#EB6E8C")
GREEN = HexColor("#43B883")
MUTED = HexColor("#6F7C84")
LINE = HexColor("#E4D9C8")
CARD = white


def set_font(canvas: Canvas, bold: bool = False, size: float = 10):
    canvas.setFont("Helvetica-Bold" if bold else "Helvetica", size)


def draw_wrapped(canvas: Canvas, text: str, x: float, y: float, width: float,
                 size: float = 10, leading: float = 14, color=NAVY,
                 bold: bool = False, max_lines: int | None = None):
    set_font(canvas, bold, size)
    canvas.setFillColor(color)
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, "Helvetica-Bold" if bold else "Helvetica", size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while stringWidth(f"{last}...", "Helvetica-Bold" if bold else "Helvetica", size) > width and last:
            last = last[:-1]
        lines[-1] = f"{last.rstrip()}..."
    for index, line in enumerate(lines):
        canvas.drawString(x, y - index * leading, line)
    return y - len(lines) * leading


def draw_title(canvas: Canvas, page_label: str, title: str, subtitle: str):
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 10, PAGE_W, 10, fill=1, stroke=0)
    set_font(canvas, True, 9)
    canvas.setFillColor(ORANGE)
    canvas.drawString(42, PAGE_H - 38, page_label.upper())
    set_font(canvas, True, 25)
    canvas.setFillColor(NAVY)
    canvas.drawString(42, PAGE_H - 71, title)
    draw_wrapped(canvas, subtitle, 42, PAGE_H - 92, PAGE_W - 84, size=10.5, leading=14, color=MUTED)


def draw_footer(canvas: Canvas, page_number: int):
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.line(42, 27, PAGE_W - 42, 27)
    set_font(canvas, False, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(42, 14, "KidVenture · High-Level Design · Learn. Create. Connect.")
    canvas.drawRightString(PAGE_W - 42, 14, f"{page_number:02d}")


def rounded_card(canvas: Canvas, x: float, y: float, w: float, h: float,
                 fill=CARD, stroke=LINE, radius: float = 14):
    canvas.setFillColor(fill)
    canvas.setStrokeColor(stroke)
    canvas.setLineWidth(0.8)
    canvas.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def card(canvas: Canvas, x: float, y: float, w: float, h: float, title: str,
         body: str, fill=CARD, accent=ORANGE, title_size: float = 12):
    rounded_card(canvas, x, y, w, h, fill)
    canvas.setFillColor(accent)
    canvas.roundRect(x, y + h - 6, w, 6, 3, fill=1, stroke=0)
    set_font(canvas, True, title_size)
    canvas.setFillColor(NAVY)
    canvas.drawString(x + 14, y + h - 28, title)
    draw_wrapped(canvas, body, x + 14, y + h - 48, w - 28, size=9, leading=12, color=MUTED)


def tag(canvas: Canvas, x: float, y: float, label: str, fill, text_color=NAVY,
        width: float | None = None):
    width = width or stringWidth(label, "Helvetica-Bold", 8) + 18
    canvas.setFillColor(fill)
    canvas.roundRect(x, y, width, 18, 9, fill=1, stroke=0)
    set_font(canvas, True, 8)
    canvas.setFillColor(text_color)
    canvas.drawCentredString(x + width / 2, y + 5.5, label.upper())
    return width


def arrow(canvas: Canvas, x1: float, y1: float, x2: float, y2: float, color=ORANGE):
    canvas.setStrokeColor(color)
    canvas.setFillColor(color)
    canvas.setLineWidth(2)
    canvas.line(x1, y1, x2, y2)
    direction = 1 if x2 >= x1 else -1
    canvas.line(x2, y2, x2 - direction * 8, y2 + 4)
    canvas.line(x2, y2, x2 - direction * 8, y2 - 4)


def numbered_step(canvas: Canvas, x: float, y: float, number: str, title: str,
                  body: str, accent=ORANGE, width: float = 160):
    canvas.setFillColor(accent)
    canvas.circle(x + 14, y + 14, 14, fill=1, stroke=0)
    set_font(canvas, True, 11)
    canvas.setFillColor(NAVY)
    canvas.drawCentredString(x + 14, y + 10, number)
    set_font(canvas, True, 10)
    canvas.setFillColor(NAVY)
    canvas.drawString(x + 38, y + 18, title)
    draw_wrapped(canvas, body, x + 38, y + 4, width - 38, size=8.5, leading=11, color=MUTED, max_lines=3)


def draw_cover(canvas: Canvas):
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 11, PAGE_W, 11, fill=1, stroke=0)
    canvas.setFillColor(SKY)
    canvas.circle(PAGE_W - 90, PAGE_H - 78, 95, fill=1, stroke=0)
    canvas.setFillColor(MINT)
    canvas.circle(PAGE_W - 155, 86, 58, fill=1, stroke=0)

    set_font(canvas, True, 12)
    canvas.setFillColor(ORANGE)
    canvas.drawString(48, PAGE_H - 64, "KIDVENTURE · PRODUCT BLUEPRINT")
    set_font(canvas, True, 38)
    canvas.setFillColor(NAVY)
    canvas.drawString(48, PAGE_H - 118, "High-Level Design")
    set_font(canvas, False, 16)
    canvas.setFillColor(MUTED)
    canvas.drawString(50, PAGE_H - 148, "The connected system behind small missions and big futures.")

    mascot_path = Path("artifacts/kidventure-mobile/assets/images/kidventure-mascot.png")
    if mascot_path.exists():
        canvas.drawImage(ImageReader(str(mascot_path)), PAGE_W - 270, PAGE_H - 275, width=190, height=190, mask="auto", preserveAspectRatio=True)

    rounded_card(canvas, 48, 282, 365, 92, fill=NAVY, stroke=NAVY)
    tag(canvas, 66, 345, "Purpose", YELLOW)
    draw_wrapped(
        canvas,
        "A safe, adaptive digital coach for children ages 8–10. The app turns screen time into short activities that grow learning, creativity, and kindness.",
        66, 327, 325, size=12, leading=17, color=white,
    )

    set_font(canvas, True, 13)
    canvas.setFillColor(NAVY)
    canvas.drawString(48, 247, "The three product paths")
    pillar_cards = [
        ("LEARN", "Logic, memory, numeracy, focus", LEARN),
        ("CREATE", "Imagination, storytelling, ideas", CREATE),
        ("CONNECT", "Kindness, empathy, teamwork", CONNECT),
    ]
    for index, (label, body, color) in enumerate(pillar_cards):
        x = 48 + index * 126
        rounded_card(canvas, x, 166, 114, 62, fill=CARD)
        canvas.setFillColor(color)
        canvas.circle(x + 21, 196, 11, fill=1, stroke=0)
        set_font(canvas, True, 9)
        canvas.setFillColor(NAVY)
        canvas.drawString(x + 39, 202, label)
        draw_wrapped(canvas, body, x + 39, 189, 66, size=7.6, leading=9.5, color=MUTED)

    rounded_card(canvas, PAGE_W - 330, 80, 280, 114, fill=CARD)
    set_font(canvas, True, 11)
    canvas.setFillColor(ORANGE)
    canvas.drawString(PAGE_W - 312, 171, "PRIMARY SUCCESS METRIC")
    draw_wrapped(
        canvas,
        "A child completes a 15-minute mission, receives warm feedback within 8 seconds, and the parent view reflects a new insight.",
        PAGE_W - 312, 151, 244, size=10.5, leading=14, color=NAVY, bold=True,
    )
    draw_footer(canvas, 1)
    canvas.showPage()


def draw_architecture(canvas: Canvas):
    draw_title(
        canvas,
        "02 · System architecture",
        "One safe loop from child input to parent insight",
        "The mobile app stays simple. Supabase owns data and server-side logic. OpenAI is accessed only from protected functions.",
    )

    y = 292
    mobile_x, mobile_w = 42, 196
    edge_x, edge_w = 323, 202
    supa_x, supa_w = 612, 188
    h = 148

    card(canvas, mobile_x, y, mobile_w, h, "1 · Expo mobile app",
         "Onboarding, cartoon buddy selection, daily missions, answer capture, feedback, badges, streaks, and parent view.",
         fill=SKY, accent=LEARN)
    tag(canvas, mobile_x + 14, y + 18, "Child + parent", YELLOW)

    card(canvas, edge_x, y, edge_w, h, "2 · Supabase Edge Functions",
         "Protected orchestration layer. Validates requests, checks cache, calls AI, writes results, adapts difficulty, and awards badges.",
         fill=LAVENDER, accent=CREATE)
    tag(canvas, edge_x + 14, y + 18, "Server-side only", BLUSH)

    card(canvas, supa_x, y, supa_w, h, "3 · Supabase platform",
         "Auth, Postgres, Row-Level Security, private photo storage, and the source of truth for child progress.",
         fill=MINT, accent=GREEN)
    tag(canvas, supa_x + 14, y + 18, "Secure data layer", YELLOW)

    arrow(canvas, mobile_x + mobile_w + 8, y + 76, edge_x - 10, y + 76)
    arrow(canvas, edge_x + edge_w + 8, y + 76, supa_x - 10, y + 76)
    set_font(canvas, True, 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(282, y + 90, "HTTPS / JWT")
    canvas.drawCentredString(568, y + 90, "read + write")

    ai_y = 112
    card(canvas, 42, ai_y, 270, 118, "AI intelligence layer",
         "OpenAI gpt-4o-mini generates age-appropriate missions. omni-moderation-latest screens child input before evaluation. gpt-4o returns warm feedback, skill scores, and next difficulty.",
         fill=BLUSH, accent=ORANGE, title_size=11)
    tag(canvas, 56, ai_y + 14, "Never called from the app", NAVY, white)

    card(canvas, 346, ai_y, 246, 118, "Automation layer",
         "Make.com runs weekly: collect recent evaluations, ask OpenAI for a parent-friendly digest, save it, and send the email.",
         fill=YELLOW, accent=ORANGE, title_size=11)
    tag(canvas, 360, ai_y + 14, "Weekly digest", NAVY, white)

    card(canvas, 626, ai_y, 174, 118, "Developer tools",
         "Replit hosts the project. Postman proves the AI and API contracts. OpenAPI keeps client/server shapes aligned.",
         fill=CARD, accent=LEARN, title_size=11)
    tag(canvas, 640, ai_y + 14, "Build + verify", SKY)

    arrow(canvas, edge_x + 40, y - 8, 180, ai_y + 124, CREATE)
    arrow(canvas, supa_x + 80, y - 8, 460, ai_y + 124, GREEN)
    set_font(canvas, True, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(144, 261, "AI requests")
    canvas.drawString(470, 261, "weekly data")

    rounded_card(canvas, 42, 60, 758, 33, fill=NAVY, stroke=NAVY, radius=10)
    set_font(canvas, True, 10)
    canvas.setFillColor(YELLOW)
    canvas.drawString(57, 71, "Key rule:")
    set_font(canvas, False, 9)
    canvas.setFillColor(white)
    canvas.drawString(112, 71, "the OpenAI key, service-role key, and child data operations stay behind server-side controls.")
    draw_footer(canvas, 2)
    canvas.showPage()


def draw_modules(canvas: Canvas):
    draw_title(
        canvas,
        "03 · Modules",
        "The modules needed to develop the full product",
        "Each module owns one responsibility. This keeps the child experience fast, the data private, and the AI replaceable.",
    )
    columns = [
        (42, 246, "Mobile experience", SKY, LEARN, [
            ("Onboarding", "Name, age, interests, and cartoon companion. Collect only minimum child data."),
            ("Mission home", "Three daily pillars, progress, streak, and stars."),
            ("Mission runner", "Instructions, text or photo response, submit state, and retry state."),
            ("Feedback + badges", "Warm child feedback, badge animation, difficulty update, and next step."),
            ("Parent view", "Skill paths, insights, badge shelf, and weekly note."),
        ]),
        (298, 246, "Supabase backend", MINT, GREEN, [
            ("Auth", "Parent identity and session token."),
            ("Postgres", "Parents, children, profiles, missions, responses, evaluations, badges, digests."),
            ("RLS", "Every child-scoped row is accessible only to the owning parent."),
            ("Storage", "Private bucket for optional child photos; signed URLs only."),
            ("Edge Functions", "generate-mission, submit-response, get-progress."),
        ]),
        (554, 246, "AI + operations", BLUSH, ORANGE, [
            ("Mission generator", "gpt-4o-mini; adapts to age, interests, pillar, and difficulty."),
            ("Safety gate", "omni-moderation-latest runs before evaluation."),
            ("Evaluator", "gpt-4o; returns praise, insight, skills, effort, and next difficulty."),
            ("Weekly digest", "Make.com assembles and sends a plain-language parent update."),
            ("Testing + delivery", "Postman, Replit, Expo Go, and OpenAPI/codegen."),
        ]),
    ]
    for x, w, title, fill, accent, items in columns:
        rounded_card(canvas, x, 132, w, 330, fill=fill)
        canvas.setFillColor(accent)
        canvas.roundRect(x, 456, w, 6, 3, fill=1, stroke=0)
        set_font(canvas, True, 14)
        canvas.setFillColor(NAVY)
        canvas.drawString(x + 16, 435, title)
        yy = 404
        for item_title, body in items:
            canvas.setFillColor(accent)
            canvas.circle(x + 23, yy + 2, 5, fill=1, stroke=0)
            set_font(canvas, True, 10)
            canvas.setFillColor(NAVY)
            canvas.drawString(x + 36, yy, item_title)
            yy = draw_wrapped(canvas, body, x + 36, yy - 13, w - 55, size=8.5, leading=11, color=MUTED, max_lines=3) - 17

    rounded_card(canvas, 42, 57, 758, 49, fill=NAVY, stroke=NAVY, radius=12)
    set_font(canvas, True, 10)
    canvas.setFillColor(YELLOW)
    canvas.drawString(57, 84, "Recommended ownership")
    set_font(canvas, False, 9)
    canvas.setFillColor(white)
    draw_wrapped(canvas, "Expo owns interaction and presentation. Supabase owns identity, data, and protected orchestration. OpenAI owns language intelligence. Make.com owns scheduled communication.", 178, 84, 600, size=9, leading=12, color=white)
    draw_footer(canvas, 3)
    canvas.showPage()


def draw_flows(canvas: Canvas):
    draw_title(
        canvas,
        "04 · Connected flows",
        "Three journeys that prove the product works",
        "The full app is valuable because each flow ends in a visible outcome: a child action, a safer evaluation, or parent understanding.",
    )
    rounded_card(canvas, 42, 337, 758, 117, fill=SKY)
    tag(canvas, 58, 424, "A · First-time setup", LEARN)
    steps = [
        ("1", "Parent signs in", "Supabase Auth creates the session."),
        ("2", "Child profile", "Name, age, interests, buddy."),
        ("3", "Skill profile", "Create three pillar rows at difficulty 2."),
        ("4", "Ready", "Home screen shows the first daily trail."),
    ]
    for i, (number, title, body) in enumerate(steps):
        x = 58 + i * 184
        numbered_step(canvas, x, 350, number, title, body, accent=LEARN, width=166)
        if i < len(steps) - 1:
            arrow(canvas, x + 153, 365, x + 178, 365, LEARN)

    rounded_card(canvas, 42, 193, 758, 117, fill=BLUSH)
    tag(canvas, 58, 280, "B · Daily mission loop", ORANGE)
    steps = [
        ("1", "Get mission", "Cache today’s pillar mission first."),
        ("2", "Moderate", "Block unsafe text before AI evaluation."),
        ("3", "Evaluate", "Praise, insight, effort, skills."),
        ("4", "Adapt", "Update streak, difficulty, badge, status."),
    ]
    for i, (number, title, body) in enumerate(steps):
        x = 58 + i * 184
        numbered_step(canvas, x, 206, number, title, body, accent=ORANGE, width=166)
        if i < len(steps) - 1:
            arrow(canvas, x + 153, 221, x + 178, 221, ORANGE)

    rounded_card(canvas, 42, 49, 758, 117, fill=MINT)
    tag(canvas, 58, 136, "C · Weekly parent digest", GREEN)
    steps = [
        ("1", "Schedule", "Make.com runs every Sunday."),
        ("2", "Collect", "Read the week’s evaluations."),
        ("3", "Summarize", "OpenAI writes plain language."),
        ("4", "Deliver", "Save digest and email parent."),
    ]
    for i, (number, title, body) in enumerate(steps):
        x = 58 + i * 184
        numbered_step(canvas, x, 62, number, title, body, accent=GREEN, width=166)
        if i < len(steps) - 1:
            arrow(canvas, x + 153, 77, x + 178, 77, GREEN)
    draw_footer(canvas, 4)
    canvas.showPage()


def draw_delivery(canvas: Canvas):
    draw_title(
        canvas,
        "05 · Build and safety plan",
        "Build order, guardrails, and what stays out of MVP",
        "Start with one complete vertical slice. Then add polish, parent context, and automation without widening the product too early.",
    )
    rounded_card(canvas, 42, 305, 476, 152, fill=CARD)
    set_font(canvas, True, 13)
    canvas.setFillColor(NAVY)
    canvas.drawString(58, 430, "Recommended build order")
    phases = [
        ("01", "Foundation", "Supabase project, Auth, schema, RLS, private storage."),
        ("02", "AI proof", "Test generation, moderation, and evaluator JSON in Postman."),
        ("03", "Core functions", "Generate, submit, and progress endpoints."),
        ("04", "Mobile vertical slice", "Onboarding → mission → answer → feedback."),
        ("05", "Parent context", "Insights, badges, streaks, and weekly digest."),
    ]
    yy = 403
    for number, title, body in phases:
        canvas.setFillColor(ORANGE)
        canvas.circle(67, yy + 2, 10, fill=1, stroke=0)
        set_font(canvas, True, 6.5)
        canvas.setFillColor(NAVY)
        canvas.drawCentredString(67, yy, number)
        set_font(canvas, True, 9.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(85, yy, title)
        draw_wrapped(canvas, body, 166, yy, 330, size=8.5, leading=10, color=MUTED)
        yy -= 25

    rounded_card(canvas, 544, 305, 256, 152, fill=MINT)
    set_font(canvas, True, 13)
    canvas.setFillColor(NAVY)
    canvas.drawString(560, 430, "Non-negotiable guardrails")
    guardrails = [
        "No OpenAI call from the mobile client.",
        "RLS enabled before real child data.",
        "Private photo bucket; signed URLs only.",
        "Moderation before evaluation.",
        "Cache one mission per pillar per day.",
        "Collect first name and age only.",
    ]
    yy = 406
    for item in guardrails:
        canvas.setFillColor(GREEN)
        canvas.circle(567, yy + 3, 4, fill=1, stroke=0)
        draw_wrapped(canvas, item, 580, yy, 201, size=8.5, leading=10, color=NAVY)
        yy -= 21

    rounded_card(canvas, 42, 75, 758, 196, fill=NAVY, stroke=NAVY)
    set_font(canvas, True, 13)
    canvas.setFillColor(YELLOW)
    canvas.drawString(58, 242, "Deliberately out of scope for the first release")
    out = [
        ("Audio-first missions", "Start with text and optional photo upload; add voice after the core loop is reliable."),
        ("Multiple children", "Keep one child profile per parent until the parent experience is proven."),
        ("Payments and schools", "No subscriptions, school accounts, or leaderboards in the MVP."),
        ("Multi-language content", "Keep one language and one age band so tone and safety are easier to validate."),
    ]
    for i, (title, body) in enumerate(out):
        x = 58 + (i % 2) * 365
        y = 203 - (i // 2) * 66
        set_font(canvas, True, 10)
        canvas.setFillColor(white)
        canvas.drawString(x, y, title)
        draw_wrapped(canvas, body, x, y - 15, 320, size=8.5, leading=11, color=HexColor("#DDE8EE"))

    draw_footer(canvas, 5)
    canvas.save()


def render_pdf():
    canvas = Canvas(str(PDF_PATH), pagesize=landscape(A4), pageCompression=1)
    draw_cover(canvas)
    draw_architecture(canvas)
    draw_modules(canvas)
    draw_flows(canvas)
    draw_delivery(canvas)
    print(PDF_PATH)


if __name__ == "__main__":
    render_pdf()
    import fitz

    document = fitz.open(PDF_PATH)
    page = document.load_page(1)
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
    pixmap.save(JPG_PATH)
    print(JPG_PATH)