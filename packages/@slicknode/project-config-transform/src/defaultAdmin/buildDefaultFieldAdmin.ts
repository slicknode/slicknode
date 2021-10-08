/**
 * Created by Ivo Meißner on 2019-09-06
 */
import { FieldConfigMap, FieldAdminConfigMap } from '@slicknode/core';

import { unCamelCase } from '@slicknode/core/build/utils/string';

/**
 * Converts a FieldConfigMap to a FieldAdminConfigMap with default values
 *
 * @param fields
 * @returns {*}
 */
export default function buildDefaultFieldAdmin(
  fields: FieldConfigMap
): FieldAdminConfigMap {
  return Object.keys(fields).reduce(
    (map: FieldAdminConfigMap, name: string) => {
      map[name] = {
        label: unCamelCase(name).replace(/_/g, ' '),
        description: fields[name].description
      };
      return map;
    },
    {}
  );
}
