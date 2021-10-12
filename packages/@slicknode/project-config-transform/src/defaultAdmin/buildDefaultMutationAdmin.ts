/**
 * Created by Ivo Meißner on 23.04.17.
 */

import { MutationConfig, MutationAdminConfig } from '@slicknode/core';

import { unCamelCase } from '@slicknode/core/build/utils/string';
import buildDefaultFieldAdmin from './buildDefaultFieldAdmin';

/**
 * Converts a MutationConfig to a MutationAdminConfig with default values
 *
 * @param mutationConfig
 * @returns {*}
 */
export default function buildDefaultMutationAdmin(
  mutationConfig: MutationConfig
): MutationAdminConfig {
  return {
    label: unCamelCase(mutationConfig.name.split('_').pop()!),
    description: mutationConfig.description || '',
    fields: buildDefaultFieldAdmin(mutationConfig.fields),
    inputFields: buildDefaultFieldAdmin(mutationConfig.inputFields)
  };
}
