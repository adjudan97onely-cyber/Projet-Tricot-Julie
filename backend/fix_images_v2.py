import re

# Use working Unsplash images that I know display correctly
working_images = {
    # Chaussons/chaussettes - knitted socks/slippers 
    "chaussons-adulte": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82",
    "chaussettes-bebe": "https://images.unsplash.com/photo-1519689680058-324335c77eba",
    "chaussettes-laine-adulte": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82",
    
    # Bandeau/headband
    "headband-torsade-tricot": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531",
    "bandeau-tresse": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531",
    
    # Mitaines/moufles - gloves/mittens
    "mitaines-torsades": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f",
    "moufles-enfant": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f",
    
    # Bébé items - baby clothes
    "brassiere-bebe": "https://images.unsplash.com/photo-1522771930-78b99b3a0e1d",
    "chaussons-bebe-crochet": "https://images.unsplash.com/photo-1519689680058-324335c77eba",
    "bonnet-bebe-oreilles": "https://images.unsplash.com/photo-1522771930-78b99b3a0e1d",
    "combinaison-bebe": "https://images.unsplash.com/photo-1522771930-78b99b3a0e1d",
    
    # Pull/gilet - sweater/vest
    "gilet-sans-manches": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105",
    "pull-raglan-debutant": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105",
    "cardigan-oversized": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105",
    "gilet-long-hiver-femme": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105",
    
    # Écharpe/snood - scarves
    "snood-enfant-facile": "https://images.unsplash.com/photo-1457545195570-67f207084966",
    "snood-femme-double-tour": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9",
    "snood-homme-urban": "https://images.unsplash.com/photo-1457545195570-67f207084966",
    "echarpe-enfant-coloree": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769",
    "echarpe-femme-elegante": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9",
    "echarpe-homme-classique": "https://images.unsplash.com/photo-1457545195570-67f207084966",
    "echarpe-torsades-hiver": "https://images.unsplash.com/photo-1457545195570-67f207084966",
    
    # Couverture/plaid - blankets
    "couverture-point-relief": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
    "plaid-chunky": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
    "couverture-granny-square": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
    
    # Short/t-shirt été
    "short-plage-crochet": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b",
    "tshirt-coton-crochet": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a",
}

with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in working_images.items():
    # Find and replace image_url for each pattern ID
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

print("Images fixed with working Unsplash URLs!")
