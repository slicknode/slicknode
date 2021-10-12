/**
 * Created by Ivo Meißner on 22.03.17.
 *
 */

import simpleEncryptor from 'simple-encryptor';
import crypto from 'crypto';

/**
 * Generates a cryptographically strong secret key as hex string with the given number of bits
 * @param bytes
 */
export async function secretKey(bytes: number = 32): Promise<string> {
  return await new Promise((resolve, reject) => {
    (crypto as any).randomBytes(bytes, (err, buf) => {
      if (err) {
        reject(err);
      }
      resolve(buf.toString('hex'));
    });
  });
}

/**
 * Encrypts the given object to a string
 * @param obj
 * @param secret
 */
export function encrypt(obj: any, secret: string): string {
  const encryptor = simpleEncryptor(secret);
  return encryptor.encrypt(obj);
}

/**
 * Decrypts the given string that was previously encoded with encrypt
 * @param val
 * @param secret
 */
export function decrypt(val: string, secret: string): any {
  const encryptor = simpleEncryptor(secret);
  return encryptor.decrypt(val);
}
