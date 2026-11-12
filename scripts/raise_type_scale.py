"""One-off typography pass (2026-11-12): raise the smallest font sizes site-wide.

The design used 8–12 px text for labels, captions and secondary copy, which is not
readable on a phone. This script rewrites those sizes in the hand-authored
stylesheets in dist/. It is NOT idempotent — it was run once and its result is
committed; keep it only as a record of the mapping.

    python scripts/raise_type_scale.py --apply
"""
from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
MAP = {8: 11, 8.5: 11, 9: 11.5, 9.5: 11.5, 10: 12, 10.5: 12, 11: 12.5, 11.5: 13, 12: 13, 12.5: 13.5}
FILES = ['styles.css', 'content.css', 'details.css', 'experience.css', 'home-expansion.css', 'business.css',
         'navigation.css', 'partner-testimonial.css', 'service-extensions.css', 'services.css', 'cms.css']
PATTERN = re.compile(r'(font-size:(?:clamp\()?)(\d+(?:\.\d+)?)px')


def raise_size(match):
    value = float(match.group(2))
    new = MAP.get(value)
    if new is None:
        return match.group(0)
    return f'{match.group(1)}{new:g}px'


def main():
    apply = '--apply' in sys.argv
    total = 0
    for name in FILES:
        path = ROOT / 'dist' / name
        text = path.read_text(encoding='utf-8')
        changed, count = PATTERN.subn(raise_size, text)
        hits = sum(1 for m in PATTERN.finditer(text) if float(m.group(2)) in MAP)
        total += hits
        print(f'{name}: {hits} sizes raised')
        if apply and changed != text:
            path.write_text(changed, encoding='utf-8', newline='\n')
    print(f'total: {total}{"" if apply else " (dry run)"}')


if __name__ == '__main__':
    main()
