#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

from PIL import Image, UnidentifiedImageError
from pillow_heif import register_heif_opener

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

register_heif_opener()

COMMON_IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
    ".avif",
    ".heic",
}


DEFAULT_SALT = b"my-blog-photo-obfuscation-v1"
PBKDF2_ITERATIONS = 100_000


def derive_key(password: str, salt: bytes = DEFAULT_SALT) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))


def is_probably_image(path: Path) -> bool:
    return (
        path.is_file()
        and path.suffix.lower() in COMMON_IMAGE_EXTS
        and not path.name.endswith(".enc")
    )


def convert_to_jpeg_bytes(path: Path, quality: int) -> bytes:
    with Image.open(path) as img:
        # Handle transparency by flattening onto white.
        if img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        ):
            img = img.convert("RGBA")
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.getchannel("A"))
            img = background
        else:
            img = img.convert("RGB")

        # Strip metadata by creating a fresh image save.
        with NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            img.save(
                tmp_path,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
            )
            data = tmp_path.read_bytes()
        finally:
            tmp_path.unlink(missing_ok=True)

        return data


def encrypt_bytes(plaintext: bytes, key: bytes) -> bytes:
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext_and_tag = aesgcm.encrypt(iv, plaintext, None)

    # Matches the browser scheme:
    # [12-byte IV][ciphertext + AES-GCM auth tag]
    return iv + ciphertext_and_tag


def process_image(path: Path, key: bytes, quality: int, dry_run: bool) -> None:
    output_path = path.with_suffix(".enc")

    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {output_path}")

    if dry_run:
        print(f"[dry-run] {path.name} -> {output_path.name}; would delete original")
        return

    jpeg_bytes = convert_to_jpeg_bytes(path, quality)
    encrypted = encrypt_bytes(jpeg_bytes, key)

    output_path.write_bytes(encrypted)
    path.unlink()

    print(f"{path.name} -> {output_path.name}; deleted original")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert images in the current directory to JPG, encrypt them as .enc, and remove originals."
    )
    parser.add_argument(
        "--password",
        required=True,
        help="Hardcoded page password/key string used to derive the AES key.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=90,
        help="JPEG quality, 1-100. Default: 90.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be processed without writing or deleting files.",
    )

    args = parser.parse_args()

    if not (1 <= args.quality <= 100):
        print("Error: --quality must be between 1 and 100", file=sys.stderr)
        return 1

    key = derive_key(args.password)

    candidates = sorted(
        p for p in Path.cwd().iterdir()
        if is_probably_image(p)
    )

    if not candidates:
        print("No common image files found in current directory.")
        return 0

    failures = 0

    for path in candidates:
        try:
            process_image(path, key, args.quality, args.dry_run)
        except UnidentifiedImageError:
            print(f"Skipping unreadable image: {path.name}", file=sys.stderr)
            failures += 1
        except Exception as e:
            print(f"Failed {path.name}: {e}", file=sys.stderr)
            failures += 1

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())