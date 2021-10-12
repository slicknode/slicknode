/**
 * Created by Ivo Meißner on 22.06.17.
 *
 */
import Context from '../../context';
import jwt from 'jsonwebtoken';
import { ValidationError } from '../../errors';

/* eslint-disable no-unused-vars */

export interface FileTokenPayload {
  fileId: string;
  userId: string;
}

/**
 * Creates a file token to be passed to upload mutations
 *
 * @param id
 * @param context
 * @param maxAge Maximum lifetime of the token in seconds
 */
export function idToFileToken(
  id: string,
  context: Context,
  maxAge: number = 3600
): string {
  const issuer = context.getProjectFolderName();

  const payload: FileTokenPayload = {
    fileId: id,
    userId: context.auth.uid,
  };

  return jwt.sign(payload, context.jwtSecret, {
    expiresIn: maxAge,
    issuer,
  });
}

/**
 * Validates the file token and returns the ID of the file.
 * Returns NULL if validation failed
 *
 * @param token
 * @param context
 */
export function fileTokenToId(
  token: string,
  context: Context
): string | undefined | null {
  try {
    if (token) {
      const issuer = context.getProjectFolderName();
      const payload = jwt.verify(token, context.jwtSecret, {
        issuer,
      }) as FileTokenPayload;

      if (
        !payload.fileId ||
        (payload.userId && String(payload.userId) !== String(context.auth.uid))
      ) {
        throw new Error('Invalid payload in file token');
      }
      return payload.fileId;
    }
  } catch (e) {
    // Invalid token
    throw new ValidationError(context.res.__('Invalid file token'));
  }
}
