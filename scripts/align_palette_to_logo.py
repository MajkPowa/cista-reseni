"""One-off palette pass (2026-11-12): align the site colours with the logo.

Logo colours (dist/assets/brand-logo.svg): green #3ea215, navy #042752.
The earlier design used a navy #12375b and a bright blue accent #216fe5 that
does not appear in the logo. This script rewrites the hand-authored stylesheets:

  navy   #12375b                    -> #042752
  accent #216fe5 as text/outline    -> var(--green-ink)  #237c03 (5.4:1 on white)
  accent #216fe5 as fill/border     -> var(--green)      #3ea215 (logo green)
  hover blues                       -> lighter green fill / darker green text
  light-blue selected/hover tints   -> light green tints
  light-blue accent on dark panels  -> light green #a5e384

Illustrations (SVG files, the water schematic) are not touched: water stays blue.
NOT idempotent — run once, result committed; kept as a record of the mapping.

    python scripts/align_palette_to_logo.py --apply
"""
from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
CSS = ['styles.css', 'content.css', 'details.css', 'experience.css', 'home-expansion.css', 'business.css', 'navigation.css',
       'partner-testimonial.css', 'service-extensions.css', 'services.css', 'cms.css', 'polish.css', 'branding.css']
GREEN, GREEN_INK, GREEN_HOVER, GREEN_INK_HOVER = '#3ea215', '#237c03', '#4ab31c', '#1b6502'
ACCENT = re.compile(r'#216fe5([0-9a-f]{2})?|var\(--(?:blue|detail-blue|ext-blue)\)', re.I)
HOVER = re.compile(r'#(?:1859be|1b58b8|185bc0)\b', re.I)
SIMPLE = [
    (re.compile(r'#12375b', re.I), '#042752'),
    (re.compile(r'rgba\(18,\s*55,\s*91,'), 'rgba(4,39,82,'),
    (re.compile(r'rgba\(33,\s*111,\s*229,'), 'rgba(62,162,21,'),
    (re.compile(r'#(?:e8f1ff|eef5ff|e7f1ff|edf5ff|e9f3ff|e8f2ff|eff6ff|e4efff)\b', re.I), '#edf7e7'),
    (re.compile(r'#dcecff\b', re.I), '#e2f3d9'),
    (re.compile(r'#b8d4ff\b', re.I), '#bfe3ad'),
    (re.compile(r'#9dd9ff\b', re.I), '#a5e384'),
]


def prop_before(text, index):
    """Name of the CSS property whose value contains position `index`."""
    start = max(text.rfind(';', 0, index), text.rfind('{', 0, index)) + 1
    return text[start:index].split(':', 1)[0].strip().lower()


def recolor(text):
    def accent(match):
        prop = prop_before(text, match.start())
        alpha = match.group(1) or ''
        if alpha: return GREEN + alpha
        if prop.startswith('--'): return GREEN
        if prop == 'color' or prop.startswith('outline') or prop == 'text-decoration-color': return 'var(--green-ink)'
        return 'var(--green)'

    def hover(match):
        return GREEN_INK_HOVER if prop_before(text, match.start()) == 'color' else GREEN_HOVER

    text = ACCENT.sub(accent, text)
    text = HOVER.sub(hover, text)
    for pattern, replacement in SIMPLE:
        text = pattern.sub(replacement, text)
    # Large headline accents use the logo green itself (3.1:1 is sufficient for large text).
    text = re.sub(r'((?:[^{}]*h[12] span[^{}]*)\{color:)var\(--green-ink\)\}', r'\1var(--green)}', text)
    return text


def main():
    apply = '--apply' in sys.argv
    for name in CSS:
        path = ROOT / 'dist' / name
        before = path.read_text(encoding='utf-8')
        after = recolor(before)
        if name == 'styles.css':
            root = re.search(r':root\{[^}]*\}', after).group(0)
            new_root = (':root{--ink:#042752;--green:#3ea215;--green-ink:#237c03;--green-hover:#4ab31c;--blue:#237c03;--sky:#e2f3d9;'
                        '--ice:#f5f9ff;--accent:#a5e384;--muted:#546d88;--paper:#f5f9ff;--line:#d8e3ef;--aqua:#e2f3d9;--lime:#a5e384;--white:#fff;--radius:8px}')
            after = after.replace(root, new_root)
        changed = sum(1 for a, b in zip(before, after) if a != b) or (len(before) != len(after))
        print(f'{name}: {"changed" if after != before else "unchanged"}')
        if apply and after != before:
            path.write_text(after, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
