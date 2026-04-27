"""
Regenerate menu.html sections + JSON-LD from site/menuData.json.

Run after editing menuData.json:
    python scripts/build-menu.py

Updates two regions of site/menu.html marked by HTML comments:
  <!-- BUILD:menu-schema --> ... <!-- BUILD:end -->
  <!-- BUILD:menu-content --> ... <!-- BUILD:end -->

If those markers are missing, the script will insert them on first run.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "menuData.json"
HTML = ROOT / "site" / "menu.html"

DIET_LABELS = {
    "v": ("V", "Vegetarian"),
    "gf": ("GF", "Gluten Free"),
}
DIET_TO_SCHEMA = {
    "v": "https://schema.org/VegetarianDiet",
    "gf": "https://schema.org/GlutenFreeDiet",
}


def html_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )


def build_browse_html(data) -> str:
    """Render the Browse Menu tab body."""
    services_order = ["breakfast", "lunch"]
    service_labels = {"breakfast": "Breakfast", "lunch": "Lunch"}
    out = []

    for service in services_order:
        sections = [s for s in data["sections"] if s.get("service") == service]
        if not sections:
            continue
        out.append(f'    <h2 class="browse-service">{service_labels[service]}</h2>')
        out.append('    <div class="browse-grid">')
        for section in sections:
            out.append(f'    <section class="browse-section" aria-labelledby="sec-{section["id"]}">')
            out.append(f'      <h3 id="sec-{section["id"]}" class="browse-section-title">{html_escape(section["name"])}</h3>')
            note = section.get("note")
            if note:
                out.append(f'      <p class="browse-section-note">{html_escape(note)}</p>')
            out.append('      <ul class="browse-item-list">')
            for item in section["items"]:
                diet = item.get("dietaryFlags", []) or []
                popular = item.get("popular", False)
                price = item.get("price")
                price_html = f'<span class="browse-item-price" aria-label="Price">${price}</span>' if price else ""
                badges = []
                if popular:
                    badges.append('<span class="browse-badge browse-badge-popular" title="Signature dish">★ Popular</span>')
                for d in diet:
                    if d in DIET_LABELS:
                        short, full = DIET_LABELS[d]
                        badges.append(f'<span class="browse-badge browse-badge-diet" title="{full}">{short}</span>')
                badges_html = "".join(badges)
                desc = item.get("description", "")
                desc_html = f'<p class="browse-item-desc">{html_escape(desc)}</p>' if desc else ""
                out.append('        <li class="browse-item">')
                out.append('          <div class="browse-item-head">')
                out.append(f'            <h4 class="browse-item-name">{html_escape(item["name"])}</h4>')
                out.append(f'            {price_html}')
                out.append('          </div>')
                if badges_html:
                    out.append(f'          <div class="browse-item-badges">{badges_html}</div>')
                if desc_html:
                    out.append(f'          {desc_html}')
                out.append('        </li>')
            out.append('      </ul>')
            out.append('    </section>')
        out.append('    </div>')

    return "\n".join(out)


def build_schema(data) -> str:
    """Render the JSON-LD Menu schema using full menuData."""
    sections_jsonld = []
    for section in data["sections"]:
        section_obj = {
            "@type": "MenuSection",
            "name": section["name"],
            "hasMenuItem": []
        }
        if section.get("note"):
            section_obj["description"] = section["note"]
        for item in section["items"]:
            mi = {
                "@type": "MenuItem",
                "name": item["name"],
            }
            if item.get("description"):
                mi["description"] = item["description"]
            if item.get("price"):
                mi["offers"] = {
                    "@type": "Offer",
                    "price": item["price"],
                    "priceCurrency": data.get("currency", "USD")
                }
            diet_uris = [DIET_TO_SCHEMA[d] for d in item.get("dietaryFlags", []) if d in DIET_TO_SCHEMA]
            if len(diet_uris) == 1:
                mi["suitableForDiet"] = diet_uris[0]
            elif len(diet_uris) > 1:
                mi["suitableForDiet"] = diet_uris
            section_obj["hasMenuItem"].append(mi)
        sections_jsonld.append(section_obj)

    schema = {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": "The Copperline Eatery",
        "url": "https://copperlineeatery.com/menu.html",
        "image": "https://copperlineeatery.com/logo.jpg",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "409 Broadway",
            "addressLocality": "Chicopee",
            "addressRegion": "MA",
            "postalCode": "01020",
            "addressCountry": "US"
        },
        "telephone": "+1-413-594-8332",
        "servesCuisine": ["American", "Breakfast", "Brunch", "Lunch"],
        "priceRange": "$$",
        "hasMenu": {
            "@type": "Menu",
            "name": "Breakfast & Lunch Menu",
            "description": "Award-winning homemade breakfast and lunch including eggs benedict, corned beef hash, French toast, and daily specials at The Copperline Eatery in Chicopee, MA.",
            "hasMenuSection": sections_jsonld
        }
    }
    return '<script type="application/ld+json">\n' + json.dumps(schema, indent=2) + '\n    </script>'


def replace_block(html: str, marker: str, new_content: str) -> str:
    pattern = re.compile(
        rf'(<!-- BUILD:{re.escape(marker)} -->)(.*?)(<!-- BUILD:end -->)',
        flags=re.DOTALL,
    )
    if not pattern.search(html):
        raise SystemExit(f"Marker BUILD:{marker} not found in menu.html. Add the markers first.")
    return pattern.sub(lambda m: f"{m.group(1)}\n{new_content}\n    {m.group(3)}", html)


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    html = HTML.read_text(encoding="utf-8")
    html = replace_block(html, "menu-schema", "    " + build_schema(data))
    html = replace_block(html, "menu-content", build_browse_html(data))
    HTML.write_text(html, encoding="utf-8")
    n_items = sum(len(s["items"]) for s in data["sections"])
    n_sections = len(data["sections"])
    print(f"OK  menu.html regenerated: {n_sections} sections, {n_items} items.")


if __name__ == "__main__":
    main()
