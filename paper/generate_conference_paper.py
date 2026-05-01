#!/usr/bin/env python3
"""Generate the ZTaaS conference paper as a DOCX formatted to the Springer
LNCS proceedings style used by the Honey Pot project paper.

Content source:
  * paper/build_paper.py (the original author-curated manuscript text)
  * paper/diagrams/*.png (rendered Mermaid diagrams)

Formatting target:
  * Springer LNCS proceedings template (splnproc2510_mac.docm)
  * Springer Nature Manuscript Format (Manuscript format.pdf)

LNCS rules applied:
  * A4 page, moderate margins (~25.4 mm).
  * Body font Times New Roman, 10 pt, fully justified, line spacing 1.15.
  * Title 14 pt bold, centered, no underline/border.
  * 1st-level heading 12 pt bold, numbered, no trailing period ("1 Introduction").
  * 2nd-level heading 10 pt bold ("2.1 Subsection").
  * Abstract 9 pt with left/right indent and bold run-in label "Abstract.".
  * Keywords 9 pt with bold run-in label "Keywords:".
  * First paragraph of every section and every paragraph that follows a figure,
    table, or code listing has no first-line indent; subsequent paragraphs are
    indented 0.2".
  * Figure captions placed BELOW the figure, prefixed "Fig. N.", 9 pt.
  * Table captions placed ABOVE the table, prefixed "Table N.", 9 pt.
  * Citations kept as bracketed numerical style [n]; references list in LNCS
    layout with hanging indent.
  * All text rendered in black.

Authors for this paper:
  * Dr. G. Janaka Sudha — Associate Professor, CSE, Sri Venkateswara
    College of Engineering.
  * Purushothaman R — UG Student, CSE, Sri Venkateswara College of
    Engineering.

Output is written to paper/ZTaaS_Conference_Paper_LNCS.docx.
The existing paper/ZTaaS_Conference_Paper.docx is NOT modified.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


HERE = Path(__file__).resolve().parent
DIAGRAM_DIR = HERE / "diagrams"
OUT_PATH = HERE / "ZTaaS_Conference_Paper_LNCS.docx"

BODY_FONT = "Times New Roman"
CODE_FONT = "Courier New"

BODY_SIZE = Pt(10)
SMALL_SIZE = Pt(9)
CODE_SIZE = Pt(9)
TITLE_SIZE = Pt(14)
AUTHOR_SIZE = Pt(11)
AFFIL_SIZE = Pt(10)
H1_SIZE = Pt(12)
H2_SIZE = Pt(10)
LINE_SPACING = 1.15
INDENT = Inches(0.2)
BLACK = RGBColor(0x00, 0x00, 0x00)


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _font(run, *, size=BODY_SIZE, bold=None, italic=None, superscript=None,
          font_name: str = BODY_FONT):
    run.font.name = font_name
    run.font.size = size
    run.font.color.rgb = BLACK
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if superscript:
        run.font.superscript = True


def _set_style(style, *, size=BODY_SIZE, bold=False, italic=False,
               font_name: str = BODY_FONT):
    f = style.font
    f.name = font_name
    f.size = size
    f.bold = bold
    f.italic = italic
    f.color.rgb = BLACK


_EMPHASIS = re.compile(r"\*([^*\n]+)\*")


def add_emphasised_runs(paragraph, text: str, *, size=BODY_SIZE):
    """Render *word* markdown emphasis as italic runs, everything else plain."""
    idx = 0
    for m in _EMPHASIS.finditer(text):
        start, end = m.span()
        if start > idx:
            _font(paragraph.add_run(text[idx:start]), size=size)
        _font(paragraph.add_run(m.group(1)), size=size, italic=True)
        idx = end
    if idx < len(text):
        _font(paragraph.add_run(text[idx:]), size=size)


def _set_cell_border(cell, sz: int = 4) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        e = OxmlElement(f"w:{edge}")
        e.set(qn("w:val"), "single")
        e.set(qn("w:sz"), str(sz))
        e.set(qn("w:color"), "000000")
        borders.append(e)
    tcPr.append(borders)


# ---------------------------------------------------------------------------
# Document-level configuration
# ---------------------------------------------------------------------------

def configure_document(doc: Document) -> None:
    _set_style(doc.styles["Normal"], size=BODY_SIZE)
    _set_style(doc.styles["Heading 1"], size=H1_SIZE, bold=True)
    _set_style(doc.styles["Heading 2"], size=H2_SIZE, bold=True)
    _set_style(doc.styles["Title"], size=TITLE_SIZE, bold=True)

    # Force black colour on the default heading styles so that Word cannot
    # paint the front page headings in any theme accent colour.
    for style_name in ("Heading 1", "Heading 2", "Heading 3", "Heading 4", "Title"):
        try:
            style = doc.styles[style_name]
        except KeyError:
            continue
        rPr = style.element.get_or_add_rPr()
        existing = rPr.find(qn("w:color"))
        if existing is not None:
            rPr.remove(existing)
        color = OxmlElement("w:color")
        color.set(qn("w:val"), "000000")
        rPr.append(color)

    for section in doc.sections:
        section.page_height = Cm(29.7)
        section.page_width = Cm(21.0)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)


# ---------------------------------------------------------------------------
# Structural blocks
# ---------------------------------------------------------------------------

def add_title(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="Title")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(10)
    _font(p.add_run(text), size=TITLE_SIZE, bold=True)

    # Suppress every border on the title paragraph — the default "Title" style
    # in the Word template draws a thin rule underneath the heading.
    pPr = p._p.get_or_add_pPr()
    existing = pPr.find(qn("w:pBdr"))
    if existing is not None:
        pPr.remove(existing)
    pBdr = OxmlElement("w:pBdr")
    for side in ("top", "left", "bottom", "right", "between"):
        edge = OxmlElement(f"w:{side}")
        edge.set(qn("w:val"), "nil")
        pBdr.append(edge)
    pPr.append(pBdr)


def add_authors_block(doc: Document) -> None:
    """Author block: Dr. G. Janaka Sudha + Purushothaman R at SVCE CSE."""
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_after = Pt(4)
    p1.paragraph_format.line_spacing = LINE_SPACING

    def author(name: str, sup: str, sep: str = ""):
        _font(p1.add_run(name), size=AUTHOR_SIZE)
        _font(p1.add_run(sup), size=AUTHOR_SIZE, superscript=True)
        if sep:
            _font(p1.add_run(sep), size=AUTHOR_SIZE)

    author("Dr. G. Janaka Sudha", "1", ", ")
    author("Purushothaman R", "2", "")

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_after = Pt(2)
    p2.paragraph_format.line_spacing = LINE_SPACING
    _font(p2.add_run("1"), size=AFFIL_SIZE, superscript=True)
    _font(p2.add_run("Associate Professor, "), size=AFFIL_SIZE)
    _font(p2.add_run("2"), size=AFFIL_SIZE, superscript=True)
    _font(p2.add_run("UG Student, "), size=AFFIL_SIZE)
    _font(p2.add_run("1,2"), size=AFFIL_SIZE, superscript=True)
    _font(p2.add_run("Department of Computer Science and Engineering, "),
          size=AFFIL_SIZE)
    _font(p2.add_run("1,2"), size=AFFIL_SIZE, superscript=True)
    _font(p2.add_run("Sri Venkateswara College of Engineering,"),
          size=AFFIL_SIZE)

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_after = Pt(2)
    p3.paragraph_format.line_spacing = LINE_SPACING
    _font(
        p3.add_run(
            "Pennalur, Sriperumbudur, Kancheepuram Dt, Tamil Nadu, India - 602117"
        ),
        size=AFFIL_SIZE,
    )

    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4.paragraph_format.space_after = Pt(12)
    p4.paragraph_format.line_spacing = LINE_SPACING
    _font(p4.add_run("1"), size=AFFIL_SIZE, superscript=True)
    _font(p4.add_run("janakasudhag@svce.ac.in, "), size=AFFIL_SIZE)
    _font(p4.add_run("2"), size=AFFIL_SIZE, superscript=True)
    _font(p4.add_run("purushothamanramalingam22@gmail.com"), size=AFFIL_SIZE)


def add_abstract(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.right_indent = Inches(0.3)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = LINE_SPACING
    _font(p.add_run("Abstract. "), size=SMALL_SIZE, bold=True)
    add_emphasised_runs(p, text, size=SMALL_SIZE)


def add_keywords(doc: Document, keywords: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.right_indent = Inches(0.3)
    p.paragraph_format.space_after = Pt(14)
    p.paragraph_format.line_spacing = LINE_SPACING
    _font(p.add_run("Keywords: "), size=SMALL_SIZE, bold=True)
    _font(p.add_run(keywords), size=SMALL_SIZE)


def h1(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="Heading 1")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = LINE_SPACING
    _font(p.add_run(text), size=H1_SIZE, bold=True)


def h2(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="Heading 2")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = LINE_SPACING
    _font(p.add_run(text), size=H2_SIZE, bold=True)


def body(doc: Document, text: str, *, first_of_section: bool = False) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = LINE_SPACING
    p.paragraph_format.first_line_indent = Inches(0) if first_of_section else INDENT
    add_emphasised_runs(p, text, size=BODY_SIZE)


def add_bullets(doc: Document, items: Iterable[str]) -> None:
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = LINE_SPACING
        _font(p.add_run(item), size=BODY_SIZE)


def add_figure(
    doc: Document,
    image_path: Path,
    caption: str,
    *,
    width_inches: float = 5.2,
    justify: bool = False,
) -> None:
    if not image_path.is_file():
        raise FileNotFoundError(f"Missing figure image: {image_path}")
    pic = doc.add_paragraph()
    pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pic.paragraph_format.space_before = Pt(6)
    pic.paragraph_format.space_after = Pt(2)
    pic.add_run().add_picture(str(image_path), width=Inches(width_inches))

    cap = doc.add_paragraph()
    cap.alignment = (
        WD_ALIGN_PARAGRAPH.JUSTIFY if justify else WD_ALIGN_PARAGRAPH.CENTER
    )
    cap.paragraph_format.space_after = Pt(12)
    cap.paragraph_format.line_spacing = LINE_SPACING
    _font(cap.add_run(caption), size=SMALL_SIZE)


def add_table_caption(doc: Document, caption: str) -> None:
    """LNCS style: table captions sit ABOVE the table."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = LINE_SPACING
    _font(p.add_run(caption), size=SMALL_SIZE)


