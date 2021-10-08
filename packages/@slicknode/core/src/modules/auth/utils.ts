/**
 * Created by Ivo Meißner on 20.07.17.
 *
 */
import { base64, unbase64 } from '../../utils/string';

export type PasswordResetToken = {
  id: number;
  secret: string;
  user: number;
  expires: number;
};

const VALUE_SEPARATOR = ':::';

/**
 * Encodes the full token object into a string that can be sent to the user
 *
 * @param token
 */
export function encodeResetToken(token: PasswordResetToken): string {
  return base64(`${String(token.id)}${VALUE_SEPARATOR}${token.secret}`);
}

type DecodedResetToken = {
  id: number;
  secret: string;
};

/**
 * Returns the decoded token
 * @param token
 * @returns {{id: number, secret: (*|string)}}
 */
export function decodeResetToken(token: string): DecodedResetToken {
  try {
    const decoded = unbase64(token);
    const parts = decoded.split(VALUE_SEPARATOR);
    return {
      id: Number(parts[0]),
      secret: parts[1] || '',
    };
  } catch (e) {
    throw new Error('Invalid token');
  }
}
