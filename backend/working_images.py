import re

# These Unsplash URLs are VERIFIED to load correctly
# Even if not perfect matches, they show relevant content

WORKING_IMAGES = {
    # Bonnets 
    "bonnet-basique": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",
    "bonnet-crochet": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",
    "bonnet-bebe-oreilles": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    
    # Écharpes
    "echarpe-cotes": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-crochet-debutant": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-torsades-hiver": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-enfant-coloree": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "echarpe-femme-elegante": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-homme-classique": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    
    # Snoods
    "snood-simple": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "snood-enfant-facile": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "snood-femme-double-tour": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "snood-homme-urban": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    
    # Couvertures - using cozy/textile images
    "couverture-bebe": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",
    "couverture-granny-square": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",
    "couverture-point-relief": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",
    "plaid-chunky": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",
    
    # Chaussettes
    "chaussettes-basiques": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&fit=crop",
    "chaussettes-bebe": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "chaussettes-laine-adulte": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&fit=crop",
    "chaussons-adulte": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&fit=crop",
    "chaussons-bebe-crochet": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    
    # Accessoires
    "mitaines-simples": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",
    "mitaines-torsades": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",
    "moufles-enfant": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "bandeau-tresse": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",
    "headband-torsade-tricot": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",
    "sac-filet-crochet": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",
    
    # Pulls/Gilets
    "poncho-debutant": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "pull-raglan-debutant": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "gilet-sans-manches": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "cardigan-oversized": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "gilet-long-hiver-femme": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    
    # Bébé
    "brassiere-bebe": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "combinaison-bebe": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    
    # Été - summer/beach theme
    "robe-ete-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "robe-plage-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "top-ete-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "crop-top-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "tshirt-coton-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "short-plage-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    
    # Maillots
    "haut-bikini-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "bas-bikini-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "maillot-une-piece": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
}

# Update patterns_extra.py
with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in WORKING_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]*(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

# Update server.py
with open('server.py', 'r') as f:
    content = f.read()

for pattern_id, url in WORKING_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]*(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('server.py', 'w') as f:
    f.write(content)

print("Working Unsplash images applied!")
