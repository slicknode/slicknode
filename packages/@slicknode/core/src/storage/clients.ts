/**
 * Created by Ivo Meißner on 23.03.17.
 */

import S3 from 'aws-sdk/clients/s3';

import {
  S3_AWS_SECRET_KEY,
  S3_AWS_ACCESS_KEY,
  S3_FILE_PRIVATE_ENDPOINT,
  S3_FILE_PUBLIC_ENDPOINT,
  S3_IMAGE_ENDPOINT,
} from '../config';

// In production we load AWS keys via IAM role on task
// and not set it directly
let credentials: { accessKeyId?: string; secretAccessKey?: string } = {};
if (S3_AWS_SECRET_KEY) {
  credentials = {
    accessKeyId: S3_AWS_ACCESS_KEY,
    secretAccessKey: S3_AWS_SECRET_KEY,
  };
}

export const fileClientPrivate = new S3({
  ...credentials,
  endpoint: S3_FILE_PRIVATE_ENDPOINT,
  s3ForcePathStyle: 'true', // needed with minio?
  signatureVersion: 'v4',
} as any); // @TODO: Type properly, figure out if we still need s3ForcePathStyle which is missing in type defs

export const fileClientPublic = new S3({
  ...credentials,
  endpoint: S3_FILE_PUBLIC_ENDPOINT,
  s3ForcePathStyle: 'true', // needed with minio?
  signatureVersion: 'v4',
} as any); // @TODO: Type properly, figure out if we still need s3ForcePathStyle which is missing in type defs

export const imageClient = new S3({
  ...credentials,
  endpoint: S3_IMAGE_ENDPOINT,
  s3ForcePathStyle: 'true', // needed with minio?
  signatureVersion: 'v4',
} as any); // @TODO: Type properly, figure out if we still need s3ForcePathStyle which is missing in type defs
