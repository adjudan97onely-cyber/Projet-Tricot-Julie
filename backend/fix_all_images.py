import re

# More reliable image URLs for specific patterns
reliable_images = {
    # Chaussons adulte - warm slippers image
    "chaussons-adulte": "https://images.pexels.com/photos/6765164/pexels-photo-6765164.jpeg",
    # Chaussettes bébé
    "chaussettes-bebe": "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg",
    # Chaussettes laine adulte
    "chaussettes-laine-adulte": "https://images.pexels.com/photos/6765164/pexels-photo-6765164.jpeg",
    # Bandeau torsadé
    "headband-torsade-tricot": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Mitaines
    "mitaines-torsades": "https://images.pexels.com/photos/6046227/pexels-photo-6046227.jpeg",
    # Moufles enfant
    "moufles-enfant": "https://images.pexels.com/photos/3661193/pexels-photo-3661193.jpeg",
    # Brassière bébé
    "brassiere-bebe": "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg",
    # Chaussons bébé crochet
    "chaussons-bebe-crochet": "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg",
    # Bonnet bébé oreilles
    "bonnet-bebe-oreilles": "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg",
    # Combinaison bébé
    "combinaison-bebe": "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg",
    # Gilet sans manches
    "gilet-sans-manches": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Snood enfant
    "snood-enfant-facile": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Snood femme
    "snood-femme-double-tour": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Snood homme
    "snood-homme-urban": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Écharpe enfant
    "echarpe-enfant-coloree": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Écharpe femme
    "echarpe-femme-elegante": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Écharpe homme
    "echarpe-homme-classique": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Couverture point relief
    "couverture-point-relief": "https://images.pexels.com/photos/6850739/pexels-photo-6850739.jpeg",
    # Plaid chunky
    "plaid-chunky": "https://images.pexels.com/photos/6850739/pexels-photo-6850739.jpeg",
    # Pull raglan
    "pull-raglan-debutant": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Cardigan oversize
    "cardigan-oversized": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
    # Short plage
    "short-plage-crochet": "https://images.pexels.com/photos/5325105/pexels-photo-5325105.jpeg",
    # T-shirt coton
    "tshirt-coton-crochet": "https://images.pexels.com/photos/5325105/pexels-photo-5325105.jpeg",
    # Gilet long hiver femme
    "gilet-long-hiver-femme": "https://images.pexels.com/photos/6192554/pexels-photo-6192554.jpeg",
}

with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in reliable_images.items():
    # Find and replace image_url for each pattern
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

print("All images fixed with reliable URLs!")
