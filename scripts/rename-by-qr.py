#!/usr/bin/env python3
"""
rename-by-qr.py

Reads all PNG/JPG images in a folder, decodes the QR code in each,
extracts the certificate/card ID from the URL, and renames the file.

Usage:
  python3 scripts/rename-by-qr.py <path-to-folder>

Examples:
  python3 scripts/rename-by-qr.py ./recovered_records/certificates
  python3 scripts/rename-by-qr.py ./recovered_records/cards
"""

import sys
import os
import re
from PIL import Image
from pyzbar.pyzbar import decode

def extract_id_from_url(url: str):
    """Extract the record ID from the QR code URL."""
    patterns = [
        r'/certificate/view/(certificate_\d+)',
        r'/card/view/(c-\d+)',
        r'/operator/view/([^\s/]+)',
        r'/aasia-steel-card/view/([^\s/]+)',
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None

def process_file(folder_path: str, filename: str):
    file_path = os.path.join(folder_path, filename)
    ext = os.path.splitext(filename)[1]

    try:
        img = Image.open(file_path).convert("RGB")

        # Try 1: Decode as-is
        results = decode(img)

        # Try 2: Scale up if too small
        if not results:
            w, h = img.size
            MIN_DIM = 1200
            if w < MIN_DIM or h < MIN_DIM:
                scale = MIN_DIM / min(w, h)
                img_up = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
                results = decode(img_up)

        if not results:
            print(f"⚠️  [SKIP] No QR code found in: {filename}")
            return "skip"

        qr_url = results[0].data.decode("utf-8")
        print(f"    QR URL: {qr_url}")

        new_id = extract_id_from_url(qr_url)
        if not new_id:
            print(f"⚠️  [SKIP] Could not extract ID from QR URL in: {filename}")
            print(f"           URL was: {qr_url}")
            return "skip"

        new_filename = f"{new_id}{ext}"
        new_path = os.path.join(folder_path, new_filename)

        if os.path.exists(new_path) and new_path != file_path:
            print(f"⚠️  [SKIP] Target already exists, skipping: {new_filename}")
            return "skip"

        if new_filename == filename:
            print(f"✅  [OK]   Already correctly named: {filename}")
            return "ok"

        os.rename(file_path, new_path)
        print(f"✅  [RENAMED] {filename}  →  {new_filename}")
        return "ok"

    except Exception as e:
        print(f"❌  [ERROR] Failed to process: {filename}")
        print(f"           {e}")
        return "error"


def main():
    if len(sys.argv) < 2:
        print("❌  Please provide a folder path.")
        print("    Usage: python3 scripts/rename-by-qr.py <folder>")
        sys.exit(1)

    folder_path = sys.argv[1]
    if not os.path.isdir(folder_path):
        print(f"❌  Folder not found: {folder_path}")
        sys.exit(1)

    files = sorted([
        f for f in os.listdir(folder_path)
        if f.lower().endswith((".png", ".jpg", ".jpeg"))
    ])

    if not files:
        print("⚠️  No image files found in the folder.")
        sys.exit(0)

    print(f"\n📂 Found {len(files)} image(s) in: {folder_path}\n")

    ok = skip = err = 0
    for f in files:
        print(f"🔍 Processing: {f}")
        result = process_file(folder_path, f)
        if result == "ok":
            ok += 1
        elif result == "skip":
            skip += 1
        else:
            err += 1

    print("\n─────────────────────────────────────")
    print(f"✅  Renamed : {ok}")
    print(f"⚠️  Skipped : {skip}")
    print(f"❌  Errors  : {err}")
    print("─────────────────────────────────────\n")


if __name__ == "__main__":
    main()
