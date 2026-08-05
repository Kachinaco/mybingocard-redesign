"""Map legacy Tailwind color classes to Playful Confetti tokens."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Confetti palette
INK = "#33312e"
PAPER = "#fff7ed"
MUT = "#6b6459"
FAINT = "#a39a88"
PINK = "#ff5d8f"
PURPLE = "#7c5cff"
TEAL = "#2ec4b6"
YELLOW = "#ffb800"
ORANGE = "#ff8a3d"

# Map tailwind hue name -> confetti hue. Some hues collapse into yellow/orange/pink.
HUE_MAP = {
    "slate": "ink",
    "gray": "ink",
    "zinc": "ink",
    "neutral": "ink",
    "stone": "ink",
    "red": "pink",
    "rose": "pink",
    "pink": "pink",
    "fuchsia": "pink",
    "orange": "orange",
    "amber": "yellow",
    "yellow": "yellow",
    "lime": "yellow",
    "green": "teal",
    "emerald": "teal",
    "teal": "teal",
    "cyan": "teal",
    "sky": "teal",
    "blue": "purple",
    "indigo": "purple",
    "violet": "purple",
    "purple": "purple",
}

COLOR_HEX = {
    "ink": INK,
    "mut": MUT,
    "faint": FAINT,
    "pink": PINK,
    "purple": PURPLE,
    "teal": TEAL,
    "yellow": YELLOW,
    "orange": ORANGE,
}

# For ink scale, choose value based on shade.
def ink_value(shade: int) -> str:
    if shade <= 100:
        return PAPER
    if shade <= 300:
        return FAINT
    if shade <= 500:
        return MUT
    return INK


def confetti_value(hue: str, shade: int) -> str:
    if hue == "ink":
        return ink_value(shade)
    return COLOR_HEX[hue]


# Regex for tailwind utility with a color/shade.
# Group 1: prefix (bg-, text-, etc. including variants like hover:bg-)
# Group 2: hue name
# Group 3: shade (50-950)
# Group 4: optional /opacity
COLOR_RE = re.compile(
    r"(?<![a-zA-Z0-9_-])"
    r"((?:[a-z]+:)*?(?:placeholder:|placeholder-|selection:|selection-|caret:|caret-|accent:|accent-|divide-|outline-|ring-|shadow-|decoration-|stroke-|fill-|bg-|text-|border-|from-|to-|via-))"
    r"(slate|gray|zinc|neutral|stone|red|rose|pink|fuchsia|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple)"
    r"-([0-9]{2,4})"
    r"(/[0-9]+)?"
    r"(?![a-zA-Z0-9_-])"
)


def replace_color_class(match: re.Match) -> str:
    prefix = match.group(1)
    hue_name = match.group(2)
    shade = int(match.group(3))
    opacity = match.group(4) or ""
    mapped_hue = HUE_MAP[hue_name]
    value = confetti_value(mapped_hue, shade)
    # For non-ink colors, add an opacity suffix for very light shades to keep subtleness.
    if mapped_hue != "ink" and shade <= 100:
        opacity = opacity or "/10" if shade == 50 else "/15"
    # For shadow utilities, keep the prefix as-is (e.g. shadow-purple-500/20 -> shadow-[#7c5cff]/20)
    # COLOR_RE consumes the prefix including "shadow-", so we just reconstruct.
    return f"{prefix}[{value}]{opacity}"


def apply(text: str) -> str:
    # Protect SVG fill/stroke hex attributes and arbitrary hex classes.
    protected = []
    def protect_hex(m):
        protected.append(m.group(0))
        return f"__PROT{len(protected)-1}__"
    text = re.sub(r'(?:fill|stroke|stop-color|stop-opacity)="#[0-9a-fA-F]{3,8}"', protect_hex, text)

    text = COLOR_RE.sub(replace_color_class, text)

    for i, val in enumerate(protected):
        text = text.replace(f"__PROT{i}__", val)
    return text


def main() -> None:
    paths = [Path(a) for a in sys.argv[1:]] if sys.argv[1:] else []
    if not paths:
        paths = [Path(p.strip()) for p in sys.stdin if p.strip()]
    changed = 0
    for p in paths:
        full = p if p.is_absolute() else REPO / p
        if not full.exists():
            print(f"SKIP {p}")
            continue
        original = full.read_text(encoding="utf-8")
        updated = apply(original)
        if updated != original:
            full.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"UPDATED {full.relative_to(REPO)}")
    print(f"\n{changed} file(s) changed")


if __name__ == "__main__":
    main()
