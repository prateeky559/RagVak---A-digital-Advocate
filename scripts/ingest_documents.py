#!/usr/bin/env python3
"""
Ingest Documents Script
Traverses `data/documents/` and uploads them to the LexiRAG Admin ingestion API.
"""
import os
import sys
import json
import glob
import urllib.request
import urllib.error

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@legalrag.internal")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")

DOC_METADATA = {
    "gdpr_chapter_3.txt": {
        "title": "General Data Protection Regulation (GDPR) - Chapter III",
        "jurisdiction": "European Union",
        "document_type": "STATUTE",
        "version": "(EU) 2016/679",
        "source": "EUR-Lex Official Journal of the European Union",
    },
    "ccpa_privacy_act.txt": {
        "title": "California Consumer Privacy Act (CCPA / CPRA)",
        "jurisdiction": "United States (California)",
        "document_type": "STATUTE",
        "version": "Cal. Civ. Code § 1798.100 et seq.",
        "source": "California Legislative Information",
    },
    "ucc_article_2.txt": {
        "title": "Uniform Commercial Code (UCC) - Article 2 Sales",
        "jurisdiction": "United States (Uniform State Law)",
        "document_type": "STATUTE",
        "version": "UCC 2022 Official Text",
        "source": "American Law Institute and Uniform Law Commission",
    },
    "dmca_safe_harbors.txt": {
        "title": "Digital Millennium Copyright Act (DMCA) - 17 U.S.C. § 512",
        "jurisdiction": "United States (Federal)",
        "document_type": "STATUTE",
        "version": "17 U.S.C. § 512 (2020 ed.)",
        "source": "United States Copyright Office / GovInfo",
    },
}

def get_token():
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["access_token"]

def ingest_all():
    token = get_token()
    files = glob.glob("data/documents/*.*")
    print(f"Found {len(files)} files to verify/ingest...")

    for path in files:
        fname = os.path.basename(path)
        meta = DOC_METADATA.get(fname, {
            "title": fname.replace("_", " ").capitalize(),
            "jurisdiction": "General",
            "document_type": "STATUTE",
            "version": "1.0",
            "source": "Internal Corpus",
        })

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        payload = json.dumps({
            "title": meta["title"],
            "jurisdiction": meta["jurisdiction"],
            "document_type": meta["document_type"],
            "version": meta["version"],
            "source": meta["source"],
            "effective_date": "2024-01-01",
            "raw_text": content,
        }).encode("utf-8")

        url = f"{BASE_URL}/api/v1/admin/documents/upload"
        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })

        try:
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                print(f"[OK] Ingested: {meta['title']} ({res.get('chunks_count', 0)} chunks)")
        except urllib.error.HTTPError as e:
            print(f"[ERROR] Failed to ingest {fname}: {e.read().decode('utf-8')}", file=sys.stderr)

if __name__ == "__main__":
    ingest_all()
