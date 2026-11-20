#!/usr/bin/env python3
"""WCAG 2.x contrast checker for design-system color pairs.

Usage:
  python3 contrast.py pairs.txt           # or pipe lines via stdin
  python3 contrast.py --pair "#FFFFFF" "#1F5E4A"

Input lines (one pair per line, '#' comments and blank lines ignored):
  <label> | <foreground hex> | <background hex> [| <min ratio>]
min ratio defaults to 4.5 (body text). Use 3 for large text, icons and outlines.

Example:
  light onPrimary/primary   | #FFFFFF | #1F5E4A
  light outline/surface     | #707973 | #F7FAF6 | 3

Prints a markdown table. Exit code 1 if any pair fails, so the agent cannot miss it.
"""
import re
import sys

HEX = re.compile(r"^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$")


def parse_hex(value: str) -> str:
    m = HEX.match(value.strip())
    if not m:
        raise ValueError(f"not a hex color: {value!r}")
    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return h.upper()


def luminance(h: str) -> float:
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    rgb = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def ratio(fg: str, bg: str) -> float:
    a, b = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)


def check(rows):
    print("| Pair | Foreground | Background | Ratio | Needs | Result |")
    print("|---|---|---|---|---|---|")
    failed = 0
    for label, fg, bg, need in rows:
        r = ratio(fg, bg)
        ok = r >= need
        failed += not ok
        print(f"| {label} | #{fg} | #{bg} | {r:.1f}:1 | {need:g}:1 | {'✓ pass' if ok else '✗ FAIL'} |")
    print(f"\n{len(rows) - failed}/{len(rows)} pairs pass WCAG AA.")
    return failed


def read_rows(lines):
    rows = []
    for n, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith("#"):  # labels never start with '#'
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) not in (3, 4):
            sys.exit(f"line {n}: expected 'label | fg | bg [| min]', got: {line}")
        need = float(parts[3]) if len(parts) == 4 else 4.5
        try:
            rows.append((parts[0], parse_hex(parts[1]), parse_hex(parts[2]), need))
        except ValueError as e:
            sys.exit(f"line {n}: {e}")
    return rows


def main(argv):
    if len(argv) >= 3 and argv[0] == "--pair":
        need = float(argv[3]) if len(argv) > 3 else 4.5
        rows = [("pair", parse_hex(argv[1]), parse_hex(argv[2]), need)]
    elif argv:
        with open(argv[0], encoding="utf-8") as f:
            rows = read_rows(f)
    else:
        rows = read_rows(sys.stdin)
    if not rows:
        sys.exit("no color pairs given")
    return 1 if check(rows) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
