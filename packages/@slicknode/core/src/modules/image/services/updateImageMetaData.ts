/**
 * Updates the meta data of an image (uploadedAt, width, height, etc.)
 * @param params
 */
import Context from '../../../context';
import { imageClient } from '../../../storage';
import { S3_IMAGE_BUCKET } from '../../../config';
import { imageSize } from 'image-size';

/**
 * Updates the metadata of an Image file in the database. This should be triggered
 * after the file was successfully uploaded, for example via S3 event
 * @param params
 */
export async function updateImageMetaData(params: {
  key: string;
  context: Context;
}) {
  const { context, key } = params;
  const image = await context.db.Image.find({
    key,
  });
  if (!image) {
    throw new Error(`Image for key "${key}" does not exist in database`);
  }

  // Load file
  const headObjectParams = {
    Key: [context.getProjectFolderName(), key].join('/'),
    Bucket: S3_IMAGE_BUCKET,
  };
  try {
    const result = await imageClient.headObject(headObjectParams).promise();
    const size = result.ContentLength || null;

    // Image too large, remove from storage
    if (size > 10 * 1024 * 1024) {
      await imageClient.deleteObject(headObjectParams).promise();

      throw new Error('File size limit exceeded');
    }

    // Load actual file
    const fileResult = await imageClient.getObject(headObjectParams).promise();
    // Get image dimensions, check if is valid image
    const { width, height } = imageSize(
      Buffer.from(fileResult.Body as unknown as Buffer)
    );
    if (!width || !height) {
      await imageClient.deleteObject(headObjectParams).promise();
      throw new Error('Could not determine image size');
    }

    // Update image in DB
    return await context.db.Image.update(image.id, {
      size,
      width,
      height,
      ...(image.uploadedAt
        ? {}
        : { uploadedAt: new Date(result.LastModified) }),
    });
  } catch (e) {
    const msg = `Error update image metadata for "${context.getProjectFolderName()}/${key}": ${
      e.message
    }`;
    console.error(msg);
    throw new Error(msg);
  }
}
