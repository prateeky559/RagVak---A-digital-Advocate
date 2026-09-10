#!/usr/bin/env python3
"""
Re-index Vector Store Script
Triggers re-chunking and vector re-indexing for all documents in the persistent store.
"""
import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@legalrag.internal")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")

def get_token():
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["access_token"]

def reindex():
    token = get_token()
    url = f"{BASE_URL}/api/v1/admin/documents/reindex"
    req = urllib.request.Request(url, data=b"{}", headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Re-indexing complete: {data.get('message')}")
            print(f"Total Chunks Indexed: {data.get('chunks_indexed')}")
    except urllib.error.HTTPError as e:
        print(f"Error during re-indexing: HTTP {e.code} - {e.read().decode('utf-8')}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    reindex()
