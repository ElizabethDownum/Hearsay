#!/usr/bin/env python3
"""Build the standalone Hearsay review HTML surface.

This script reads the archived historical docket and the current review note,
then emits a single self-contained HTML file with collapsible decision cards and
local search/filter behavior.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import html
import re
import unicodedata
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
CURRENT_PATH = ROOT / "docs" / "review" / "current.md"
PRIOR_PATH = ROOT / "docs" / "review" / "prior-decisions.md"
OUT_PATH = ROOT / "docs" / "review.html"


@dataclass
class Card:
    heading: str
    body_lines: list[str] = field(default_factory=list)
    body_html: str = ""
    slug: str = ""


@dataclass
class Section:
    heading: str
    intro_lines: list[str] = field(default_factory=list)
    cards: list[Card] = field(default_factory=list)
    intro_html: str = ""
    slug: str = ""


@dataclass
class Document:
    title: str
    intro_lines: list[str] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)
    intro_html: str = ""
    slug: str = ""


def read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")
    return normalized or "item"


def unique_slug(base: str, used: set[str]) -> str:
    slug = base
    index = 2
    while slug in used:
        slug = f"{base}-{index}"
        index += 1
    used.add(slug)
    return slug


def is_heading(line: str, level: int) -> bool:
    prefix = "#" * level + " "
    return line.startswith(prefix)


def is_hr(line: str) -> bool:
    return line.strip() in {"---", "***", "___"}


def is_table_separator(line: str) -> bool:
    stripped = line.strip()
    if "|" not in stripped:
        return False
    pieces = [piece.strip() for piece in stripped.strip("|").split("|")]
    if len(pieces) < 2:
        return False
    return all(re.fullmatch(r":?-{3,}:?", piece or "") for piece in pieces)


def is_list_item(line: str) -> bool:
    stripped = line.lstrip()
    return bool(re.match(r"(?:[-*+]\s+|\d+\.\s+)", stripped))


def list_item_text(line: str) -> str:
    stripped = line.lstrip()
    text = re.sub(r"(?:[-*+]\s+|\d+\.\s+)", "", stripped, count=1)
    return text


def strip_list_indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def render_inline(text: str) -> str:
    code_spans: list[str] = []

    def stash_code(match: re.Match[str]) -> str:
        code_spans.append(html.escape(match.group(1), quote=False))
        return f"\u0000{len(code_spans) - 1}\u0000"

    text = re.sub(r"`([^`]+)`", stash_code, text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f"{m.group(1)} ({m.group(2)})", text)
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(
        r"\u0000(\d+)\u0000",
        lambda m: f"<code>{code_spans[int(m.group(1))]}</code>",
        text,
    )
    return text


def render_paragraph(lines: list[str]) -> str:
    text = " ".join(piece.strip() for piece in lines).strip()
    if not text:
        return ""
    return f"<p>{render_inline(text)}</p>"


def render_blockquote(lines: list[str]) -> str:
    stripped: list[str] = []
    for line in lines:
        cleaned = line.lstrip()
        cleaned = cleaned[1:] if cleaned.startswith(">") else cleaned
        stripped.append(cleaned.lstrip())
    joined = "\n".join(stripped).strip()
    paragraphs = [chunk.strip() for chunk in re.split(r"\n\s*\n", joined) if chunk.strip()]
    rendered = "".join(render_paragraph(chunk.splitlines()) for chunk in paragraphs)
    return f"<blockquote>{rendered}</blockquote>"


def render_code_block(lines: list[str], language: str) -> str:
    code = "\n".join(lines)
    class_attr = f' class="language-{html.escape(language)}"' if language else ""
    return f"<pre><code{class_attr}>{html.escape(code, quote=False)}</code></pre>"


def render_list(lines: list[str]) -> str:
    items: list[list[str]] = []
    current: list[str] = []
    base_indent = None

    for raw in lines:
        if not raw.strip():
            if current:
                current.append("")
            continue
        if is_list_item(raw):
            if current:
                items.append(current)
            current = [list_item_text(raw).strip()]
            base_indent = strip_list_indent(raw)
            continue
        indent = strip_list_indent(raw)
        if current and (base_indent is None or indent > base_indent):
            current.append(raw.strip())
        elif current:
            current.append(raw.strip())
        else:
            current = [raw.strip()]

    if current:
        items.append(current)

    rendered_items = []
    for item in items:
        paragraphs = [chunk.strip() for chunk in re.split(r"\n\s*\n", "\n".join(item).strip()) if chunk.strip()]
        body = "".join(render_paragraph(chunk.splitlines()) for chunk in paragraphs)
        rendered_items.append(f"<li>{body or render_inline(' '.join(item).strip())}</li>")
    return f"<ul>{''.join(rendered_items)}</ul>"


def render_table(lines: list[str]) -> str:
    rows = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) < 2:
        return f"<pre class=\"source-fallback\">{html.escape('\\n'.join(lines), quote=False)}</pre>"

    header = rows[0]
    body_rows = rows[2:] if len(rows) > 2 and is_table_separator(lines[1]) else rows[1:]
    out = ["<table>"]
    out.append("<thead><tr>" + "".join(f"<th>{render_inline(cell)}</th>" for cell in header) + "</tr></thead>")
    out.append("<tbody>")
    for row in body_rows:
        out.append("<tr>" + "".join(f"<td>{render_inline(cell)}</td>" for cell in row) + "</tr>")
    out.append("</tbody></table>")
    return "".join(out)


def parse_blocks(lines: Iterable[str]) -> str:
    material = list(lines)
    blocks: list[tuple[str, list[str], str]] = []
    i = 0
    while i < len(material):
        line = material[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            fence = line.strip()[3:].strip()
            language = fence if fence else ""
            i += 1
            code_lines: list[str] = []
            while i < len(material) and not material[i].startswith("```"):
                code_lines.append(material[i])
                i += 1
            if i < len(material):
                i += 1
            blocks.append(("code", code_lines, language))
            continue
        if is_table_separator(line) and blocks and blocks[-1][0] == "table":
            blocks[-1][1].append(line)
            i += 1
            continue
        if is_hr(line):
            blocks.append(("hr", [], ""))
            i += 1
            continue
        if line.lstrip().startswith(">"):
            quote_lines = [line]
            i += 1
            while i < len(material) and (material[i].lstrip().startswith(">") or not material[i].strip()):
                if material[i].strip():
                    quote_lines.append(material[i])
                else:
                    quote_lines.append("")
                i += 1
            blocks.append(("blockquote", quote_lines, ""))
            continue
        if line.lstrip().startswith("|") and i + 1 < len(material) and is_table_separator(material[i + 1]):
            table_lines = [line, material[i + 1]]
            i += 2
            while i < len(material) and material[i].strip().startswith("|"):
                table_lines.append(material[i])
                i += 1
            blocks.append(("table", table_lines, ""))
            continue
        if is_list_item(line):
            list_lines = [line]
            i += 1
            while i < len(material):
                next_line = material[i]
                if not next_line.strip():
                    list_lines.append(next_line)
                    i += 1
                    continue
                if is_list_item(next_line):
                    list_lines.append(next_line)
                    i += 1
                    continue
                if strip_list_indent(next_line) > strip_list_indent(line):
                    list_lines.append(next_line)
                    i += 1
                    continue
                break
            blocks.append(("list", list_lines, ""))
            continue

        paragraph_lines = [line]
        i += 1
        while i < len(material):
            next_line = material[i]
            if not next_line.strip():
                break
            if next_line.startswith("```") or is_hr(next_line) or is_list_item(next_line):
                break
            if next_line.lstrip().startswith(">") or (
                next_line.lstrip().startswith("|") and i + 1 < len(material) and is_table_separator(material[i + 1])
            ):
                break
            if re.match(r"^#{1,6}\s", next_line):
                break
            paragraph_lines.append(next_line)
            i += 1
        blocks.append(("paragraph", paragraph_lines, ""))
    rendered: list[str] = []
    for block_type, block_lines, extra in blocks:
        if block_type == "paragraph":
            rendered.append(render_paragraph(block_lines))
        elif block_type == "blockquote":
            rendered.append(render_blockquote(block_lines))
        elif block_type == "list":
            rendered.append(render_list(block_lines))
        elif block_type == "code":
            rendered.append(render_code_block(block_lines, extra))
        elif block_type == "table":
            rendered.append(render_table(block_lines))
        elif block_type == "hr":
            rendered.append("<hr>")
    return "".join(rendered)


def parse_document(md_text: str, doc_kind: str) -> Document:
    lines = md_text.splitlines()
    title = ""
    used_slugs: set[str] = set()
    preamble: list[str] = []
    sections: list[Section] = []
    current_section: Section | None = None
    current_card: Card | None = None
    current_bucket: list[str] | None = None
    bucket_kind = "preamble"

    def flush_card() -> None:
        nonlocal current_card, current_bucket
        if current_card is None:
            return
        current_card.body_lines = current_bucket or []
        current_card.body_html = parse_blocks(current_card.body_lines)
        current_card = None
        current_bucket = None

    def flush_section() -> None:
        nonlocal current_section, current_bucket
        if current_section is None:
            return
        if current_card is not None:
            flush_card()
        if current_bucket is not None and bucket_kind == "section_intro":
            current_section.intro_lines = current_bucket
            current_section.intro_html = parse_blocks(current_section.intro_lines)
        current_bucket = None

    for line in lines:
        if is_heading(line, 1):
            title = line[2:].strip()
            continue
        if is_heading(line, 2):
            flush_card()
            if current_section is not None:
                flush_section()
            section_title = line[3:].strip()
            current_section = Section(heading=section_title)
            current_section.slug = unique_slug(slugify(section_title), used_slugs)
            sections.append(current_section)
            current_bucket = []
            bucket_kind = "section_intro"
            continue
        if is_heading(line, 3):
            flush_card()
            if current_section is None:
                current_section = Section(heading="")
                current_section.slug = unique_slug("section", used_slugs)
                sections.append(current_section)
                current_bucket = []
                bucket_kind = "section_intro"
            if current_bucket is not None and bucket_kind == "section_intro":
                current_section.intro_lines = current_bucket
                current_section.intro_html = parse_blocks(current_section.intro_lines)
                current_bucket = []
            card_title = line[4:].strip()
            current_card = Card(heading=card_title)
            current_card.slug = unique_slug(slugify(card_title), used_slugs)
            current_section.cards.append(current_card)
            current_bucket = []
            bucket_kind = "card"
            continue
        if current_card is not None:
            current_bucket = current_bucket or []
            current_bucket.append(line)
        elif current_section is not None:
            current_bucket = current_bucket or []
            current_bucket.append(line)
        else:
            preamble.append(line)

    flush_card()
    if current_section is not None:
        flush_section()

    doc = Document(title=title or doc_kind)
    doc.slug = unique_slug(slugify(doc.title), used_slugs)
    doc.intro_lines = preamble
    doc.intro_html = parse_blocks(preamble)
    doc.sections = sections
    return doc


def render_card(card: Card, initial_open: bool, scope: str) -> str:
    open_attr = " open" if initial_open else ""
    search_text = render_search_text(card)
    return (
        f'<details class="decision-card {scope}" id="{html.escape(card.slug)}"'
        f' data-initial-open="{str(initial_open).lower()}" data-search-text="{html.escape(search_text, quote=True)}"{open_attr}>'
        f'<summary><span class="card-sigil">Decision</span><span class="card-heading">{render_inline(card.heading)}</span>'
        f'<span class="card-anchor" aria-hidden="true">#</span></summary>'
        f'<div class="card-body">{card.body_html}</div>'
        f"</details>"
    )


def render_search_text(card: Card) -> str:
    text = [card.heading]
    text.extend(card.body_lines)
    joined = "\n".join(text)
    joined = re.sub(r"`([^`]+)`", r"\1", joined)
    joined = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 \2", joined)
    joined = re.sub(r"^\s*(?:[-*+]\s+|\d+\.\s+)", "", joined, flags=re.M)
    joined = re.sub(r"^#{1,6}\s+", "", joined, flags=re.M)
    return re.sub(r"\s+", " ", joined).strip().lower()


def render_section(section: Section, initial_open: bool, scope: str) -> str:
    parts = [f'<section class="source-section {scope}" id="{html.escape(section.slug)}">']
    parts.append(f'<h2>{render_inline(section.heading)}</h2>')
    if section.intro_html:
        parts.append(f'<div class="section-intro prose">{section.intro_html}</div>')
    if section.cards:
        parts.append('<div class="card-stack">')
        for card in section.cards:
            parts.append(render_card(card, initial_open=initial_open, scope=scope))
        parts.append("</div>")
    parts.append("</section>")
    return "".join(parts)


def render_document(doc: Document, scope: str, initial_open: bool) -> str:
    title_id = f"{doc.slug}-title"
    parts = [f'<article class="source-doc {scope}" id="{html.escape(doc.slug)}">']
    parts.append(f'<h2 class="source-title" id="{html.escape(title_id)}">{render_inline(doc.title)}</h2>')
    if doc.intro_html:
        parts.append(f'<div class="doc-intro prose">{doc.intro_html}</div>')
    for section in doc.sections:
        parts.append(render_section(section, initial_open=initial_open, scope=scope))
    parts.append("</article>")
    return "".join(parts)


def count_cards(doc: Document) -> int:
    return sum(len(section.cards) for section in doc.sections)


def count_headings(md_text: str) -> int:
    return len(re.findall(r"^#{1,6}\s", md_text, flags=re.M))


def build_html(current_doc: Document, prior_doc: Document) -> str:
    current_count = count_cards(current_doc)
    prior_count = count_cards(prior_doc)
    total_count = current_count + prior_count

    css = """
    :root {
      color-scheme: light;
      --paper: #f6f1e7;
      --paper-2: #fbf8f2;
      --ink: #221d18;
      --muted: #63584d;
      --line: #cdbfae;
      --gold: #a77d2f;
      --gold-soft: #d8c08a;
      --blue: #607b98;
      --blue-soft: #dce6ef;
      --shadow: 0 16px 40px rgba(58, 45, 28, 0.09);
      --radius: 18px;
      --measure: 78ch;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(167, 125, 47, 0.08), transparent 26%),
        radial-gradient(circle at top right, rgba(96, 123, 152, 0.10), transparent 24%),
        linear-gradient(180deg, var(--paper-2), var(--paper));
      color: var(--ink);
      font: 16px/1.58 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: inherit; }
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 20px 48px;
    }
    .page-header {
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(14px);
      background: rgba(251, 248, 242, 0.82);
      border: 1px solid rgba(205, 191, 174, 0.55);
      border-radius: 24px;
      padding: 22px 22px 18px;
      box-shadow: var(--shadow);
      margin-bottom: 22px;
    }
    .eyebrow {
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-size: 0.76rem;
      color: var(--blue);
    }
    h1, h2, h3, summary {
      font-family: Georgia, "Times New Roman", Times, serif;
    }
    h1 {
      margin: 0;
      font-size: clamp(2.1rem, 4vw, 3.35rem);
      line-height: 1.05;
      letter-spacing: -0.02em;
    }
    .lede {
      max-width: var(--measure);
      margin: 14px 0 0;
      color: var(--muted);
      font-size: 1.02rem;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) auto auto;
      gap: 12px;
      align-items: end;
      margin-top: 18px;
    }
    .toolbar label {
      display: block;
      font-size: 0.88rem;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .toolbar input {
      width: 100%;
      padding: 13px 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.74);
      color: var(--ink);
      font: inherit;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
    }
    .toolbar button {
      padding: 13px 16px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #fff8e7, #efe1ba);
      color: var(--ink);
      font: inherit;
      cursor: pointer;
    }
    .toolbar button:hover { border-color: var(--gold); }
    .statusline {
      margin-top: 10px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    main {
      display: grid;
      gap: 18px;
    }
    .source-shell {
      border: 1px solid rgba(205, 191, 174, 0.75);
      border-radius: 24px;
      padding: 20px;
      background: rgba(255,255,255,0.45);
      box-shadow: var(--shadow);
    }
    .source-shell + .source-shell {
      margin-top: 2px;
    }
    .source-shell h2 {
      margin: 0;
      font-size: clamp(1.5rem, 2.6vw, 2.1rem);
      letter-spacing: -0.02em;
    }
    .source-meta {
      margin-top: 4px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .source-intro,
    .section-intro,
    .doc-intro {
      max-width: var(--measure);
    }
    .prose > *:first-child { margin-top: 0; }
    .prose > *:last-child { margin-bottom: 0; }
    .prose p {
      margin: 0 0 0.9rem;
    }
    .prose blockquote {
      margin: 0 0 1rem;
      padding: 0.95rem 1rem;
      border-left: 4px solid var(--gold);
      background: rgba(255, 248, 230, 0.7);
      border-radius: 0 14px 14px 0;
      color: #46392a;
    }
    .prose ul, .prose ol {
      margin: 0 0 1rem 1.4rem;
      padding: 0;
    }
    .prose li + li { margin-top: 0.35rem; }
    .prose table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 1rem;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.72);
    }
    .prose th,
    .prose td {
      border-bottom: 1px solid rgba(205, 191, 174, 0.55);
      padding: 0.6rem 0.75rem;
      vertical-align: top;
      text-align: left;
    }
    .prose th {
      background: rgba(220, 230, 239, 0.75);
    }
    .prose code {
      padding: 0.1rem 0.32rem;
      border-radius: 6px;
      background: rgba(96, 123, 152, 0.12);
      color: #31373d;
      font-size: 0.95em;
    }
    .source-title {
      margin: 0 0 14px;
      color: var(--gold);
    }
    .source-section {
      margin-top: 18px;
    }
    .source-section > h2 {
      margin: 0 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(205, 191, 174, 0.65);
    }
    .card-stack {
      display: grid;
      gap: 12px;
      max-width: 100%;
    }
    .decision-card {
      border: 1px solid rgba(205, 191, 174, 0.85);
      border-radius: var(--radius);
      background: rgba(255,255,255,0.65);
      box-shadow: 0 8px 24px rgba(58, 45, 28, 0.06);
      overflow: hidden;
    }
    .decision-card[hidden] { display: none; }
    .decision-card summary {
      list-style: none;
      cursor: pointer;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 14px 16px;
      background:
        linear-gradient(90deg, rgba(216, 192, 138, 0.18), rgba(96, 123, 152, 0.10)),
        rgba(255,255,255,0.55);
    }
    .decision-card summary::-webkit-details-marker { display: none; }
    .card-sigil {
      display: inline-grid;
      place-items: center;
      min-width: 2.45rem;
      height: 2.05rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      border: 1px solid rgba(167, 125, 47, 0.35);
      background: rgba(255, 248, 230, 0.85);
      color: var(--gold);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .card-heading {
      font-size: 1.03rem;
      line-height: 1.35;
    }
    .card-anchor {
      color: var(--blue);
      font-weight: 700;
      opacity: 0.72;
    }
    .decision-card[open] summary {
      border-bottom: 1px solid rgba(205, 191, 174, 0.55);
    }
    .decision-card summary:focus-visible,
    .toolbar input:focus-visible,
    .toolbar button:focus-visible {
      outline: 3px solid rgba(96, 123, 152, 0.45);
      outline-offset: 2px;
    }
    .card-body {
      padding: 16px 16px 18px;
      max-width: var(--measure);
    }
    .card-body > *:first-child { margin-top: 0; }
    .card-body > *:last-child { margin-bottom: 0; }
    .hidden-note {
      display: none;
    }
    .hits {
      color: var(--gold);
      font-weight: 700;
    }
    .muted {
      color: var(--muted);
    }
    .find-stack {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    footer {
      margin-top: 22px;
      color: var(--muted);
      font-size: 0.9rem;
    }
    @media (max-width: 780px) {
      .page { padding: 16px 12px 28px; }
      .page-header,
      .source-shell { padding: 16px; border-radius: 20px; }
      .page-header { position: static; }
      .toolbar { grid-template-columns: 1fr; }
      .toolbar button { width: 100%; }
      .decision-card summary { grid-template-columns: auto 1fr; }
      .card-anchor { display: none; }
    }
    @media print {
      body { background: #fff; }
      .page { padding: 0; }
      .page-header,
      .source-shell,
      .decision-card {
        box-shadow: none !important;
      }
      .page-header {
        position: static;
        backdrop-filter: none;
        border: 0;
        padding: 0 0 16px;
      }
      .toolbar { display: none; }
      .source-shell { break-inside: avoid; page-break-inside: avoid; }
      .decision-card { break-inside: avoid; page-break-inside: avoid; }
      summary { color: #000; }
    }
    """

    current_html = render_document(current_doc, scope="current", initial_open=True)
    prior_html = render_document(prior_doc, scope="historical", initial_open=False)
    current_heads = count_headings(read_text(CURRENT_PATH))
    prior_heads = count_headings(read_text(PRIOR_PATH))

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hearsay — decisions for Ellie</title>
  <style>{css}</style>
</head>
<body>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">Hearsay review surface</p>
      <h1>Hearsay — decisions for Ellie</h1>
      <p class="lede">
        Recommendations in the current review area are being applied now while Ellie reviews later.
        The imported historical docket below preserves the original wording from each decision
        session; those original status statements are historical records and may be outdated today.
      </p>
      <div class="toolbar" role="search" aria-label="Decision search">
        <div>
          <label for="review-search">Search cards</label>
          <input id="review-search" name="review-search" type="search" placeholder="Search the decision cards and notes">
        </div>
        <button id="clear-search" type="button">Clear</button>
        <div class="statusline" id="search-status" aria-live="polite">
          {current_count + prior_count} cards loaded across {current_heads + prior_heads} headings.
        </div>
      </div>
    </header>

    <main>
      <section class="source-shell" id="current-status-shell" aria-labelledby="{current_doc.slug}-title">
        <p class="eyebrow">Current status from <code>docs/review/current.md</code></p>
        {current_html}
      </section>

      <section class="source-shell" id="historical-shell" aria-labelledby="{prior_doc.slug}-title">
        <p class="eyebrow">Historical docket from <code>docs/review/prior-decisions.md</code></p>
        {prior_html}
      </section>
    </main>

    <footer>
      Standalone local file. Search filters decision cards only; the Clear button restores the initial open state.
    </footer>
  </div>

  <script>
    (() => {{
      const search = document.getElementById('review-search');
      const clear = document.getElementById('clear-search');
      const status = document.getElementById('search-status');
      const cards = Array.from(document.querySelectorAll('details.decision-card'));
      const initialStates = new Map(cards.map((card) => [card.id, card.dataset.initialOpen === 'true']));
      const printStates = new Map();
      let inPrintMode = false;

      function applyFilter(value) {{
        const query = value.trim().toLowerCase();
        let matches = 0;
        if (!query) {{
          cards.forEach((card) => {{
            const initialOpen = initialStates.get(card.id) || false;
            card.hidden = false;
            card.open = initialOpen;
          }});
          status.textContent = `{total_count} cards loaded across {current_heads + prior_heads} headings.`;
          return;
        }}

        cards.forEach((card) => {{
          const haystack = (card.dataset.searchText || card.textContent || '').toLowerCase();
          const match = haystack.includes(query);
          card.hidden = !match;
          if (match) {{
            matches += 1;
            card.open = true;
          }}
        }});

        status.textContent = `${{matches}} matching card${{matches === 1 ? '' : 's'}} for "${{value}}"`;
      }}

      function enterPrintMode() {{
        if (inPrintMode) {{
          return;
        }}
        inPrintMode = true;
        cards.forEach((card) => {{
          printStates.set(card.id, {{ hidden: card.hidden, open: card.open }});
          card.hidden = false;
          card.open = true;
        }});
      }}

      function exitPrintMode() {{
        if (!inPrintMode) {{
          return;
        }}
        inPrintMode = false;
        cards.forEach((card) => {{
          const state = printStates.get(card.id);
          if (!state) {{
            return;
          }}
          card.hidden = state.hidden;
          card.open = state.open;
        }});
        printStates.clear();
        applyFilter(search.value);
      }}

      search.addEventListener('input', (event) => {{
        applyFilter(event.target.value);
      }});

      clear.addEventListener('click', () => {{
        search.value = '';
        applyFilter('');
        search.focus();
      }});

      search.addEventListener('keydown', (event) => {{
        if (event.key === 'Escape') {{
          clear.click();
        }}
      }});

      window.addEventListener('beforeprint', enterPrintMode);
      window.addEventListener('afterprint', exitPrintMode);
      if (window.matchMedia) {{
        const media = window.matchMedia('print');
        const syncPrint = (event) => {{
          if (event.matches) {{
            enterPrintMode();
          }} else {{
            exitPrintMode();
          }}
        }};
        if (media.addEventListener) {{
          media.addEventListener('change', syncPrint);
        }} else if (media.addListener) {{
          media.addListener(syncPrint);
        }}
      }}
    }})();
  </script>
</body>
</html>
"""


def write_output(text: str) -> None:
    OUT_PATH.write_text(text, encoding="utf-8")


def main() -> int:
    current_md = read_text(CURRENT_PATH)
    prior_md = read_text(PRIOR_PATH)
    current_doc = parse_document(current_md, "current review")
    prior_doc = parse_document(prior_md, "historical docket")
    html_text = build_html(current_doc, prior_doc)
    write_output(html_text)

    current_cards = count_cards(current_doc)
    prior_cards = count_cards(prior_doc)
    print(f"wrote {OUT_PATH}")
    print(f"current cards: {current_cards}")
    print(f"historical cards: {prior_cards}")
    print(f"total cards: {current_cards + prior_cards}")
    print(f"current headings: {count_headings(current_md)}")
    print(f"historical headings: {count_headings(prior_md)}")
    print(f"bytes: {OUT_PATH.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
