# BUI-THI DAM Créations

Application tricot et crochet : patrons, tutoriels, lexique, guide des tailles,
galerie, projets et chat IA (Gemini).

## Comment l'app tient debout

```
Téléphone / navigateur
        │  https://projet-tricot-julie.vercel.app
        ▼
Vercel (frontend Expo web)
        │  /api/*  → relais défini dans frontend/vercel.json
        ▼
Oracle VM 141.253.107.176:8001  (service systemd julie-creations, Restart=always)
        │
        ▼
MongoDB local (service mongod), base julie_creations
```

Aucun tunnel : l'app appelle sa propre adresse Vercel, qui relaie `/api/*`
vers Oracle. L'adresse ne change pas au redémarrage de la VM.

L'IP publique Oracle est éphémère : elle survit aux redémarrages et aux
arrêts/relances, mais change si la VM est **reconstruite**. Dans ce cas,
mettre la nouvelle IP dans `frontend/vercel.json` puis redéployer le frontend.

## Déployer

```bash
# Frontend — depuis la racine du dépôt (Root Directory Vercel = frontend)
vercel --prod --yes --archive=tgz

# Backend
scp backend/server.py backend/patterns_extra.py backend/data_content.py opc@141.253.107.176:/opt/julie-creations/
ssh opc@141.253.107.176 "sudo systemctl restart julie-creations"
```

Variable Vercel (Production) : `EXPO_PUBLIC_BACKEND_URL=https://projet-tricot-julie.vercel.app`.

## Sauvegardes

Cron Oracle chaque dimanche à 03:00 : `backend/backup_db.py` écrit
`/opt/julie-creations/backups/julie_creations_AAAA-MM-JJ.json.gz` et garde les 12 derniers.

Restaurer : `venv/bin/python restore_db.py backups/<fichier>` (réinsère par `_id`,
sans effacer ni dupliquer).

## Pièges connus

- `bcrypt` doit rester en **4.0.1** : à partir de 4.1, `passlib` plante et la
  connexion admin renvoie une erreur 500 quel que soit le mot de passe.
- Le serveur Oracle tourne en **Python 3.9** : pas de `datetime.UTC`, pas de syntaxe 3.10+.
