import Context from '../../../context';
import { S3_FILE_PRIVATE_BUCKET, S3_FILE_PUBLIC_BUCKET } from '../../../config';
import { fileClientPrivate, fileClientPublic } from '../../../storage';

/**
 * Updates the metadata of a File node in the database. This should be triggered
 * after the file was successfully uploaded, for example via S3 events
 * @param params
 */
export async function updateFileMetaData(params: {
  key: string;
  context: Context;
}) {
  const { context, key } = params;

  const file = await context.db.File.find({
    key,
  });
  if (!file) {
    throw new Error(`File for key "${key}" does not exist in database`);
  }

  const bucket = file.isPublic ? S3_FILE_PUBLIC_BUCKET : S3_FILE_PRIVATE_BUCKET;
  const client = file.isPublic ? fileClientPublic : fileClientPrivate;

  // Load file
  const headObjectParams = {
    Key: [context.getProjectFolderName(), key].join('/'),
    Bucket: bucket,
  };
  try {
    const result = await client.headObject(headObjectParams).promise();
    const size = result.ContentLength || null;
    if (!file.uploadedAt) {
      return await context.db.File.update(file.id, {
        uploadedAt: new Date(result.LastModified),
        size,
      });
    }
  } catch (e) {
    const msg = `Error update file metadata for "${context.getProjectFolderName()}/${key}": ${
      e.message
    }`;
    console.error(msg);
    throw new Error(msg);
  }
}
