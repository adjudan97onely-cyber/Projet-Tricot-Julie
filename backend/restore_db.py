"""Restaure une sauvegarde produite par backup_db.py.

Usage : venv/bin/python restore_db.py backups/julie_creations_AAAA-MM-JJ.json.gz
Les documents sont réinsérés par _id : l'existant n'est ni effacé ni dupliqué.
"""
import gzip
import os
import sys
from pathlib import Path

from bson import json_util
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


def main(chemin: str) -> None:
    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    with gzip.open(chemin, "rt", encoding="utf-8") as f:
        dump = json_util.loads(f.read())
    for name, docs in dump.items():
        for doc in docs:
            db[name].replace_one({"_id": doc["_id"]}, doc, upsert=True)
        print(f"{name} : {len(docs)} documents")


if __name__ == "__main__":
    main(sys.argv[1])
