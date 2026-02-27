import re

# Using Pixabay CDN URLs which have better craft/knitting images
# Format: https://cdn.pixabay.com/photo/YEAR/MONTH/DAY/HOUR/MIN/filename.jpg

CRAFT_IMAGES = {
    # Bonnets - knit hats
    "bonnet-basique": "https://cdn.pixabay.com/photo/2015/09/17/14/24/hat-944400_640.jpg",
    "bonnet-crochet": "https://cdn.pixabay.com/photo/2015/09/17/14/24/hat-944400_640.jpg",
    "bonnet-bebe-oreilles": "https://cdn.pixabay.com/photo/2017/11/23/07/47/baby-2972221_640.jpg",
    
    # Écharpes - scarves
    "echarpe-cotes": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    "echarpe-crochet-debutant": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    "echarpe-torsades-hiver": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    "echarpe-enfant-coloree": "https://cdn.pixabay.com/photo/2016/11/29/06/08/child-1867868_640.jpg",
    "echarpe-femme-elegante": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    "echarpe-homme-classique": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    
    # Snoods
    "snood-simple": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    "snood-enfant-facile": "https://cdn.pixabay.com/photo/2016/11/29/06/08/child-1867868_640.jpg",
    "snood-femme-double-tour": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    "snood-homme-urban": "https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_640.jpg",
    
    # Couvertures - blankets
    "couverture-bebe": "https://cdn.pixabay.com/photo/2017/02/15/10/39/blanket-2068674_640.jpg",
    "couverture-granny-square": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "couverture-point-relief": "https://cdn.pixabay.com/photo/2017/02/15/10/39/blanket-2068674_640.jpg",
    "plaid-chunky": "https://cdn.pixabay.com/photo/2017/02/15/10/39/blanket-2068674_640.jpg",
    
    # Chaussettes - socks
    "chaussettes-basiques": "https://cdn.pixabay.com/photo/2017/08/01/14/44/socks-2566682_640.jpg",
    "chaussettes-bebe": "https://cdn.pixabay.com/photo/2017/11/23/07/47/baby-2972221_640.jpg",
    "chaussettes-laine-adulte": "https://cdn.pixabay.com/photo/2017/08/01/14/44/socks-2566682_640.jpg",
    "chaussons-adulte": "https://cdn.pixabay.com/photo/2017/08/01/14/44/socks-2566682_640.jpg",
    "chaussons-bebe-crochet": "https://cdn.pixabay.com/photo/2017/11/23/07/47/baby-2972221_640.jpg",
    
    # Accessoires
    "mitaines-simples": "https://cdn.pixabay.com/photo/2015/12/08/00/55/mittens-1082726_640.jpg",
    "mitaines-torsades": "https://cdn.pixabay.com/photo/2015/12/08/00/55/mittens-1082726_640.jpg",
    "moufles-enfant": "https://cdn.pixabay.com/photo/2015/12/08/00/55/mittens-1082726_640.jpg",
    "bandeau-tresse": "https://cdn.pixabay.com/photo/2015/09/17/14/24/hat-944400_640.jpg",
    "headband-torsade-tricot": "https://cdn.pixabay.com/photo/2015/09/17/14/24/hat-944400_640.jpg",
    "sac-filet-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    
    # Pulls/Gilets
    "poncho-debutant": "https://cdn.pixabay.com/photo/2016/11/29/01/34/blanket-1866726_640.jpg",
    "pull-raglan-debutant": "https://cdn.pixabay.com/photo/2016/11/29/01/34/blanket-1866726_640.jpg",
    "gilet-sans-manches": "https://cdn.pixabay.com/photo/2016/11/29/01/34/blanket-1866726_640.jpg",
    "cardigan-oversized": "https://cdn.pixabay.com/photo/2016/11/29/01/34/blanket-1866726_640.jpg",
    "gilet-long-hiver-femme": "https://cdn.pixabay.com/photo/2016/11/29/01/34/blanket-1866726_640.jpg",
    
    # Bébé
    "brassiere-bebe": "https://cdn.pixabay.com/photo/2017/11/23/07/47/baby-2972221_640.jpg",
    "combinaison-bebe": "https://cdn.pixabay.com/photo/2017/11/23/07/47/baby-2972221_640.jpg",
    
    # Été
    "robe-ete-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "robe-plage-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "top-ete-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "crop-top-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "tshirt-coton-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "short-plage-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    
    # Maillots
    "haut-bikini-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "bas-bikini-crochet": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
    "maillot-une-piece": "https://cdn.pixabay.com/photo/2018/03/14/17/29/wool-3225924_640.jpg",
}

# Update patterns_extra.py
with open('patterns_extra.py', 'r') as f:
    content = f.read()

for pattern_id, url in CRAFT_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]*(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

# Update server.py
with open('server.py', 'r') as f:
    content = f.read()

for pattern_id, url in CRAFT_IMAGES.items():
    pattern = rf'("id":\s*"{pattern_id}"[^}}]*?"image_url":\s*")[^"]*(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content, flags=re.DOTALL)

with open('server.py', 'w') as f:
    f.write(content)

print("Pixabay craft images applied!")
