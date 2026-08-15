import pathlib, re, sys

BASE = pathlib.Path(__file__).resolve().parents[1]
PROTO = pathlib.Path('/Users/coryanalla/Developer/mybingocard-redesigns')

LINK_MAP = {
    "05-playful-confetti.html": "/",
    "05-playful-confetti-about.html": "/about",
    "05-playful-confetti-features.html": "/features",
    "05-playful-confetti-pricing.html": "/pricing",
    "05-playful-confetti-contact.html": "/contact",
    "05-playful-confetti-guide.html": "/how-to-play-bingo",
    "05-playful-confetti-blog.html": "/blog",
    "05-playful-confetti-legal.html": "/terms",
    "05-playful-confetti-templates.html": "/templates",
    "05-playful-confetti-games.html": "/bingo-games",
    "05-playful-confetti-create.html": "/create",
    "05-playful-confetti-login.html": "/login",
    "05-playful-confetti-signup.html": "/signup",
    "05-playful-confetti-forgot.html": "/forgot-password",
    "05-playful-confetti-dashboard.html": "/dashboard",
    "05-playful-confetti-occasion.html": "/party-bingo",
    "05-playful-confetti-occasion-birthday.html": "/birthday-bingo",
    "05-playful-confetti-occasion-bridal-shower.html": "/bridal-shower-bingo",
    "05-playful-confetti-occasion-classroom.html": "/classroom-bingo",
    "05-playful-confetti-occasion-graduation.html": "/graduation-bingo",
    "05-playful-confetti-occasion-holiday.html": "/holiday-bingo",
    "05-playful-confetti-occasion-numbers.html": "/number-bingo-card-generator",
    "05-playful-confetti-occasion-super-bowl.html": "/super-bowl-bingo",
    "05-playful-confetti-occasion-team-building.html": "/team-building-bingo",
    "05-playful-confetti-occasion-vocabulary.html": "/vocabulary-bingo-generator",
    "05-playful-confetti-occasion-award-show.html": "/bingo-games",
    "05-playful-confetti-occasion-gender-reveal.html": "/baby-prediction-bingo",
}

PAGE_MAP = {
    "05-playful-confetti.html": "app/page.tsx",
    "05-playful-confetti-about.html": "app/about/page.tsx",
    "05-playful-confetti-features.html": "app/features/page.tsx",
    "05-playful-confetti-pricing.html": "app/pricing/page.tsx",
    "05-playful-confetti-contact.html": "app/contact/page.tsx",
    "05-playful-confetti-guide.html": "app/how-to-play-bingo/page.tsx",
    "05-playful-confetti-blog.html": "app/blog/page.tsx",
    "05-playful-confetti-legal.html": "app/terms/page.tsx",
    "05-playful-confetti-templates.html": "app/templates/page.tsx",
    "05-playful-confetti-games.html": "app/bingo-games/page.tsx",
    "05-playful-confetti-occasion.html": "app/party-bingo/page.tsx",
    "05-playful-confetti-occasion-birthday.html": "app/birthday-bingo/page.tsx",
    "05-playful-confetti-occasion-bridal-shower.html": "app/bridal-shower-bingo/page.tsx",
    "05-playful-confetti-occasion-classroom.html": "app/classroom-bingo/page.tsx",
    "05-playful-confetti-occasion-graduation.html": "app/graduation-bingo/page.tsx",
    "05-playful-confetti-occasion-holiday.html": "app/holiday-bingo/page.tsx",
    "05-playful-confetti-occasion-numbers.html": "app/number-bingo-card-generator/page.tsx",
    "05-playful-confetti-occasion-super-bowl.html": "app/super-bowl-bingo/page.tsx",
    "05-playful-confetti-occasion-team-building.html": "app/team-building-bingo/page.tsx",
    "05-playful-confetti-occasion-vocabulary.html": "app/vocabulary-bingo-generator/page.tsx",
    "05-playful-confetti-occasion-award-show.html": "app/wedding-bingo/page.tsx",
    "05-playful-confetti-occasion-gender-reveal.html": "app/baby-prediction-bingo/page.tsx",
}

def clean_href(html: str) -> str:
    def repl(m):
        href = m.group(1)
        mapped = LINK_MAP.get(href)
        if mapped:
            return f'href="{mapped}"'
        if href.endswith(".html") and not href.startswith(("http", "mailto", "#", "/")):
            target = href[:-5]
            if target.startswith("05-playful-confetti-"):
                target = target[len("05-playful-confetti-"):]
            return f'href="/{target}"'
        return m.group(0)
    return re.sub(r'href="([^"]+)"', repl, html)

def extract(html: str):
    title_m = re.search(r'<title>(.*?)</title>', html, re.S)
    title = title_m.group(1).strip() if title_m else "MyBingoCard"
    body_m = re.search(r'<body[^>]*>(.*?)</body>', html, re.S)
    body = body_m.group(1) if body_m else ""
    styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S)
    style = "\n".join(styles)
    body = re.sub(r'<nav[^>]*>.*?</nav>', '', body, flags=re.S)
    body = re.sub(r'<footer[^>]*>.*?</footer>', '', body, flags=re.S)
    body = clean_href(body)
    return title, body, style

TEMPLATE_HEAD = 'import type {{ Metadata }} from "next";\nimport PlayfulShell from "@/components/PlayfulShell";\n\nexport const metadata: Metadata = {{\n  title: "{title}",\n}};\n\nexport default function Page() {{\n  return (\n    <PlayfulShell>\n      <div dangerouslySetInnerHTML={{{{\n        __html: `{body}`,\n      }}}} />'

TEMPLATE_TAIL = '\n    </PlayfulShell>\n  );\n}\n'

errors = []
for src_name, dest in PAGE_MAP.items():
    src = PROTO / src_name
    if not src.exists():
        errors.append(f"missing {src_name}")
        continue
    title, body, style = extract(src.read_text())
    body = body.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    out = TEMPLATE_HEAD.format(title=title, body=body)
    if style.strip():
        style_escaped = style.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
        out += f'\n      <style dangerouslySetInnerHTML={{{{__html: `{style_escaped}`}}}} />'
    out += TEMPLATE_TAIL
    dest_path = BASE / dest
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_text(out)
    print(f"wrote {dest}")

if errors:
    print("ERRORS:", errors, file=sys.stderr)
    sys.exit(1)
