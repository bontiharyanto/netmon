import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key() {
  return createHash("sha256")
    .update(process.env.ENCRYPT_KEY ?? process.env.JWT_SECRET ?? "netmon-dev-key")
    .digest();
}

export function encryptSecret(plain: string) {
  if (!plain || plain.startsWith("enc:")) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `enc:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string) {
  if (!value?.startsWith("enc:")) return value;
  const [, ivB64, tagB64, dataB64] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export function isMasked(value: string) {
  return value === "••••••••" || value.startsWith("••••");
}
