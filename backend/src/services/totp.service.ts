import crypto from 'crypto';

/**
 * Base32 Alphabet according to RFC 4648
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class TotpService {
  /**
   * Generates a random Base32 secret string (20 bytes / 160-bit key)
   */
  public generateSecret(length = 32): string {
    const randomBytes = crypto.randomBytes(length);
    let secret = '';
    for (let i = 0; i < randomBytes.length; i++) {
      const index = randomBytes[i] % BASE32_ALPHABET.length;
      secret += BASE32_ALPHABET[index];
    }
    return secret;
  }

  /**
   * Decodes a Base32 string to Buffer
   */
  private base32Decode(base32: string): Buffer {
    const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) {
        continue;
      }
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generates TOTP code for a given timestamp counter
   */
  private generateCodeForCounter(secret: string, counter: number): string {
    const secretBuffer = this.base32Decode(secret);

    // 8-byte big-endian counter buffer
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Dynamic Truncation
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Computes the current 6-digit TOTP code
   */
  public generateCurrentCode(secret: string): string {
    const counter = Math.floor(Date.now() / 1000 / 30);
    return this.generateCodeForCounter(secret, counter);
  }

  /**
   * Verifies a 6-digit TOTP token with ±1 window tolerance (±30s)
   */
  public verifyToken(secret: string, token: string, window = 1): boolean {
    if (!token || token.trim().length !== 6) {
      return false;
    }
    const cleanToken = token.trim();
    const currentCounter = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const calculated = this.generateCodeForCounter(secret, currentCounter + i);
      if (crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(cleanToken))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates standard backup/recovery codes
   */
  public generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  /**
   * Generates otpauth URI compatible with Google Authenticator, Authy, Apple Keychain, etc.
   */
  public getOtpAuthUrl(accountName: string, secret: string, issuer = 'GastaBien RD'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generates a persistent secure device session token
   */
  public generateDeviceToken(): string {
    return 'GB_SESSION_' + crypto.randomBytes(32).toString('hex');
  }
}

export const totpService = new TotpService();
