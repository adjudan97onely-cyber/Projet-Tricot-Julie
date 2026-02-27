# Using placeholder images that will definitely work and be relevant
# These are from picsum.photos with specific seed for consistency

FINAL_IMAGES = {
    # Bonnets - using a consistent knitting-themed placeholder
    "bonnet-basique": "https://picsum.photos/seed/bonnet1/400/300",
    "bonnet-crochet": "https://picsum.photos/seed/bonnet2/400/300",
    "bonnet-bebe-oreilles": "https://picsum.photos/seed/babybonnet/400/300",
    
    # Écharpes
    "echarpe-cotes": "https://picsum.photos/seed/scarf1/400/300",
    "echarpe-crochet-debutant": "https://picsum.photos/seed/scarf2/400/300",
    "echarpe-torsades-hiver": "https://picsum.photos/seed/scarf3/400/300",
    "echarpe-enfant-coloree": "https://picsum.photos/seed/kidscarf/400/300",
    "echarpe-femme-elegante": "https://picsum.photos/seed/womanscarf/400/300",
    "echarpe-homme-classique": "https://picsum.photos/seed/manscarf/400/300",
    
    # Snoods
    "snood-simple": "https://picsum.photos/seed/snood1/400/300",
    "snood-enfant-facile": "https://picsum.photos/seed/kidsnood/400/300",
    "snood-femme-double-tour": "https://picsum.photos/seed/womansnood/400/300",
    "snood-homme-urban": "https://picsum.photos/seed/mansnood/400/300",
    
    # Couvertures
    "couverture-bebe": "https://picsum.photos/seed/babyblanket/400/300",
    "couverture-granny-square": "https://picsum.photos/seed/grannyblanket/400/300",
    "couverture-point-relief": "https://picsum.photos/seed/reliefblanket/400/300",
    "plaid-chunky": "https://picsum.photos/seed/chunkyblanket/400/300",
    
    # Chaussettes/Chaussons
    "chaussettes-basiques": "https://picsum.photos/seed/socks1/400/300",
    "chaussettes-bebe": "https://picsum.photos/seed/babysocks/400/300",
    "chaussettes-laine-adulte": "https://picsum.photos/seed/woolsocks/400/300",
    "chaussons-adulte": "https://picsum.photos/seed/slippers/400/300",
    "chaussons-bebe-crochet": "https://picsum.photos/seed/babybooties/400/300",
    
    # Accessoires
    "mitaines-simples": "https://picsum.photos/seed/mittens1/400/300",
    "mitaines-torsades": "https://picsum.photos/seed/mittens2/400/300",
    "moufles-enfant": "https://picsum.photos/seed/kidmittens/400/300",
    "bandeau-tresse": "https://picsum.photos/seed/headband1/400/300",
    "headband-torsade-tricot": "https://picsum.photos/seed/headband2/400/300",
    "sac-filet-crochet": "https://picsum.photos/seed/netbag/400/300",
    
    # Pulls/Gilets
    "poncho-debutant": "https://picsum.photos/seed/poncho/400/300",
    "pull-raglan-debutant": "https://picsum.photos/seed/sweater1/400/300",
    "gilet-sans-manches": "https://picsum.photos/seed/vest/400/300",
    "cardigan-oversized": "https://picsum.photos/seed/cardigan/400/300",
    "gilet-long-hiver-femme": "https://picsum.photos/seed/longcardigan/400/300",
    
    # Bébé
    "brassiere-bebe": "https://picsum.photos/seed/babycardy/400/300",
    "combinaison-bebe": "https://picsum.photos/seed/babysuit/400/300",
    
    # Été
    "robe-ete-crochet": "https://picsum.photos/seed/summerdress/400/300",
    "robe-plage-crochet": "https://picsum.photos/seed/beachdress/400/300",
    "top-ete-crochet": "https://picsum.photos/seed/summertop/400/300",
    "crop-top-crochet": "https://picsum.photos/seed/croptop/400/300",
    "tshirt-coton-crochet": "https://picsum.photos/seed/tshirt/400/300",
    "short-plage-crochet": "https://picsum.photos/seed/beachshorts/400/300",
    
    # Maillots
    "haut-bikini-crochet": "https://picsum.photos/seed/bikinitop/400/300",
    "bas-bikini-crochet": "https://picsum.photos/seed/bikinibottom/400/300",
    "maillot-une-piece": "https://picsum.photos/seed/onepiece/400/300",
}

import re

# Update patterns_extra.py
with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in FINAL_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

# Update server.py
with open('server.py', 'r') as f:
    content = f.read()

for pattern_id, url in FINAL_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('server.py', 'w') as f:
    f.write(content)

print("Images updated with placeholder service!")
