import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LEN = 64;
const HASH_PREFIX = "scrypt$";

/**
 * 平文パスワードを scrypt でハッシュ化する。
 * 出力形式: `scrypt$<saltBase64>$<hashBase64>`
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, KEY_LEN);
  return `${HASH_PREFIX}${salt.toString("base64")}$${derived.toString("base64")}`;
}

/** 文字列が scrypt 形式のハッシュなら true（古い平文と区別するため） */
export function isHashed(value: string | undefined | null): boolean {
  return typeof value === "string" && value.startsWith(HASH_PREFIX);
}

/**
 * 保存値（ハッシュ or 平文）と入力平文を比較。
 * - 一致しなければ { ok: false }
 * - 一致した場合 { ok: true, needsUpgrade } を返す。
 *   needsUpgrade=true のとき、呼び出し側は新しいハッシュで保存し直すこと。
 */
export async function verifyPassword(
  stored: string | undefined | null,
  plain: string,
): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (!stored || !plain) return { ok: false, needsUpgrade: false };

  if (isHashed(stored)) {
    const parts = stored.slice(HASH_PREFIX.length).split("$");
    if (parts.length !== 2) return { ok: false, needsUpgrade: false };
    let salt: Buffer;
    let expected: Buffer;
    try {
      salt = Buffer.from(parts[0], "base64");
      expected = Buffer.from(parts[1], "base64");
    } catch {
      return { ok: false, needsUpgrade: false };
    }
    const derived = await scrypt(plain, salt, expected.length);
    if (derived.length !== expected.length) return { ok: false, needsUpgrade: false };
    return { ok: timingSafeEqual(derived, expected), needsUpgrade: false };
  }

  // 旧データ（平文保存）との後方互換比較。一致したら needsUpgrade=true で再ハッシュを促す。
  const a = Buffer.from(stored);
  const b = Buffer.from(plain);
  if (a.length !== b.length) return { ok: false, needsUpgrade: false };
  return { ok: timingSafeEqual(a, b), needsUpgrade: true };
}
