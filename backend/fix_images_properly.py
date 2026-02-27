# Using reliable craft/knitting images from Pexels CDN which work better

PROPER_IMAGES = {
    # BONNETS
    "bonnet-basique": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "bonnet-crochet": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "bonnet-bebe-oreilles": "https://images.pexels.com/photos/3662845/pexels-photo-3662845.jpeg?w=400",
    
    # ÉCHARPES
    "echarpe-cotes": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "echarpe-crochet-debutant": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "echarpe-torsades-hiver": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "echarpe-enfant-coloree": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "echarpe-femme-elegante": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "echarpe-homme-classique": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    
    # SNOODS
    "snood-simple": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "snood-enfant-facile": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "snood-femme-double-tour": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    "snood-homme-urban": "https://images.pexels.com/photos/6850545/pexels-photo-6850545.jpeg?w=400",
    
    # COUVERTURES
    "couverture-bebe": "https://images.pexels.com/photos/6850739/pexels-photo-6850739.jpeg?w=400",
    "couverture-granny-square": "https://images.pexels.com/photos/6850739/pexels-photo-6850739.jpeg?w=400",
    "couverture-point-relief": "https://images.pexels.com/photos/6850739/pexels-photo-6850739.jpeg?w=400",
    "plaid-chunky": "https://images.pexels.com/photos/6850739/pexels-photo-6850739.jpeg?w=400",
    
    # CHAUSSETTES/CHAUSSONS
    "chaussettes-basiques": "https://images.pexels.com/photos/6850601/pexels-photo-6850601.jpeg?w=400",
    "chaussettes-bebe": "https://images.pexels.com/photos/3662845/pexels-photo-3662845.jpeg?w=400",
    "chaussettes-laine-adulte": "https://images.pexels.com/photos/6850601/pexels-photo-6850601.jpeg?w=400",
    "chaussons-adulte": "https://images.pexels.com/photos/6850601/pexels-photo-6850601.jpeg?w=400",
    "chaussons-bebe-crochet": "https://images.pexels.com/photos/3662845/pexels-photo-3662845.jpeg?w=400",
    
    # ACCESSOIRES
    "mitaines-simples": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "mitaines-torsades": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "moufles-enfant": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "bandeau-tresse": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "headband-torsade-tricot": "https://images.pexels.com/photos/6850583/pexels-photo-6850583.jpeg?w=400",
    "sac-filet-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    
    # PULLS/GILETS
    "poncho-debutant": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "pull-raglan-debutant": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "gilet-sans-manches": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "cardigan-oversized": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "gilet-long-hiver-femme": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    
    # BÉBÉ
    "brassiere-bebe": "https://images.pexels.com/photos/3662845/pexels-photo-3662845.jpeg?w=400",
    "combinaison-bebe": "https://images.pexels.com/photos/3662845/pexels-photo-3662845.jpeg?w=400",
    
    # ÉTÉ - ROBES/TOPS
    "robe-ete-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "robe-plage-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "top-ete-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "crop-top-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "tshirt-coton-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "short-plage-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    
    # MAILLOTS
    "haut-bikini-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "bas-bikini-crochet": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
    "maillot-une-piece": "https://images.pexels.com/photos/6850520/pexels-photo-6850520.jpeg?w=400",
}

import re

# Update patterns_extra.py
with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in PROPER_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

# Update server.py
with open('server.py', 'r') as f:
    content = f.read()

for pattern_id, url in PROPER_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('server.py', 'w') as f:
    f.write(content)

print("All images fixed with Pexels craft images!")
