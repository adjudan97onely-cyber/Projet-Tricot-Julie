"""Sauvegarde hebdomadaire de la base julie_creations (cron Oracle, dimanche 03:00).

Écrit backups/julie_creations_AAAA-MM-JJ.json.gz et garde les 12 derniers.
Restauration : restore_db.py <fichier>.
"""
import gzip
import os
from datetime import datetime, timezone
from pathlib import Path

from bson import json_util
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

GARDER = 12
DOSSIER = ROOT / "backups"


def main() -> None:
    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    dump = {name: list(db[name].find()) for name in db.list_collection_names()}
    DOSSIER.mkdir(exist_ok=True)
    fichier = DOSSIER / f"julie_creations_{datetime.now(timezone.utc):%Y-%m-%d}.json.gz"
    with gzip.open(fichier, "wt", encoding="utf-8") as f:
        f.write(json_util.dumps(dump))
    for ancien in sorted(DOSSIER.glob("julie_creations_*.json.gz"))[:-GARDER]:
        ancien.unlink()
    total = sum(len(v) for v in dump.values())
    print(f"{fichier.name} : {len(dump)} collections, {total} documents")


if __name__ == "__main__":
    main()