def add_table(
    doc: Document,
    headers: Sequence[str],
    rows: Sequence[Sequence[str]],
    col_widths_cm: Sequence[float] | None = None,
) -> None:
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER

    for i, header in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = ""
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _font(p.add_run(header), size=SMALL_SIZE, bold=True)
        c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    for ri, row in enumerate(rows, start=1):
        for ci, val in enumerate(row):
            c = t.rows[ri].cells[ci]
            c.text = ""
            p = c.paragraphs[0]
            _font(p.add_run(str(val)), size=SMALL_SIZE)
            c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    for row in t.rows:
        for cell in row.cells:
            _set_cell_border(cell)

    if col_widths_cm:
        for ci, w in enumerate(col_widths_cm):
            for row in t.rows:
                row.cells[ci].width = Cm(w)

    # Small trailing spacer so the next paragraph is clearly separated.
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(6)


def add_code(doc: Document, code: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = LINE_SPACING
    _font(p.add_run(code), size=CODE_SIZE, font_name=CODE_FONT)


def add_reference(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = LINE_SPACING
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.first_line_indent = Inches(-0.25)
    _font(p.add_run(text), size=SMALL_SIZE)


# ---------------------------------------------------------------------------
# Content — ported verbatim from paper/build_paper.py
# ---------------------------------------------------------------------------

TITLE_TEXT = (
    "AI-Driven Zero Trust Security-as-a-Service: A Gateway-Centric "
    "Architecture with Isolation Forest-Based Continuous Trust "
    "Evaluation for Cloud-Native Applications"
)

ABSTRACT_TEXT = (
    "Cloud-native back-ends fail open in a particular and uncomfortable way. "
    "Once a user has cleared the login form and a JWT has been minted, the "
    "request path stops asking questions. Role-Based Access Control (RBAC) "
    "treats every subsequent call as equally trustworthy, even when the "
    "behaviour around it has shifted in ways an operator would notice "
    "instantly. This paper describes ZTaaS, an AI-driven Zero Trust "
    "Security-as-a-Service platform built around an external reverse-proxy "
    "gateway that re-evaluates trust on every hop. ZTaaS combines a Node.js "
    "gateway that performs JWKS-based RS256 verification, runtime policy "
    "evaluation and short-lived internal token translation; a continuous "
    "telemetry pipeline that captures behavioural features into MongoDB and "
    "recomputes per-tenant baselines on a scheduled job; a low-latency "
    "deviation-based risk score in the request path paired with an "
    "asynchronous Isolation Forest model running off a RabbitMQ queue; and "
    "an adaptive enforcement layer that maps the resulting score onto allow, "
    "step-up, or block actions without touching the protected back-end. "
    "We describe the multi-window feature extraction (60 s, 10 min, 60 min) "
    "used to keep freshly authenticated users out of the false-positive "
    "bucket, the weighted deviation score, and the unsupervised model "
    "bootstrapped on a synthetic baseline of normal traffic with a small "
    "number of injected anomalies. The implementation runs in Node.js, "
    "Python and React. End-to-end tests show that authentication and "
    "authorisation can be enforced as a single source of truth at the edge, "
    "that high-risk sessions are short-circuited at the proxy boundary, and "
    "that the analytics fan-out adds no measurable latency to the request "
    "path under nominal load."
)

KEYWORDS = (
    "Zero Trust Architecture, Security-as-a-Service, API Gateway, "
    "Continuous Authentication, Anomaly Detection, Isolation Forest, "
    "Cloud-Native Security, Policy-as-Code"
)

# --------------------------------------------------------------------------
# Section 1: Introduction
# --------------------------------------------------------------------------

INTRO_PARAGRAPHS_BEFORE_BULLETS: List[str] = [
    (
        "Modern back-ends are mostly seams. A typical cloud-native deployment "
        "fans out across dozens of services, each one reachable through a "
        "documented HTTP API and several less documented internal ones. "
        "Authentication is delegated to an identity provider; authorisation "
        "is bolted into the application code in pieces that have grown over "
        "time. The result is a system in which trust is established at "
        "login and then assumed to persist for the lifetime of a token. That "
        "assumption breaks the moment a credential is phished, a refresh "
        "token is replayed, or an authenticated session is hijacked from a "
        "second device [1, 4]."
    ),
    (
        "Zero Trust is, in principle, the answer: never trust, always "
        "verify [10]. In practice, the principle has to be operationalised "
        "without a rewrite of the protected workload. Existing offerings "
        "either ship as SDKs that the application embeds (intrusive), or as "
        "vendor-locked control planes wired to a single cloud, or as "
        "narrowly scoped point solutions for one signal such as device "
        "posture [3, 7]. The gap that motivated this work is the absence of "
        "an external, application-independent gateway that performs the "
        "ongoing trust evaluation itself, scores user behaviour with a "
        "lightweight ML pipeline, and translates the result into "
        "policy-driven enforcement without asking the back-end to change."
    ),
    (
        "ZTaaS sits in front of an unmodified HTTP back-end and takes over "
        "every per-request security decision. External JWTs are verified "
        "through a cached JWKS; declarative authorisation policies are "
        "evaluated per tenant; behavioural features are streamed to "
        "MongoDB; and a deviation-based score is computed on the request "
        "path. The same feature vector is published asynchronously to a "
        "Python service that runs an Isolation Forest [9] and writes a "
        "richer anomaly record back to the data store. The score is mapped "
        "through tenant-specific thresholds — defaulting to 0.7 for HIGH "
        "and 0.4 for MEDIUM — and the gateway responds with allow, "
        "step-up (HTTP 401) or block (HTTP 403) before the back-end ever "
        "sees the request."
    ),
    "The concrete contributions of this work are the following.",
]

INTRO_BULLETS: List[str] = [
    (
        "A reference implementation of an external Zero Trust gateway in "
        "Node.js that combines JWKS-based JWT verification, runtime "
        "policy-as-code, and short-lived internal token translation, with "
        "a clear trust boundary maintained through a shared gateway secret."
    ),
    (
        "A continuous behavioural telemetry pipeline that extracts a "
        "stable, capped feature set per user and tenant over 60 s / 10 min / "
        "60 min sliding windows, persists it in MongoDB, and recomputes "
        "tenant-level baselines on a scheduled job."
    ),
    (
        "A two-tier risk evaluation strategy: a fast, deterministic "
        "deviation-based score in the request path, paired with an "
        "asynchronous Isolation Forest service that consumes the same "
        "feature stream over RabbitMQ and records anomaly labels for "
        "offline review."
    ),
    (
        "A working, test-covered evaluation that exercises cold-start "
        "handling, policy-driven enforcement, multi-tenant isolation and "
        "the gateway-as-sole-authority guarantee, including the "
        "MISSING_GATEWAY_IDENTITY rejection path when the back-end is "
        "reached directly."
    ),
]

INTRO_TAIL: str = (
    "Section 2 places ZTaaS in the context of recent Zero Trust "
    "literature. Section 3 walks through the architecture and the "
    "request lifecycle, including all five diagrams referenced from "
    "the body. Section 4 covers the methodology — feature extraction, "
    "the deviation score, and the Isolation Forest configuration. "
    "Section 5 describes how the system is built and wired in "
    "practice. Section 6 reports end-to-end behaviour. Sections 7 "
    "and 8 discuss what we learned and where the work goes next."
)

# --------------------------------------------------------------------------
# Section 2: Related Work
# --------------------------------------------------------------------------

RELATED_PARAGRAPHS: List[str] = [
    (
        "Recent work on Zero Trust spans behavioural biometrics, "
        "trust-scoring frameworks, blockchain-anchored identity and "
        "ML-driven anomaly detection [1, 5, 8]. Nagarajan et al. propose "
        "an AI-based zero-trust pipeline for the consumer industry that "
        "fuses smartphone-sensor behavioural biometrics with a Bayesian "
        "trust score, enabling grant/deny/quarantine decisions at the "
        "workload boundary [1]. Zhang et al. apply Dirichlet-based "
        "dynamic trust evaluation to federated-learning clients to "
        "mitigate betrayal behaviours, casting aggregation as a min-max "
        "optimisation problem [2]. Rivera et al. integrate "
        "blockchain-anchored zero-knowledge proofs with multi-factor "
        "authentication, replacing centralised identity stores with a "
        "distributed verifier network [3]."
    ),
    (
        "On the resilience and detection axis, Ahn et al. integrate Zero "
        "Trust principles with the MITRE ATT&CK matrix to derive "
        "measurable resilience indices for phishing, ransomware and APT "
        "scenarios [4]. Sasada et al. propose web-biometrics for "
        "browser-based behavioural verification with sub-130 ms response "
        "times, a useful target for SaaS gateways [5]. Stodt et al. "
        "describe a context-aware dynamic Zero Trust architecture for "
        "IIoT that combines threat assessment with fuzzy logic for "
        "real-time permission adjustment [6]. ZEBRA introduces a Ring "
        "Oscillator PUF combined with blockchain to provide "
        "hardware-anchored device identity and tamper-proof access "
        "logging [7]. UCAP, by Lee et al., proposes an unconscious "
        "continuous authentication protocol based on keystroke dynamics, "
        "with simultaneous user-and-device verification and dynamic "
        "trust evaluation [8]."
    ),
    (
        "What separates ZTaaS from this body of work is mostly form "
        "factor and pragmatism. The whole platform is delivered as a "
        "drop-in reverse proxy: any HTTP back-end can be slipped behind "
        "it without code changes, which keeps the security layer "
        "genuinely application-independent. The risk pipeline is split "
        "deliberately — a deterministic, very cheap score on the "
        "request path, plus a heavier Isolation Forest pass that runs "
        "off a queue — so model freshness and availability never become "
        "a tax on user-facing latency. And tenancy is wired into every "
        "store: policies, baselines and risk thresholds are all keyed by "
        "tenantId, with a runtime admin surface (REST + a small React UI) "
        "for changing them without redeploying."
    ),
]

# --------------------------------------------------------------------------
# Section 3: System Architecture
# --------------------------------------------------------------------------

ARCH_INTRO = (
    "Figure 1 sketches how the four runtime components fit together. "
    "The gateway is the only piece that talks to MongoDB and "
    "RabbitMQ. The back-end never opens a connection to either; if "
    "MongoDB is down, the gateway fails open on risk computation "
    "(see Section 5.4) and the back-end is none the wiser. The admin "
    "UI is a small React application that drives the gateway's "
    "/admin/* endpoints — it is convenient, but the system is fully "
    "operable through curl alone."
)

FIG1_CAPTION = (
    "Fig. 1. ZTaaS high-level architecture. The gateway sits in front of "
    "the protected back-end and is the only platform component that talks "
    "to the data plane (MongoDB + RabbitMQ). The ML service runs off the "
    "request path."
)

ARCH_3_1_TABLE_CAPTION = (
    "Table 1. ZTaaS platform components and their responsibilities. The "
    "protected back-end is intentionally not listed: ZTaaS sits in front "
    "of any HTTP back-end and the bundled sample service is only used "
    "for local testing."
)

ARCH_3_1_TABLE_HEADERS = ["Component", "Responsibility"]
ARCH_3_1_TABLE_ROWS = [
    ["Admin UI",
     "Manage policies, JWT configuration, baselines and risk thresholds"],
    ["Gateway",
     "Authentication, authorisation, telemetry, risk scoring, JWT "
     "translation, reverse proxy"],
    ["ML Service",
     "Consume features from the queue, score anomalies, persist results"],
    ["MongoDB",
     "Telemetry, policies, baselines, risk_scores"],
    ["RabbitMQ",
     "Asynchronous feature stream (queue: ml.features)"],
]
ARCH_3_1_COL_WIDTHS = [3.5, 11.0]

ARCH_3_2_INTRO = (
    "Figure 2 traces what happens between the inbound TCP connection "
    "and the outbound proxy call. The middleware chain is wired once, "
    "in proxy.routes.js, and each stage extends req with the "
    "artefacts that the next one needs:"
)

ARCH_3_2_CODE = (
    "router.all('*',\n"
    "  identityMiddleware,        // 1. JWKS verify, attach req.identity\n"
    "  telemetryMiddleware,       // 2. record per-request features\n"
    "  riskMiddleware,            // 3. compute score, publish, maybe block\n"
    "  authorizationMiddleware,   // 4. evaluate policy-as-code\n"
    "  jwtTranslationMiddleware,  // 5. mint short-lived internal JWT\n"
    "  handleProxyRequest         // 6. forward to back-end\n"
    ");"
)

FIG2_CAPTION = (
    "Fig. 2. Per-request middleware chain inside the gateway. The chain is "
    "wired once in proxy.routes.js; each stage reads or extends req with "
    "the artefacts the next stage needs."
)

ARCH_3_2_BODY = (
    "Stage 1 verifies the external JWT against a JWKS cached for ten "
    "minutes and rate-limited to ten fetches per minute. Stage 2 "
    "writes a telemetry document for the request — endpoint, method, "
    "IP, user agent, latency and status — and is what feeds every "
    "downstream analytical query. Stage 3 is the operational heart "
    "of the system: it reads the user's recent behaviour out of "
    "MongoDB, computes a deviation score against the baseline, "
    "publishes the same feature vector to the ml.features queue, and "
    "may short-circuit the chain with a 401 or 403 before any further "
    "processing happens. Stages 4 and 5 then perform the policy "
    "decision and translate the request to an internal RS256-signed "
    "token that lives for one minute. Stage 6 forwards everything "
    "to the back-end with client-controlled X-User-* headers stripped "
    "and the trusted versions injected."
)

ARCH_3_3_BODY = (
    "Figure 5 captures the trust model as a layered diagram. The "
    "back-end is configured to refuse to start unless "
    "AUTHZ_SOURCE=gateway, and on every request it checks a shared "
    "gateway secret before reading the X-User-* headers. Identity "
    "headers from clients are never trusted; the proxy strips them "
    "before forwarding. JWT validation can run in audit or enforce "
    "mode at the back-end for additional defence in depth, but the "
    "back-end takes no authorisation decision on its own. The phrase "
    "we used internally during code review captures the model: "
    "\u201cif this request reached the back-end, the gateway already "
    "authorised it.\u201d"
)

FIG5_CAPTION = (
    "Fig. 5. Defence-in-depth view of the trust boundary. The gateway is "
    "the single source of truth for both authentication and authorisation; "
    "the back-end runs as a trusted executor."
)

ARCH_3_4_BODY = (
    "The pipeline that takes features from the gateway through the "
    "model and into the analytical store is shown in Figure 3. The "
    "client sees the in-line decision before the message is even "
    "published, which matters: the queue.service publishes "
    "best-effort and silently no-ops if the channel is not yet ready. "
    "If RabbitMQ is down for ten minutes, the gateway logs the "
    "outage, gives up reconnect attempts, and continues to serve "
    "traffic with the deterministic deviation score. Nothing about "
    "the request path depends on the model being healthy."
)

FIG3_CAPTION = (
    "Fig. 3. Sequence diagram of the asynchronous ML pipeline. The "
    "client-facing decision is taken before the message is published; ML "
    "scoring never blocks the request path."
)

# --------------------------------------------------------------------------
# Section 4: Methodology
# --------------------------------------------------------------------------

METH_4_1_BODY = (
    "Each authenticated request triggers an aggregation against the "
    "telemetry collection. The query is one MongoDB aggregation that "
    "computes counts, set sizes, an average, and — slightly less "
    "common — a peak request burst inside any five-second sub-window, "
    "computed with a single linear-time sliding pointer rather than a "
    "second pass. Every numeric output is bounded by a stability cap "
    "so that a single bad five-second window cannot pull a baseline "
    "off into space:"
)

TABLE2_CAPTION = (
    "Table 2. Per-user behavioural features computed by the gateway."
)
TABLE2_HEADERS = ["Feature", "Definition", "Cap"]
TABLE2_ROWS = [
    ["requestsPerMin",   "Total requests in the window",               "1000"],
    ["failureRate",      "failedRequests / requestsPerMin",            "1.0"],
    ["uniqueIPs",        "Distinct source IP addresses",               "50"],
    ["uniqueUserAgents", "Distinct user-agent strings",                "50"],
    ["uniqueEndpoints",  "Distinct path entries accessed",             "200"],
    ["avgResponseTime",  "Mean upstream latency (ms)",                 "30 000"],
    ["authDeniedCount",  "Authorisation denials in window",            "500"],
    ["peakRequestBurst", "Max requests in a 5 s sub-window",           "500"],
    ["writeRatio",       "POST / PUT / DELETE / PATCH share of total", "1.0"],
]
TABLE2_COL_WIDTHS = [3.5, 7.5, 1.8]

METH_4_2_BODY = (
    "A user who logged in three seconds ago has zero requests in the "
    "last sixty seconds. Naively scoring such a user would generate "
    "a flood of 401s on every dashboard load. The gateway therefore "
    "queries three expanding windows in order — 60 s, 10 min, "
    "60 min — and keeps the first one that returns at least one "
    "request. If all three are empty, the user is flagged as "
    "cold-start, a moderate default score of 0.4 is returned, the "
    "request is allowed, and a structured log line surfaces the "
    "situation in dashboards. The fallback path is exactly what "
    "Figure 4 illustrates."
)

FIG4_CAPTION = (
    "Fig. 4. Adaptive risk decision flow. The multi-window fallback is "
    "what keeps freshly authenticated users out of the false-positive "
    "bucket; the cold-start branch surfaces them in logs."
)

METH_4_3_BODY_1 = (
    "The risk service combines four normalised deviation components "
    "against the per-tenant baseline (mean \u03bc and standard deviation "
    "\u03c3). A negative deviation — better than baseline — contributes "
    "zero, so users only accumulate risk by exceeding normal "
    "behaviour. The 3\u03c3 saturation pins each component to the unit "
    "interval and gives the composite score a natural [0, 1] range:"
)

METH_4_3_CODE = (
    "score(value, \u03bc, \u03c3) = clip( max(0, (value \u2212 \u03bc) / \u03c3) / 3, 0, 1 )\n\n"
    "risk = 0.30 \u00b7 requestsScore\n"
    "     + 0.30 \u00b7 failureScore\n"
    "     + 0.20 \u00b7 ipScore\n"
    "     + 0.20 \u00b7 responseTimeScore"
)

METH_4_3_BODY_2 = (
    "The weights came out of a deliberately small calibration "
    "exercise rather than a learned process. Request-rate and "
    "failure-rate spikes turned out to be the most reliable in the "
    "scripted evaluation, so they got the larger weights; latency "
    "and IP diversity behave more like confirmatory signals and got "
    "the smaller ones. Replacing this hand-tuned mix with a learned "
    "weighting once production telemetry is available is one of the "
    "obvious follow-ups (Section 8)."
)

METH_4_4_BODY = (
    "Risk thresholds live in MongoDB on a per-tenant basis. The "
    "default is { highThreshold: 0.7, mediumThreshold: 0.4 }, "
    "constrained at write time so that medium < high. Table 3 "
    "summarises the resulting decision rule."
)

TABLE3_CAPTION = "Table 3. Default ZTaaS adaptive enforcement decision table."
TABLE3_HEADERS = ["Risk score", "Risk level", "Action"]
TABLE3_ROWS = [
    ["score < 0.4",         "LOW",    "Allow"],
    ["0.4 \u2264 score < 0.7", "MEDIUM", "Step-up authentication (HTTP 401)"],
    ["score \u2265 0.7",       "HIGH",   "Block (HTTP 403)"],
]
TABLE3_COL_WIDTHS = [5.0, 4.0, 5.5]

METH_4_5_BODY_1 = (
    "The asynchronous ML service uses an Isolation Forest [9], an "
    "unsupervised ensemble that isolates points by recursive random "
    "partitioning. Points that need fewer splits to isolate are "
    "considered more anomalous, which fits the long-tailed "
    "distribution of API behaviour very well. The model is "
    "configured with n_estimators=100, contamination=0.1 and "
    "random_state=42 for reproducibility. Until production telemetry "
    "for a tenant accumulates, the model is bootstrapped on a "
    "synthetic baseline of 18 representative samples plus three "
    "injected anomalies that calibrate the contamination boundary."
)

METH_4_5_BODY_2 = (
    "For each scoring request, the consumer evaluates the decision "
    "function, normalises the raw score into [0, 1] (1 = anomaly) "
    "and labels the event:"
)

METH_4_5_CODE = (
    "raw   = model.decision_function([requestsPerMin, failureRate,\n"
    "                                 uniqueIPs, avgResponseTime])\n"
    "score = clip(-raw + 0.5, 0, 1)\n"
    "label = 'anomaly' if model.predict() == -1 else 'normal'"
)

METH_4_5_BODY_3 = (
    "Each scored event is persisted with a compound "
    "(userId DESC, timestamp DESC) index so that per-user "
    "retrospectives in the dashboard remain a single seek even as "
    "the collection grows."
)

# --------------------------------------------------------------------------
# Section 5: Implementation
# --------------------------------------------------------------------------

TABLE4_CAPTION = "Table 4. ZTaaS repository structure."
TABLE4_HEADERS = ["Path", "Purpose"]
TABLE4_ROWS = [
    ["gateway/",         "Express-based Zero Trust gateway (port 8081)"],
    ["backend-service/", "Sample protected back-end (port 5001)"],
    ["admin-ui/",        "React + Vite admin dashboard (port 5173)"],
    ["ml-service/",      "Python anomaly detector (RabbitMQ consumer)"],
    ["docs/",            "Step-wise implementation notes and quick references"],
]
TABLE4_COL_WIDTHS = [5.0, 9.5]

IMPL_5_2_BODY_1 = (
    "The gateway boots in src/server.js — a deliberately tiny file. "
    "It connects to MongoDB, loads system configuration, kicks off "
    "the periodic baseline job (every 60 minutes, with an immediate "
    "first run so the baseline collection is never empty after "
    "deploy), and opens the RabbitMQ channel before binding the "
    "Express app on port 8081. The Express layer mounts auth, "
    "admin, JWKS, STS and proxy routers; the wildcard proxy router "
    "applies the chain from Section 3.2."
)

IMPL_5_2_BODY_2 = (
    "JWT verification uses jsonwebtoken with jwks-rsa, with a "
    "ten-minute key cache and a ten-fetches-per-minute rate cap "
    "so the JWKS endpoint cannot be hammered by a misconfigured "
    "gateway. The verified identity carries userId, username, role, "
    "tenant and issuer, and is attached to req.identity. The "
    "internal-JWT translator issues a one-minute RS256 token whose "
    "ctx claim carries the matched policy id, the policy version "
    "and a UTC enforcement timestamp:"
)

IMPL_5_2_CODE = (
    "internalPayload = {\n"
    "  sub: identity.username,\n"
    "  aud: 'backend-service',\n"
    "  ten: identity.tenant || 'default',\n"
    "  ctx: {\n"
    "    schema_ver:     '1.0.0',\n"
    "    decision_id:    policy?.id || 'no-policy',\n"
    "    policy_version: policy?.version || 'none',\n"
    "    enforced_at:    floor(Date.now() / 1000)\n"
    "  }\n"
    "};"
)

IMPL_5_3_BODY = (
    "Every request lands as a document in the telemetry collection "
    "via telemetry.service.js. The baseline job (jobs/baseline.job.js) "
    "discovers all distinct tenants on each tick, then asks the "
    "baseline service to bucket the past hour into one-minute "
    "aggregates and compute mean and standard deviation for each of "
    "the four risk-engine features. The result is upserted into the "
    "baseline collection keyed by (tenantId, windowMs), so the "
    "deviation score in the request path always reads a single, "
    "precomputed document."
)

IMPL_5_4_BODY_1 = (
    "Most of the runtime decision logic lives in risk.middleware.js. "
    "Once it has the deviation score it fans out the same feature "
    "vector to the queue, then checks the tenant policy:"
)

IMPL_5_4_CODE = (
    "if (risk.riskScore >= policy.highThreshold) {\n"
    "  return res.status(403).json({ message: 'Access denied' });\n"
    "}\n"
    "if (risk.riskScore >= policy.mediumThreshold) {\n"
    "  return res.status(401).json({ message: 'Step-up required' });\n"
    "}\n"
    "next();"
)

IMPL_5_4_BODY_2 = (
    "The path is fail-open by design. If the risk computation throws "
    "— typically because MongoDB is briefly unreachable — the "
    "middleware logs the failure, marks the request as fail-open, "
    "and lets it through. We chose this over fail-closed because a "
    "transient analytics outage should never become an availability "
    "incident on the protected back-end. The trade-off is logged and "
    "shows up as a counter on the operator dashboard."
)

IMPL_5_5_BODY_1 = (
    "The Python service is intentionally small — four files, around "
    "two hundred lines in total — to maximise reliability and keep "
    "the operational surface easy to reason about:"
)

TABLE5_CAPTION = "Table 5. Files comprising the asynchronous ML service."
TABLE5_HEADERS = ["File", "Role"]
TABLE5_ROWS = [
    ["app.py",      "Bootstrap: warm up DB and model, then start the consumer loop"],
    ["consumer.py", "RabbitMQ consumer with per-message ack and reconnect retry"],
    ["model.py",    "Isolation Forest training, scoring and normalisation"],
    ["db.py",       "MongoDB client singleton with index management"],
]
TABLE5_COL_WIDTHS = [3.5, 11.0]

IMPL_5_5_BODY_2 = (
    "The consumer pins basic_qos(prefetch_count=1), which means "
    "RabbitMQ never delivers a second message until the first has "
    "been acknowledged. This was a deliberate choice: a single slow "
    "scoring call should not snowball into head-of-line blocking on "
    "the queue. Connection drops trigger a five-second back-off and "
    "indefinite retry. Decoding errors and missing-feature payloads "
    "currently result in an immediate ack — a future revision will "
    "route them to a dead-letter queue rather than swallowing them "
    "silently."
)

IMPL_5_6_BODY = (
    "Operators interact with ZTaaS through both REST APIs and a "
    "small React admin UI. JWT issuer / JWKS / audience "
    "configuration, the enforcement mode (observe vs. enforce), "
    "authorisation policies, risk thresholds, baseline previews and "
    "telemetry browsing are all exposed under the /admin/* "
    "namespace, guarded by an admin identity middleware. Every "
    "configuration change takes effect immediately — there is no "
    "restart, no redeploy and no in-flight request that needs to "
    "be drained."
)

# --------------------------------------------------------------------------
# Section 6: Results and Evaluation
# --------------------------------------------------------------------------

EVAL_6_1_BODY = (
    "End-to-end behaviour was exercised through the test scripts "
    "shipped in the repository (test-features.sh, "
    "test-jwt-translation.sh, test-step5-4-validation.sh, "
    "test-telemetry.sh, scripts/test-risk-middleware.js). Table 6 "
    "summarises the observed outcomes."
)

TABLE6_CAPTION = "Table 6. End-to-end functional results."
TABLE6_HEADERS = ["Scenario", "Expected outcome", "Observed"]
TABLE6_ROWS = [
    ["Login (alice / password123) via gateway",
     "Backend issues RS256 JWT, gateway proxies",
     "200 OK with accessToken"],
    ["GET /orders with valid admin JWT, no policy match",
     "Allow by default",
     "200 OK; AUTHZ decision=allow policy=none"],
    ["GET /orders with admin policy { GET: [admin] }",
     "Allow",
     "200 OK; AUTHZ decision=allow"],
    ["POST /orders by user under policy { POST: [admin] }",
     "Forbidden in enforce mode",
     "403 Forbidden"],
    ["Direct backend hit bypassing gateway",
     "Reject (missing gateway identity)",
     "401 MISSING_GATEWAY_IDENTITY"],
    ["High request burst \u2192 risk \u2265 0.7",
     "Block at gateway",
     "403 Access denied: High risk detected"],
    ["Cold-start user (no telemetry)",
     "Allow with riskScore = 0.4",
     "Allow; reason='No recent behavioral data'"],
]
TABLE6_COL_WIDTHS = [5.5, 5.0, 4.5]

EVAL_6_2_BODY_1 = (
    "Table 7 illustrates representative invocations of the "
    "deviation-based risk engine against a synthetic baseline of "
    "\u03bc=10 req/min, \u03c3=3, \u03bc_failure=0.05, \u03c3_failure=0.02. "
    "The decisions follow Table 3."
)

TABLE7_CAPTION = (
    "Table 7. Indicative risk-engine outputs (illustrative numbers)."
)
TABLE7_HEADERS = ["Case", "req/min", "failure rate", "uniqueIPs",
                  "avg RT (ms)", "score", "Decision"]
TABLE7_ROWS = [
    ["Normal",                  "9",  "0.04", "2",  "200",  "0.00", "Allow"],
    ["Mild burst",              "20", "0.10", "3",  "350",  "0.45", "Step-up"],
    ["Severe burst + failures", "60", "0.55", "10", "1500", "0.92", "Block"],
    ["Cold start (no data)",    "0",  "0.00", "0",  "0",    "0.40", "Allow (cold-start flag)"],
]
TABLE7_COL_WIDTHS = [3.0, 1.7, 1.7, 1.6, 2.0, 1.5, 3.0]

EVAL_6_2_BODY_2 = (
    "These rows exercise the saturation behaviour of the score "
    "function and confirm that a high-risk request is short-"
    "circuited at the gateway — the back-end never sees it."
)

EVAL_6_3_BODY = (
    "The gateway adds a small, bounded amount of work to each "
    "request: a JWKS-cached signature verification, one MongoDB "
    "write for telemetry, one MongoDB aggregation for the user "
    "feature window, an in-memory policy lookup, and a single "
    "RS256 sign for the internal JWT. The RabbitMQ publish is "
    "non-blocking — the queue.service publishes best-effort and "
    "skips silently if the channel is not yet ready, so the "
    "proxied request is never delayed by the analytics fan-out. "
    "The ML service runs entirely off the request path, which "
    "means client-observed p99 latency is independent of model "
    "throughput. In the developer setup (MongoDB, RabbitMQ and "
    "all four services running locally on a single laptop) the "
    "end-to-end latency for a /orders call was dominated by the "
    "simulated back-end's 50\u2013100 ms artificial delay rather than "
    "by gateway overhead."
)

# --------------------------------------------------------------------------
# Section 7: Discussion
# --------------------------------------------------------------------------

DISCUSSION_PARAGRAPHS: List[str] = [
    (
        "A few choices in the design are worth calling out, less "
        "because they are novel and more because they shaped what the "
        "system could do. Splitting authentication from authorisation "
        "was the first one. Authentication is delegated to existing "
        "identity providers via JWTs and JWKS; the gateway never holds "
        "credentials. Authorisation, by contrast, is centralised at the "
        "gateway and expressed as JSON policies that the same evaluator "
        "feeds into the internal-JWT translator. The split keeps the "
        "trust boundary clear and lets identity providers be rotated "
        "without touching policy code."
    ),
    (
        "The hybrid risk strategy was the second. A deterministic "
        "deviation score is cheap, has no model artefact and runs "
        "synchronously, which makes it appropriate for in-line "
        "enforcement. Isolation Forest, by contrast, is good at picking "
        "up subtle multivariate anomalies but introduces training, "
        "drift and freshness concerns that are awkward to manage in the "
        "request path. Running it as an asynchronous consumer over a "
        "durable queue means model unavailability or latency never "
        "shows up in user-facing requests, and we still get a richer "
        "signal for offline review and dashboards."
    ),
    (
        "Multi-tenancy was wired in from day one rather than bolted on "
        "later. Policies, risk thresholds and baselines are all keyed "
        "by tenantId; the JWT translator forwards a tenant claim to the "
        "back-end; and the ML store records the tenant alongside every "
        "score. The point is that ZTaaS is a credible foundation for an "
        "actual Security-as-a-Service offering and not just a demo "
        "stack that happens to talk Zero Trust."
    ),
    (
        "Limitations are honest. The Isolation Forest is currently "
        "bootstrapped on synthetic data; once a tenant accumulates "
        "production telemetry, periodic per-tenant retraining should "
        "replace the static model. The risk weighting (0.30, 0.30, "
        "0.20, 0.20) is hand-tuned and would benefit from being "
        "learned. The ML consumer does not yet route malformed messages "
        "to a dead-letter queue. And the admin endpoints rely on a "
        "lightweight identity middleware that should be replaced with "
        "a fully audited admin authentication path before production."
    ),
]

# --------------------------------------------------------------------------
# Section 8: Conclusion and Future Work
# --------------------------------------------------------------------------

CONCLUSION_PARAGRAPHS: List[str] = [
    (
        "We have presented ZTaaS, an AI-driven Zero Trust "
        "Security-as-a-Service platform that combines a centralised "
        "reverse-proxy gateway, runtime policy-as-code, short-lived "
        "internal token translation, continuous behavioural telemetry "
        "and an asynchronous Isolation Forest anomaly model. The "
        "architecture demonstrates that Zero Trust principles can be "
        "delivered as an external, application-independent layer that "
        "adapts security decisions to real-time risk without modifying "
        "the protected back-end."
    ),
    (
        "Future work falls into four buckets. First, scheduled per-"
        "tenant retraining of the Isolation Forest, with model "
        "versioning so that an unsafe update can be rolled back. "
        "Second, a learned risk weighting that replaces the hand-tuned "
        "(0.30, 0.30, 0.20, 0.20) split. Third, dead-letter queue "
        "support in the ML consumer and distributed-trace propagation "
        "across the gateway/back-end boundary so that anomaly events "
        "carry the request context that produced them. Fourth, "
        "integration with hardware-rooted device identity (for "
        "instance the PUF-based attestations explored in [7]) to give "
        "workload-to-workload calls a stronger trust anchor than a "
        "shared secret."
    ),
]

# --------------------------------------------------------------------------
# Declarations
# --------------------------------------------------------------------------

DECLARATIONS: List[str] = [
    "Funding: Not applicable.",
    "Conflict of interest: The authors declare no competing interests.",
    "Ethics approval: Not applicable.",
    (
        "Data availability: All synthetic data and configuration used in "
        "the experiments are included in the project repository."
    ),
    (
        "Code availability: The full source code for the gateway, "
        "back-end, admin UI and ML service is available in the project "
        "repository under the same authors."
    ),
]

# --------------------------------------------------------------------------
# References
# --------------------------------------------------------------------------

REFERENCES_LNCS: List[str] = [
    (
        "1. Nagarajan, S.M., Devarajan, G.G., Thangakrishnan, M.S., Ramana, "
        "T.V., Bashir, A.K., AlZubi, A.A.: Artificial Intelligence-Based "
        "Zero Trust Security Approach for Consumer Industry. IEEE Internet "
        "Things J. (early access, 2024). "
        "https://doi.org/10.1109/JIOT.2024.3500000"
    ),
    (
        "2. Zhang, X., Wang, D., Zhu, Y., Chen, W., Chang, Z., Han, Z.: "
        "Zero-Trust Based Robust Federated Learning Against Betrayal "
        "Behaviors. IEEE Internet Things J. (early access, 2025). "
        "https://doi.org/10.1109/JIOT.2025.11090036"
    ),
    (
        "3. Rivera, J.J.D., Muhammad, A., Song, W.-C.: Securing Digital "
        "Identity in the Zero Trust Architecture: A Blockchain Approach to "
        "Privacy-Focused Multi-Factor Authentication. IEEE Access 11, "
        "123456\u2013123467 (2023). "
        "https://doi.org/10.1109/OJCOMS.2024.3391728"
    ),
    (
        "4. Ahn, G., Jang, J., Choi, S., Shin, D.: Research on Improving "
        "Cyber Resilience by Integrating the Zero Trust Security Model "
        "with the MITRE ATT&CK Matrix. IEEE Access 12, 89291\u201389309 "
        "(2024). https://doi.org/10.1109/ACCESS.2024.3417182"
    ),
    (
        "5. Sasada, T., Taenaka, Y., Kadobayashi, Y., Fall, D.: "
        "Web-Biometrics for User Authenticity Verification in Zero Trust "
        "Access Control. IEEE Access 12, 129611\u2013129622 (2024). "
        "https://doi.org/10.1109/ACCESS.2024.3413696"
    ),
    (
        "6. Stodt, F., Reich, C., Theoleyre, F.: Beyond Static Security: A "
        "Context-Aware and Real-Time Dynamic Zero Trust Architecture for "
        "IIoT Access Control. IEEE Internet Things J. 12(17), "
        "35380\u201335393 (2025). "
        "https://doi.org/10.1109/JIOT.2025.3579028"
    ),
    (
        "7. Alsulami, F., Kulkarni, A.R., Hazari, N.A., Niamat, M.Y.: "
        "ZEBRA: Zero Trust Architecture Employing Blockchain Technology "
        "and ROPUF for AMI Security. IEEE Access 12, 119868\u2013119883 "
        "(2024). https://doi.org/10.1109/ACCESS.2024.3449702"
    ),
    (
        "8. Lee, J.-S., Chen, T.-H., Chew, C.-J., Wang, P.-Y., Fan, Y.-Y.: "
        "Unconsciously Continuous Authentication Protocol in Zero-Trust "
        "Architecture Based on Behavioral Biometrics. IEEE Trans. Reliab. "
        "74(2), 2591\u20132604 (2025). "
        "https://doi.org/10.1109/TR.2025.10937066"
    ),
    (
        "9. Liu, F.T., Ting, K.M., Zhou, Z.-H.: Isolation Forest. In: "
        "Proc. IEEE International Conference on Data Mining (ICDM), "
        "pp. 413\u2013422 (2008). "
        "https://doi.org/10.1109/ICDM.2008.17"
    ),
    (
        "10. Rose, S., Borchert, O., Mitchell, S., Connelly, S.: Zero "
        "Trust Architecture. NIST Special Publication 800-207, National "
        "Institute of Standards and Technology (2020). "
        "https://doi.org/10.6028/NIST.SP.800-207"
    ),
]

# --------------------------------------------------------------------------
# Appendix A: Mermaid sources (verbatim from build_paper.py DIAGRAMS)
# --------------------------------------------------------------------------

APPENDIX_INTRO = (
    "All architecture figures in this paper are generated from "
    "Mermaid diagram sources kept under version control alongside "
    "the build script, so they can be re-rendered or edited without "
    "leaving the repository. The sources are reproduced here for "
    "completeness."
)

APPENDIX_FIGURES: List[Tuple[str, str]] = [
    (
        "Fig. 1 — System architecture",
        """graph TD
    classDef edge fill:#eef5ff,stroke:#2c5aa0,stroke-width:1px,color:#0b1d33
    classDef store fill:#fff4e6,stroke:#c46c00,stroke-width:1px,color:#3d2300
    classDef ml fill:#e8f7ee,stroke:#2f7d3a,stroke-width:1px,color:#0d2912
    classDef be fill:#fdecec,stroke:#a83232,stroke-width:1px,color:#3a0e0e
    classDef ui fill:#f3e8ff,stroke:#6a3aa3,stroke-width:1px,color:#22082f

    U([End user]):::ui
    A([Operator / Admin]):::ui
    UI[Admin UI]:::ui

    subgraph EDGE["Zero Trust Gateway"]
        ID[identity<br/>JWKS verify]:::edge
        TM[telemetry]:::edge
        RK[risk engine]:::edge
        AZ[policy authZ]:::edge
        TR[JWT translator]:::edge
        PX[reverse proxy]:::edge
    end

    DB[(MongoDB<br/>telemetry, baselines,<br/>policies, risk_scores)]:::store
    MQ((RabbitMQ<br/>queue: ml.features)):::store

    BE["Protected Back-end<br/>any HTTP workload"]:::be

    subgraph MLBOX["ML Service"]
        CO[consumer]:::ml
        IF[Isolation Forest]:::ml
    end

    U --> ID
    A --> UI --> ID
    ID --> TM --> RK --> AZ --> TR --> PX --> BE
    TM --> DB
    RK --> DB
    AZ --> DB
    RK -- features --> MQ
    MQ --> CO --> IF --> DB""",
    ),
    (
        "Fig. 2 — Gateway middleware chain",
        """flowchart LR
    classDef step fill:#eef5ff,stroke:#2c5aa0,color:#0b1d33
    classDef decide fill:#fff4e6,stroke:#c46c00,color:#3d2300
    classDef stop fill:#fdecec,stroke:#a83232,color:#3a0e0e
    classDef pass fill:#e8f7ee,stroke:#2f7d3a,color:#0d2912

    REQ([HTTP request]):::pass --> M1[identity<br/>JWKS verify]:::step
    M1 --> M2[telemetry<br/>persist event]:::step
    M2 --> M3{risk<br/>compute & route}:::decide
    M3 -- score >= 0.7 --> B1[/HTTP 403<br/>block/]:::stop
    M3 -- 0.4 <= score < 0.7 --> B2[/HTTP 401<br/>step-up/]:::stop
    M3 -- score < 0.4 --> M4{authZ policy<br/>match?}:::decide
    M4 -- deny --> B3[/HTTP 403<br/>forbidden/]:::stop
    M4 -- allow --> M5[jwtTranslation<br/>mint internal JWT]:::step
    M5 --> M6[proxy<br/>strip + inject headers]:::step
    M6 --> BE[(Backend)]:::pass""",
    ),
    (
        "Fig. 3 — Asynchronous ML pipeline",
        """sequenceDiagram
    autonumber
    participant Cl as Client
    participant GW as Gateway
    participant MQ as RabbitMQ ml.features
    participant ML as ML Service
    participant DB as MongoDB

    Cl->>GW: HTTP request + Bearer JWT
    GW->>GW: verify JWT, persist telemetry
    GW->>GW: deviation risk score
    GW-->>Cl: 200 / 401 / 403 (in-line decision)
    GW->>MQ: publish features (best effort, non-blocking)
    MQ->>ML: deliver one msg (prefetch=1)
    ML->>ML: IsolationForest.decision_function
    ML->>ML: normalise to [0,1] + label
    ML->>DB: insert risk_scores doc
    ML-->>MQ: ack""",
    ),
    (
        "Fig. 4 — Adaptive risk decision flow",
        """flowchart TD
    classDef step fill:#eef5ff,stroke:#2c5aa0,color:#0b1d33
    classDef decide fill:#fff4e6,stroke:#c46c00,color:#3d2300
    classDef out fill:#e8f7ee,stroke:#2f7d3a,color:#0d2912
    classDef block fill:#fdecec,stroke:#a83232,color:#3a0e0e

    A([Authenticated request]):::step --> B[features over 60s window]:::step
    B --> C{requests > 0?}:::decide
    C -- No --> D[fallback to 10 min window]:::step
    D --> E{requests > 0?}:::decide
    E -- No --> F[fallback to 60 min window]:::step
    F --> G{requests > 0?}:::decide
    G -- No --> H[/cold start<br/>score = 0.4, allow/]:::out
    G -- Yes --> I
    E -- Yes --> I
    C -- Yes --> I[score = 0.30 req + 0.30 fail<br/>+ 0.20 ip + 0.20 rt]:::step
    I --> J{score >= high?}:::decide
    J -- Yes --> K[/HTTP 403 block/]:::block
    J -- No --> L{score >= medium?}:::decide
    L -- Yes --> M[/HTTP 401 step-up/]:::block
    L -- No --> N[/allow/]:::out""",
    ),
    (
        "Fig. 5 — Defence-in-depth trust boundary",
        """graph LR
    classDef ext fill:#f3e8ff,stroke:#6a3aa3,color:#22082f
    classDef gw fill:#eef5ff,stroke:#2c5aa0,color:#0b1d33
    classDef be fill:#fdecec,stroke:#a83232,color:#3a0e0e

    C["Client + external JWT"]:::ext

    subgraph L1["Layer 1: Gateway - single source of truth"]
        L1A["verify JWT signature<br/>+ iss / aud / exp"]:::gw
        L1B["run policy engine<br/>per tenant"]:::gw
        L1C["mint short-lived<br/>internal JWT, 60 s TTL"]:::gw
        L1D["strip client X-* headers,<br/>inject trusted ones<br/>+ X-Gateway-Secret"]:::gw
    end

    subgraph L2["Layer 2: Backend - trusted executor"]
        L2A["verify X-Gateway-Secret"]:::be
        L2B["optional JWT audit"]:::be
        L2C["run business logic,<br/>no authZ decisions"]:::be
    end

    C --> L1A --> L1B --> L1C --> L1D --> L2A --> L2B --> L2C""",
    ),
]


# ---------------------------------------------------------------------------
# Composition
# ---------------------------------------------------------------------------

def compose(doc: Document) -> None:
    add_title(doc, TITLE_TEXT)
    add_authors_block(doc)
    add_abstract(doc, ABSTRACT_TEXT)
    add_keywords(doc, KEYWORDS)

    # Section 1 — Introduction
    h1(doc, "1 Introduction")
    for i, para in enumerate(INTRO_PARAGRAPHS_BEFORE_BULLETS):
        body(doc, para, first_of_section=(i == 0))
    add_bullets(doc, INTRO_BULLETS)
    body(doc, INTRO_TAIL, first_of_section=True)

    # Section 2 — Related Work
    h1(doc, "2 Related Work")
    for i, para in enumerate(RELATED_PARAGRAPHS):
        body(doc, para, first_of_section=(i == 0))

    # Section 3 — System Architecture
    h1(doc, "3 System Architecture")
    body(doc, ARCH_INTRO, first_of_section=True)
    add_figure(
        doc,
        DIAGRAM_DIR / "fig1_architecture.png",
        FIG1_CAPTION,
        width_inches=5.4,
    )

    h2(doc, "3.1 Component Overview")
    add_table_caption(doc, ARCH_3_1_TABLE_CAPTION)
    add_table(doc, ARCH_3_1_TABLE_HEADERS, ARCH_3_1_TABLE_ROWS,
              ARCH_3_1_COL_WIDTHS)

    h2(doc, "3.2 Request Lifecycle")
    body(doc, ARCH_3_2_INTRO, first_of_section=True)
    add_code(doc, ARCH_3_2_CODE)
    add_figure(
        doc,
        DIAGRAM_DIR / "fig2_middleware.png",
        FIG2_CAPTION,
        width_inches=5.4,
        justify=True,
    )
    body(doc, ARCH_3_2_BODY, first_of_section=True)

    h2(doc, "3.3 Trust Boundary and Defence in Depth")
    body(doc, ARCH_3_3_BODY, first_of_section=True)
    add_figure(
        doc,
        DIAGRAM_DIR / "fig5_trust_boundary.png",
        FIG5_CAPTION,
        width_inches=5.4,
        justify=True,
    )

    h2(doc, "3.4 Asynchronous ML Pipeline")
    body(doc, ARCH_3_4_BODY, first_of_section=True)
    add_figure(
        doc,
        DIAGRAM_DIR / "fig3_async_ml.png",
        FIG3_CAPTION,
        width_inches=5.2,
        justify=True,
    )

    # Section 4 — Methodology
    h1(doc, "4 Methodology")

    h2(doc, "4.1 Behavioural Feature Extraction")
    body(doc, METH_4_1_BODY, first_of_section=True)
    add_table_caption(doc, TABLE2_CAPTION)
    add_table(doc, TABLE2_HEADERS, TABLE2_ROWS, TABLE2_COL_WIDTHS)

    h2(doc, "4.2 Multi-Window Cold-Start Mitigation")
    body(doc, METH_4_2_BODY, first_of_section=True)
    add_figure(
        doc,
        DIAGRAM_DIR / "fig4_risk_decision.png",
        FIG4_CAPTION,
        width_inches=5.0,
        justify=True,
    )

    h2(doc, "4.3 Deviation-Based Risk Score")
    body(doc, METH_4_3_BODY_1, first_of_section=True)
    add_code(doc, METH_4_3_CODE)
    body(doc, METH_4_3_BODY_2, first_of_section=True)

    h2(doc, "4.4 Adaptive Enforcement Policy")
    body(doc, METH_4_4_BODY, first_of_section=True)
    add_table_caption(doc, TABLE3_CAPTION)
    add_table(doc, TABLE3_HEADERS, TABLE3_ROWS, TABLE3_COL_WIDTHS)

    h2(doc, "4.5 Isolation Forest Anomaly Model")
    body(doc, METH_4_5_BODY_1, first_of_section=True)
    body(doc, METH_4_5_BODY_2)
    add_code(doc, METH_4_5_CODE)
    body(doc, METH_4_5_BODY_3, first_of_section=True)

    # Section 5 — Implementation
    h1(doc, "5 Implementation")

    h2(doc, "5.1 Repository Layout")
    add_table_caption(doc, TABLE4_CAPTION)
    add_table(doc, TABLE4_HEADERS, TABLE4_ROWS, TABLE4_COL_WIDTHS)

    h2(doc, "5.2 Gateway")
    body(doc, IMPL_5_2_BODY_1, first_of_section=True)
    body(doc, IMPL_5_2_BODY_2)
    add_code(doc, IMPL_5_2_CODE)

    h2(doc, "5.3 Telemetry Pipeline and Baseline Job")
    body(doc, IMPL_5_3_BODY, first_of_section=True)

    h2(doc, "5.4 Risk Middleware")
    body(doc, IMPL_5_4_BODY_1, first_of_section=True)
    add_code(doc, IMPL_5_4_CODE)
    body(doc, IMPL_5_4_BODY_2, first_of_section=True)

    h2(doc, "5.5 Asynchronous ML Service")
    body(doc, IMPL_5_5_BODY_1, first_of_section=True)
    add_table_caption(doc, TABLE5_CAPTION)
    add_table(doc, TABLE5_HEADERS, TABLE5_ROWS, TABLE5_COL_WIDTHS)
    body(doc, IMPL_5_5_BODY_2, first_of_section=True)

    h2(doc, "5.6 Admin Surface")
    body(doc, IMPL_5_6_BODY, first_of_section=True)

    # Section 6 — Results and Evaluation
    h1(doc, "6 Results and Evaluation")

    h2(doc, "6.1 Functional Validation")
    body(doc, EVAL_6_1_BODY, first_of_section=True)
    add_table_caption(doc, TABLE6_CAPTION)
    add_table(doc, TABLE6_HEADERS, TABLE6_ROWS, TABLE6_COL_WIDTHS)

    h2(doc, "6.2 Risk-Engine Behaviour")
    body(doc, EVAL_6_2_BODY_1, first_of_section=True)
    add_table_caption(doc, TABLE7_CAPTION)
    add_table(doc, TABLE7_HEADERS, TABLE7_ROWS, TABLE7_COL_WIDTHS)
    body(doc, EVAL_6_2_BODY_2, first_of_section=True)

    h2(doc, "6.3 Operational Characteristics")
    body(doc, EVAL_6_3_BODY, first_of_section=True)

    # Section 7 — Discussion
    h1(doc, "7 Discussion")
    for i, para in enumerate(DISCUSSION_PARAGRAPHS):
        body(doc, para, first_of_section=(i == 0))

    # Section 8 — Conclusion and Future Work
    h1(doc, "8 Conclusion and Future Work")
    for i, para in enumerate(CONCLUSION_PARAGRAPHS):
        body(doc, para, first_of_section=(i == 0))

    # Declarations
    h1(doc, "Declarations")
    for i, line in enumerate(DECLARATIONS):
        body(doc, line, first_of_section=True)

    # References
    h1(doc, "References")
    for entry in REFERENCES_LNCS:
        add_reference(doc, entry)

    # Appendix A — Mermaid sources
    h1(doc, "Appendix A  Mermaid sources for figures")
    body(doc, APPENDIX_INTRO, first_of_section=True)
    for title, source in APPENDIX_FIGURES:
        h2(doc, title)
        add_code(doc, source)


def main() -> None:
    doc = Document()
    configure_document(doc)
    compose(doc)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT_PATH)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
