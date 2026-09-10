#!/usr/bin/env python3
"""
Seed Admin script to authenticate and obtain admin token or initialize users.
"""
import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@legalrag.internal")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")

def login_admin():
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Successfully authenticated admin: {data['user']['email']} ({data['user']['role']})")
            print(f"Access Token: {data['access_token'][:30]}...")
            return data["access_token"]
    except urllib.error.HTTPError as e:
        print(f"Failed to authenticate admin: HTTP {e.code} - {e.read().decode('utf-8')}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    login_admin()
