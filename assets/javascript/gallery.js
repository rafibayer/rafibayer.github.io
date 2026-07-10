const PHOTOS = 14;
const K = "obscurity";

function hash32(x) {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return x >>> 0;
}

function pacificDayNumber() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(
    parts.map(p => [p.type, p.value])
  );

  // e.g. 20260710
  return Number(`${map.year}${map.month}${map.day}`);
}

function photoIndex() {
  return hash32(pacificDayNumber()) % PHOTOS;
}

async function kdf(password) {
  const enc = new TextEncoder();
  const salt = enc.encode("my-blog-photo-obfuscation-v1");

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );
}

async function dec(url, key) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);

  const bytes = new Uint8Array(await res.arrayBuffer());

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext
  );

  return new Blob([plaintext], { type: "image/jpeg" });
}