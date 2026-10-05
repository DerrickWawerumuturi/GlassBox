"""
The skills discovery report as one self-contained page (discover.py --html).

Each candidate gets Add / Reject / Skip. Nothing is written from the page: "Copy
decisions" puts plain lines on the clipboard, which are then applied to
skills.txt and skills_rejected.txt by hand or by a reviewed change.

    ADD     typography | design
    REJECT  workflows
"""
import html

from src.matching.matcher import FAMILY_LABELS


def _label(family: str) -> str:
    # The labels are written for sentences ("an unclassified role"); a heading drops the article.
    text = FAMILY_LABELS.get(family, family).removeprefix("a ").removeprefix("an ")
    return html.escape(text[:1].upper() + text[1:])

_STYLE = """
:root{--bg:#fff;--soft:#f7f7f5;--ink:#37352f;--strong:#191919;--muted:#787774;--line:#e9e9e7;--ok:#2f7d56;--thin:#b83a18}
@media (prefers-color-scheme:dark){:root{--bg:#191919;--soft:#202020;--ink:#d4d4d2;--strong:#f1f1ef;--muted:#9b9a97;--line:#2f2f2f;--ok:#5fd39a;--thin:#f5532a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,system-ui,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:40px 20px 120px}h1{color:var(--strong);font-size:32px;margin:0 0 6px}
h2{color:var(--strong);font-size:20px;margin:40px 0 6px}.meta{color:var(--muted);font-size:13px}
table{width:100%;border-collapse:collapse;margin:10px 0}th{text-align:left;color:var(--muted);font-weight:500;font-size:12px}
th,td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.bar{height:8px;background:var(--line);border-radius:4px;width:160px;display:inline-block;vertical-align:middle}
.bar i{display:block;height:100%;border-radius:4px}.term b{color:var(--strong)}.ex{color:var(--muted);font-size:13px}
.src{font:11px ui-monospace,monospace;color:var(--muted)}.pick label{margin-right:8px;font-size:13px;white-space:nowrap}
.dock{position:fixed;left:0;right:0;bottom:0;background:var(--soft);border-top:1px solid var(--line);padding:10px 20px;display:flex;gap:12px;align-items:center}
button{font:inherit;padding:6px 12px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--strong);cursor:pointer}
@media (max-width:700px){.ex{display:block}.bar{width:90px}}
"""

_SCRIPT = """
function decisions(){
  const out=[];
  document.querySelectorAll('tr[data-term]').forEach(r=>{
    const v=(r.querySelector('input:checked')||{}).value;
    if(v==='add') out.push('ADD     '+r.dataset.term+' | '+r.dataset.family);
    if(v==='reject') out.push('REJECT  '+r.dataset.term);
  });
  return out.join('\\n');
}
function refresh(){const d=decisions();document.getElementById('n').textContent=d?d.split('\\n').length+' decisions':'no decisions yet';}
document.addEventListener('change',refresh);
document.getElementById('copy').onclick=()=>{navigator.clipboard.writeText(decisions());document.getElementById('copy').textContent='Copied';};
refresh();
"""


def _coverage_rows(families: list[dict]) -> str:
    rows = []
    for f in families:
        pct = f["covered_pct"]
        colour = "var(--ok)" if pct >= f["bar"] else "var(--thin)"
        rows.append(f'<tr><td>{_label(f["family"])}</td><td>{f["readable"]}</td>'
                    f'<td><span class="bar"><i style="width:{pct}%;background:{colour}"></i></span> {pct}%</td>'
                    f'<td>{f["median_skills"]:g}</td></tr>')
    return "".join(rows)


def _candidate_rows(family: dict) -> str:
    rows = []
    for c in family["candidates"]:
        name = f'{family["family"]}-{c["term"]}'
        picks = "".join(f'<label><input type="radio" name="{html.escape(name)}" value="{v}"> {t}</label>'
                        for v, t in (("add", "Add"), ("reject", "Reject"), ("skip", "Skip")))
        rows.append(f'<tr data-term="{html.escape(c["term"])}" data-family="{family["family"]}">'
                    f'<td class="term"><b>{html.escape(c["display"])}</b><br><span class="src">{c["source"]}</span></td>'
                    f'<td>{c["postings"]} <span class="meta">({round(100 * c["share"])}%)</span></td>'
                    f'<td>×{c["lift"]}</td><td class="ex">{html.escape(c["example"])}</td>'
                    f'<td class="pick">{picks}</td></tr>')
    return "".join(rows)


def render(report: dict) -> str:
    # Thinnest coverage first: that is where a review changes what users see.
    mined = sorted((f for f in report["families"] if f["mined"] and f["candidates"]), key=lambda f: f["covered_pct"])
    sections = "".join(
        f'<h2>{_label(f["family"])}</h2>'
        f'<p class="meta">{f["readable"]} readable postings · {f["covered_pct"]}% covered today</p>'
        f'<table><tr><th>Term</th><th>Postings</th><th>Specificity</th><th>Example</th><th>Decision</th></tr>'
        f'{_candidate_rows(f)}</table>' for f in mined)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Skills Discovery</title>
<style>{_STYLE}</style></head><body><div class="wrap">
<p class="meta">Generated {html.escape(report["generated"])} UTC · {report["readable"]:,} readable postings in the live pool</p>
<h1>Skills discovery</h1>
<p>Where the skill list is thin, and terms from real postings it doesn't know yet. <b>Add</b> what a CV could list and a
course could teach. <b>Reject</b> soft skills, generic words, company names and job titles; they never come back.
"Specificity" says how much more common a term is in this family than across the pool.</p>
<h2>Coverage</h2><p class="meta">Share of readable postings where the list finds at least 3 skills. Each family's bar is 80%, product's 60%.</p>
<table><tr><th>Family</th><th>Readable</th><th>Covered</th><th>Median skills</th></tr>{_coverage_rows(report["families"])}</table>
{sections}
</div><div class="dock"><button id="copy">Copy decisions</button><span id="n" class="meta"></span></div>
<script>{_SCRIPT}</script>
</body></html>"""
