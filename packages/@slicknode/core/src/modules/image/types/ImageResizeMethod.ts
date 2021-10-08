/**
 * Created by Ivo Meißner on 13.08.18
 *
 */

import { EnumTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';

export const CROP = 'CROP';
export const SMART = 'SMART';
export const FIT = 'FIT';

const ImageResizeMethod: EnumTypeConfig = {
  kind: TypeKind.ENUM,
  name: 'ImageResizeMethod',
  description: 'Method to resize an image',
  values: {
    CROP: {
      description: 'Crop to fit within dimensions',
      value: CROP,
    },
    SMART: {
      description: 'Smart crop using focal points of the image',
      value: SMART,
    },
    FIT: {
      description: 'Resize to fit within dimensions without cropping',
      value: FIT,
    },
  },
};

export default ImageResizeMethod;
