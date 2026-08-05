"""Bulk class-name replays for the Playful Confetti reskin."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

REPLACEMENTS = [
    (r"\bbg-slate-50\b", "bg-[#fff7ed]"),
    (r"\bbg-slate-100\b", "bg-[#fff7ed]"),
    (r"\bbg-slate-200\b", "bg-[#a39a88]/20"),
    (r"\bbg-slate-900\b", "bg-[#33312e]"),
    (r"\btext-slate-900\b", "text-[#33312e]"),
    (r"\btext-slate-800\b", "text-[#33312e]"),
    (r"\btext-slate-700\b", "text-[#6b6459]"),
    (r"\btext-slate-600\b", "text-[#6b6459]"),
    (r"\btext-slate-500\b", "text-[#a39a88]"),
    (r"\btext-slate-400\b", "text-[#a39a88]"),
    (r"\btext-slate-300\b", "text-[#a39a88]/60"),
    (r"\bborder-slate-100\b", "border-[#33312e]/10"),
    (r"\bborder-slate-200\b", "border-[#33312e]/15"),
    (r"\bborder-slate-300\b", "border-[#33312e]/25"),
    (r"\bborder-slate-900\b", "border-[#33312e]"),
    (r"\bbg-gray-50\b", "bg-[#fff7ed]"),
    (r"\bbg-gray-100\b", "bg-[#f2e8da]"),
    (r"\bbg-gray-200\b", "bg-[#a39a88]/20"),
    (r"\bbg-gray-900\b", "bg-[#33312e]"),
    (r"\btext-gray-900\b", "text-[#33312e]"),
    (r"\btext-gray-700\b", "text-[#6b6459]"),
    (r"\btext-gray-600\b", "text-[#6b6459]"),
    (r"\btext-gray-500\b", "text-[#a39a88]"),
    (r"\btext-gray-400\b", "text-[#a39a88]"),
    (r"\bborder-gray-100\b", "border-[#33312e]/10"),
    (r"\bborder-gray-200\b", "border-[#33312e]/15"),
    (r"\bborder-gray-300\b", "border-[#33312e]/25"),
    (r"\btext-indigo-600\b", "text-[#7c5cff]"),
    (r"\btext-indigo-700\b", "text-[#7c5cff]"),
    (r"\btext-violet-600\b", "text-[#ff5d8f]"),
    (r"\btext-violet-700\b", "text-[#ff5d8f]"),
    (r"\bbg-indigo-600\b", "bg-[#7c5cff]"),
    (r"\bbg-indigo-500\b", "bg-[#7c5cff]"),
    (r"\bbg-violet-600\b", "bg-[#ff5d8f]"),
    (r"\bbg-violet-500\b", "bg-[#ff5d8f]"),
    (r"\bborder-indigo-100\b", "border-[#7c5cff]/20"),
    (r"\bborder-indigo-200\b", "border-[#7c5cff]/30"),
    (r"\bborder-indigo-400\b", "border-[#7c5cff]"),
    (r"\bborder-indigo-500\b", "border-[#7c5cff]"),
    (r"\bhover:text-indigo-700\b", "hover:text-[#6a4de6]"),
    (r"\bhover:text-violet-700\b", "hover:text-[#e04a7c]"),
    (r"\bhover:bg-indigo-700\b", "hover:bg-[#6a4de6]"),
    (r"\bhover:bg-violet-700\b", "hover:bg-[#e04a7c]"),
    (r"\bfocus:ring-indigo-500\b", "focus:ring-[#7c5cff]"),
    (r"\bfocus:ring-violet-500\b", "focus:ring-[#ff5d8f]"),
    (r"\bfocus:border-indigo-500\b", "focus:border-[#7c5cff]"),
    (r"\bfocus:border-violet-500\b", "focus:border-[#ff5d8f]"),
    (r"\bfrom-violet-900\b", "from-[#7c5cff]"),
    (r"\bvia-indigo-900\b", "via-[#5d3fe6]"),
    (r"\bto-slate-900\b", "to-[#33312e]"),
    (r"\bfrom-violet-600\b", "from-[#ff5d8f]"),
    (r"\bto-indigo-600\b", "to-[#7c5cff]"),
    (r"\bfrom-indigo-600\b", "from-[#7c5cff]"),
    (r"\bto-violet-600\b", "to-[#ff5d8f]"),
    (r"\bbg-green-50\b", "bg-[#2ec4b6]/10"),
    (r"\bbg-green-100\b", "bg-[#2ec4b6]/15"),
    (r"\btext-green-600\b", "text-[#2ec4b6]"),
    (r"\btext-green-700\b", "text-[#2ec4b6]"),
    (r"\bbg-emerald-50\b", "bg-[#2ec4b6]/10"),
    (r"\bbg-emerald-100\b", "bg-[#2ec4b6]/15"),
    (r"\btext-emerald-700\b", "text-[#2ec4b6]"),
    (r"\bborder-emerald-200\b", "border-[#2ec4b6]/25"),
    (r"\bbg-red-50\b", "bg-[#ff5d8f]/10"),
    (r"\bbg-red-100\b", "bg-[#ff5d8f]/15"),
    (r"\btext-red-600\b", "text-[#ff5d8f]"),
    (r"\btext-red-700\b", "text-[#ff5d8f]"),
    (r"\bborder-red-100\b", "border-[#ff5d8f]/20"),
    (r"\bfont-black\b", "font-heading font-bold"),
    (r"\btracking-tight\b", ""),
    (r"\bbg-gradient-to-b from-slate-50 to-white\b", "bg-[#fff7ed]"),
    (r"\btext-slate-950\b", "text-[#33312e]"),
    (r"\bbg-slate-950\b", "bg-[#33312e]"),
    (r"\bbg-indigo-50\b", "bg-[#7c5cff]/10"),
    (r"\bbg-indigo-100\b", "bg-[#7c5cff]/15"),
    (r"\bbg-indigo-200\b", "bg-[#7c5cff]/25"),
    (r"\bbg-indigo-900\b", "bg-[#7c5cff]"),
    (r"\btext-indigo-100\b", "text-[#7c5cff]/30"),
    (r"\btext-indigo-200\b", "text-[#7c5cff]/50"),
    (r"\btext-indigo-300\b", "text-[#7c5cff]/70"),
    (r"\btext-indigo-900\b", "text-[#33312e]"),
    (r"\bto-indigo-700\b", "to-[#5d3fe6]"),
    (r"\bto-indigo-900\b", "to-[#5d3fe6]"),
    (r"\bshadow-indigo-200\b", "shadow-[#7c5cff]/20"),
    (r"\bshadow-indigo-300\b", "shadow-[#7c5cff]/30"),
    (r"\bshadow-indigo-100/60\b", "shadow-[#7c5cff]/10"),
    (r"\bselection:bg-indigo-100\b", "selection:bg-[#7c5cff]/20"),
    (r"\bselection:text-indigo-900\b", "selection:text-[#33312e]"),
    (r"\bhover:border-indigo-300\b", "hover:border-[#7c5cff]/40"),
    (r"\bhover:text-indigo-600\b", "hover:text-[#7c5cff]"),
    (r"\bhover:text-violet-600\b", "hover:text-[#ff5d8f]"),
    (r"\bborder-indigo-50\b", "border-[#7c5cff]/10"),
    (r"\bborder-indigo-300\b", "border-[#7c5cff]/40"),
    (r"\bbg-violet-100\b", "bg-[#ff5d8f]/15"),
    (r"\bbg-violet-50\b", "bg-[#ff5d8f]/10"),
    (r"\btext-violet-100\b", "text-[#ff5d8f]/30"),
    (r"\btext-violet-200\b", "text-[#ff5d8f]/50"),
    (r"\btext-violet-300\b", "text-[#ff5d8f]/70"),
    (r"\btext-violet-500\b", "text-[#ff5d8f]"),
    (r"\bfrom-violet-500\b", "from-[#ff5d8f]"),
    (r"\bto-violet-500\b", "to-[#ff5d8f]"),
    (r"\bfrom-violet-700\b", "from-[#e04a7c]"),
    (r"\bto-violet-700\b", "to-[#e04a7c]"),
    (r"\bbg-purple-500\b", "bg-[#7c5cff]"),
    (r"\bbg-purple-600\b", "bg-[#7c5cff]"),
    (r"\btext-purple-300\b", "text-[#7c5cff]/70"),
    (r"\btext-purple-500\b", "text-[#7c5cff]"),
    (r"\bbg-emerald-50\b", "bg-[#2ec4b6]/10"),
    (r"\bbg-emerald-100\b", "bg-[#2ec4b6]/15"),
    (r"\btext-emerald-600\b", "text-[#2ec4b6]"),
    (r"\btext-emerald-700\b", "text-[#2ec4b6]"),
    (r"\bbg-yellow-50\b", "bg-[#ffb800]/10"),
    (r"\bbg-yellow-100\b", "bg-[#ffb800]/15"),
    (r"\btext-yellow-600\b", "text-[#ffb800]"),
    (r"\bbg-orange-50\b", "bg-[#ff8a3d]/10"),
    (r"\btext-orange-600\b", "text-[#ff8a3d]"),
    (r"\btext-orange-700\b", "text-[#ff8a3d]"),
    (r"\bbg-teal-50\b", "bg-[#2ec4b6]/10"),
    (r"\btext-teal-700\b", "text-[#2ec4b6]"),
    (r"\bbg-slate-300\b", "bg-[#a39a88]/40"),
    (r"\bbg-slate-800\b", "bg-[#33312e]"),
    (r"\bbg-slate-950\b", "bg-[#33312e]"),
    (r"\btext-slate-950\b", "text-[#33312e]"),
    (r"\bborder-slate-300\b", "border-[#33312e]/25"),
    (r"\bborder-slate-800\b", "border-[#33312e]"),
    (r"\bborder-violet-100\b", "border-[#ff5d8f]/20"),
    (r"\bfrom-violet-50\b", "from-[#ff5d8f]/10"),
    (r"\bto-violet-50\b", "to-[#ff5d8f]/10"),
    (r"\bfrom-indigo-50\b", "from-[#7c5cff]/10"),
    (r"\bto-indigo-50\b", "to-[#7c5cff]/10"),
    (r"\bshadow-slate-900/20\b", "shadow-[#33312e]/20"),
    (r"\bshadow-slate-900/30\b", "shadow-[#33312e]/30"),
    (r"\bshadow-slate-900/40\b", "shadow-[#33312e]/40"),
    (r"\bhover:shadow-indigo-500/10\b", "hover:shadow-[#7c5cff]/10"),
    (r"\bshadow-indigo-500/10\b", "shadow-[#7c5cff]/10"),
    (r"\bshadow-indigo-500/20\b", "shadow-[#7c5cff]/20"),
    (r"\bshadow-violet-500/10\b", "shadow-[#ff5d8f]/10"),
    (r"\bshadow-violet-500/20\b", "shadow-[#ff5d8f]/20"),
    (r"\bborder-indigo-600\b", "border-[#7c5cff]"),
    (r"\bborder-indigo-500\b", "border-[#7c5cff]"),
    (r"\bbg-indigo-50\b", "bg-[#7c5cff]/10"),
    (r"\bbg-indigo-100\b", "bg-[#7c5cff]/15"),
    (r"\bbg-indigo-200\b", "bg-[#7c5cff]/25"),
    (r"\bbg-indigo-900\b", "bg-[#7c5cff]"),
    (r"\btext-indigo-100\b", "text-[#7c5cff]/30"),
    (r"\btext-indigo-200\b", "text-[#7c5cff]/50"),
    (r"\btext-indigo-300\b", "text-[#7c5cff]/70"),
    (r"\btext-indigo-900\b", "text-[#33312e]"),
    (r"\bto-indigo-700\b", "to-[#5d3fe6]"),
    (r"\bto-indigo-900\b", "to-[#5d3fe6]"),
    (r"\bshadow-indigo-200\b", "shadow-[#7c5cff]/20"),
    (r"\bshadow-indigo-300\b", "shadow-[#7c5cff]/30"),
    (r"\bselection:bg-indigo-100\b", "selection:bg-[#7c5cff]/20"),
    (r"\bselection:text-indigo-900\b", "selection:text-[#33312e]"),
    (r"\bhover:border-indigo-300\b", "hover:border-[#7c5cff]/40"),
    (r"\bhover:text-indigo-600\b", "hover:text-[#7c5cff]"),
    (r"\bhover:text-violet-600\b", "hover:text-[#ff5d8f]"),
    (r"\bborder-indigo-50\b", "border-[#7c5cff]/10"),
    (r"\bborder-indigo-300\b", "border-[#7c5cff]/40"),
    (r"\bbg-violet-100\b", "bg-[#ff5d8f]/15"),
    (r"\bbg-violet-50\b", "bg-[#ff5d8f]/10"),
    (r"\btext-violet-100\b", "text-[#ff5d8f]/30"),
    (r"\btext-violet-200\b", "text-[#ff5d8f]/50"),
    (r"\btext-violet-300\b", "text-[#ff5d8f]/70"),
    (r"\btext-violet-500\b", "text-[#ff5d8f]"),
    (r"\bfrom-violet-500\b", "from-[#ff5d8f]"),
    (r"\bto-violet-500\b", "to-[#ff5d8f]"),
    (r"\bfrom-violet-700\b", "from-[#e04a7c]"),
    (r"\bto-violet-700\b", "to-[#e04a7c]"),
    (r"\bbg-purple-500\b", "bg-[#7c5cff]"),
    (r"\bbg-purple-600\b", "bg-[#7c5cff]"),
    (r"\btext-purple-300\b", "text-[#7c5cff]/70"),
    (r"\btext-purple-500\b", "text-[#7c5cff]"),
    (r"\bbg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900\b", "bg-[#7c5cff]"),
]


def apply(text: str) -> str:
    protected = []

    def protect(m):
        protected.append(m.group(0))
        return f"__PROT{len(protected)-1}__"

    text = re.sub(r'fill="#[0-9a-fA-F]{3,6}"', protect, text)
    text = re.sub(r'stroke="#[0-9a-fA-F]{3,6}"', protect, text)

    for pat, repl in REPLACEMENTS:
        text = re.sub(pat, repl, text)

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
        else:
            print(f"UNCHANGED {full.relative_to(REPO)}")
    print(f"\n{changed} file(s) changed")


if __name__ == "__main__":
    main()
