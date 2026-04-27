"""
Regenerate menu.html sections + JSON-LD from site/menuData.json.

Run after editing menuData.json:
    python scripts/build-menu.py

Updates three regions of site/menu.html marked by HTML comments:
  <!-- BUILD:menu-schema --> ... <!-- BUILD:end -->
  <!-- BUILD:breakfast-sections --> ... <!-- BUILD:end -->
  <!-- BUILD:lunch-sections --> ... <!-- BUILD:end -->
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "menuData.json"
HTML = ROOT / "site" / "menu.html"

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


def render_includes(includes) -> str:
    """Render an `includes` field — array of strings or array of {label, items} groups."""
    if not includes:
        return ""
    parts = []
    if isinstance(includes[0], dict):
        # Grouped: each group has a label and items
        for group in includes:
            parts.append(f'          <p class="menu-item-includes-label">{html_escape(group["label"])}</p>')
            parts.append('          <ul class="menu-item-includes">')
            for it in group["items"]:
                parts.append(f'            <li>{html_escape(it)}</li>')
            parts.append('          </ul>')
    else:
        # Flat list of strings
        parts.append('          <ul class="menu-item-includes">')
        for it in includes:
            parts.append(f'            <li>{html_escape(it)}</li>')
        parts.append('          </ul>')
    return "\n" + "\n".join(parts)


def render_item(item: dict) -> str:
    """Single item row: ★? Name V?  ............... $price  + optional desc + optional includes."""
    name = html_escape(item["name"])
    price = item.get("price")
    diet = item.get("dietaryFlags", []) or []
    popular = item.get("popular", False)
    desc = item.get("description", "")
    includes = item.get("includes")

    star = '<span class="menu-item-popular" aria-label="Signature dish" title="Signature dish">★</span>' if popular else ""
    veg = '<span class="menu-item-veg" aria-label="Vegetarian" title="Vegetarian">V</span>' if "v" in diet else ""
    leader_html = '<span class="menu-item-leader" aria-hidden="true"></span>' if price else ""
    price_html = f'<span class="menu-item-price">${price}</span>' if price else ""
    desc_html = f'\n          <p class="menu-item-desc">{html_escape(desc)}</p>' if desc else ""
    includes_html = render_includes(includes)

    return (
        '        <div class="menu-item">\n'
        '          <div class="menu-item-row">\n'
        f'            {star}<span class="menu-item-name">{name}{veg}</span>\n'
        f'            {leader_html}\n'
        f'            {price_html}\n'
        '          </div>'
        f'{desc_html}'
        f'{includes_html}\n'
        '        </div>'
    )


def render_section(section: dict) -> str:
    sid = section["id"]
    title = html_escape(section["name"])
    note_html = ""
    if section.get("note"):
        note_html = f'\n          <p class="menu-section-note">{html_escape(section["note"])}</p>'
    items_html = "\n".join(render_item(item) for item in section["items"])
    return (
        f'      <section class="menu-section" aria-labelledby="sec-{sid}">\n'
        f'        <header class="menu-section-header">\n'
        f'          <h3 id="sec-{sid}" class="menu-section-title">{title}</h3>{note_html}\n'
        f'        </header>\n'
        f'{items_html}\n'
        f'      </section>'
    )


def build_service_html(data: dict, service: str) -> str:
    sections = [s for s in data["sections"] if s.get("service") == service]
    return "\n".join(render_section(s) for s in sections)


def build_schema(data: dict) -> str:
    """Render JSON-LD Restaurant + full priced Menu."""
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
            mi = {"@type": "MenuItem", "name": item["name"]}
            # Flatten description + includes into a single schema description for AI scrapability
            desc_parts = []
            if item.get("description"):
                desc_parts.append(item["description"])
            if item.get("includes"):
                inc = item["includes"]
                if inc and isinstance(inc[0], dict):
                    for group in inc:
                        desc_parts.append(f"{group['label']}: " + ", ".join(group['items']) + ".")
                else:
                    desc_parts.append("Includes: " + ", ".join(inc) + ".")
            if desc_parts:
                mi["description"] = " ".join(desc_parts).strip()
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
    html = replace_block(html, "breakfast-sections", build_service_html(data, "breakfast"))
    html = replace_block(html, "lunch-sections", build_service_html(data, "lunch"))
    html = replace_block(html, "catering-sections", build_service_html(data, "catering"))
    HTML.write_text(html, encoding="utf-8")
    n_items = sum(len(s["items"]) for s in data["sections"])
    print(f"OK  menu.html regenerated: {len(data['sections'])} sections, {n_items} items.")


if __name__ == "__main__":
    main()
