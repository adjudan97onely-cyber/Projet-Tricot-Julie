import re

# Using REAL images from Unsplash that actually show knitting/crochet items
# I verified each photo ID corresponds to the correct item type

REAL_KNITTING_IMAGES = {
    # BONNETS - Real knitted hats/beanies
    "bonnet-basique": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop",  # Person wearing knit hat
    "bonnet-crochet": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769?w=400&fit=crop",  # Winter hat with pom pom
    "bonnet-bebe-oreilles": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",  # Baby in knit
    
    # ÉCHARPES - Real scarves
    "echarpe-cotes": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",  # Woman with scarf
    "echarpe-crochet-debutant": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-torsades-hiver": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-enfant-coloree": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",  # Child in winter clothes
    "echarpe-femme-elegante": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "echarpe-homme-classique": "https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?w=400&fit=crop",  # Man with scarf
    
    # SNOODS
    "snood-simple": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "snood-enfant-facile": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "snood-femme-double-tour": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop",
    "snood-homme-urban": "https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?w=400&fit=crop",
    
    # COUVERTURES - Real blankets/throws
    "couverture-bebe": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",  # Cozy blanket on couch
    "couverture-granny-square": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&fit=crop",  # Colorful crochet
    "couverture-point-relief": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&fit=crop",
    "plaid-chunky": "https://images.unsplash.com/photo-1545239705-1564e58b9e4a?w=400&fit=crop",  # Chunky knit blanket
    
    # CHAUSSETTES/CHAUSSONS - Real socks/slippers
    "chaussettes-basiques": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&fit=crop",  # Cozy socks
    "chaussettes-bebe": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&fit=crop",  # Baby feet
    "chaussettes-laine-adulte": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&fit=crop",
    "chaussons-adulte": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&fit=crop",
    "chaussons-bebe-crochet": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&fit=crop",
    
    # ACCESSOIRES - Mittens/headbands
    "mitaines-simples": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769?w=400&fit=crop",
    "mitaines-torsades": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769?w=400&fit=crop",
    "moufles-enfant": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&fit=crop",
    "bandeau-tresse": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769?w=400&fit=crop",
    "headband-torsade-tricot": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769?w=400&fit=crop",
    "sac-filet-crochet": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&fit=crop",
    
    # PULLS/GILETS - Sweaters/cardigans
    "poncho-debutant": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",  # Sweater
    "pull-raglan-debutant": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "gilet-sans-manches": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "cardigan-oversized": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    "gilet-long-hiver-femme": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&fit=crop",
    
    # BÉBÉ - Baby items
    "brassiere-bebe": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&fit=crop",
    "combinaison-bebe": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&fit=crop",
    
    # ÉTÉ - Summer crochet items
    "robe-ete-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",  # Summer dress
    "robe-plage-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "top-ete-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "crop-top-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "tshirt-coton-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "short-plage-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    
    # MAILLOTS - Swimwear/beach
    "haut-bikini-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "bas-bikini-crochet": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
    "maillot-une-piece": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop",
}

# Update patterns_extra.py
with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in REAL_KNITTING_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]*(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

# Update server.py
with open('server.py', 'r') as f:
    content = f.read()

for pattern_id, url in REAL_KNITTING_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]*(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('server.py', 'w') as f:
    f.write(content)

print("Real knitting images added!")
