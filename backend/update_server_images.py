import re

# Mapping for server.py patterns
image_updates = {
    # Chaussettes classiques
    "Des chaussettes confortables tricotées du haut vers le bas": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82",
    # Poncho
    "Un poncho facile composé de deux rectangles": "https://images.unsplash.com/photo-1611241893603-3c359704e0ee",
    # Écharpe crochet
    "Une écharpe simple au crochet, parfaite pour apprendre": "https://images.unsplash.com/photo-1601925228446-89029cb1e76f",
    # Bandeau tressé
    "Un bandeau élégant avec une torsade centrale": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531",
}

with open('server.py', 'r') as f:
    content = f.read()

for desc, url in image_updates.items():
    pattern = rf'("description":\s*"{desc}[^"]*",\s*"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content)

with open('server.py', 'w') as f:
    f.write(content)

print("Server images updated!")
