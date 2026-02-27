import re

# Mapping of pattern descriptions to appropriate Unsplash images
image_updates = {
    # Couverture point relief
    "Une couverture texturée avec un beau motif en relief": "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6",
    # Plaid chunky
    "Plaid XXL avec laine géante": "https://images.unsplash.com/photo-1545239705-1564e58b9e4a",
    # Chaussons adulte
    "Chaussons confortables et rapides à tricoter": "https://images.unsplash.com/photo-1631194758628-71ec7c35137e",
    # Chaussettes bébé
    "Adorables petites chaussettes pour garder les pieds de bébé": "https://images.unsplash.com/photo-1519689680058-324335c77eba",
    # Chaussettes laine adulte
    "Chaussettes épaisses et chaudes pour l'hiver": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82",
    # Bandeau torsadé
    "Bandeau élégant avec torsade centrale": "https://images.unsplash.com/photo-1576871337622-98d48d1cf531",
    # Mitaines torsadées
    "Mitaines avec pouces et torsades élégantes": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f",
    # Moufles enfant
    "Moufles chaudes et colorées pour les enfants": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4",
    # Brassière bébé
    "Petit gilet cache-cœur pour nouveau-né": "https://images.unsplash.com/photo-1522771930-78b99b3a0e1d",
    # Chaussons bébé crochet
    "Adorables petits chaussons au crochet": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4",
    # Combinaison bébé
    "Combinaison intégrale pour bébé avec pieds intégrés": "https://images.unsplash.com/photo-1519689680058-324335c77eba",
    # Pull raglan
    "Pull classique tricoté du haut vers le bas": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105",
    # Gilet sans manches
    "Gilet simple et élégant": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a",
    # Écharpe enfant
    "Écharpe douce et colorée pour les enfants": "https://images.unsplash.com/photo-1510598969022-c4c6c5d05769",
    # Écharpe femme
    "Écharpe raffinée pour femme en côtes fantaisie": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9",
    # Snood enfant
    "Tour de cou pratique pour les enfants": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4",
    # Snood femme
    "Grand snood à porter en double tour": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9",
    # Snood homme
    "Snood simple et masculin en côtes": "https://images.unsplash.com/photo-1517841905240-472988babdf9",
    # Short plage
    "Short ajouré parfait pour la plage": "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3",
}

with open('patterns_extra.py', 'r') as f:
    content = f.read()

for desc, url in image_updates.items():
    pattern = rf'("description":\s*"{desc}[^"]*",\s*"image_url":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{url}\2', content)

with open('patterns_extra.py', 'w') as f:
    f.write(content)

print("Images updated!")
