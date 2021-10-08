import { isContent, TypeConfig, TypeKind } from '../../definition';
import { generateCreateMutation } from './generateCreateMutation';
import { generateUpdateMutation } from './generateUpdateMutation';
import { generateDeleteMutation } from './generateDeleteMutation';
import { generatePublishMutation } from './generatePublishMutation';
import SchemaBuilder from '../builder';
import { MutationConfigMap } from '../../definition/MutationConfig';
import { generateUnpublishMutation } from './generateUnpublishMutation';

/**
 * Returns an array of all generated mutations for that type
 * @param typeConfig
 * @param schemaBuilder
 */
export function generateTypeMutations(
  typeConfig: TypeConfig,
  schemaBuilder: SchemaBuilder
): MutationConfigMap {
  const mutations = {};

  if (typeConfig.kind === TypeKind.OBJECT && typeConfig.mutations) {
    const isContentNode = isContent(typeConfig);
    if (typeConfig.mutations.create) {
      const createMutation = generateCreateMutation(typeConfig, schemaBuilder);
      mutations[createMutation.name] = createMutation;
    }
    if (typeConfig.mutations.update) {
      const updateMutation = generateUpdateMutation(typeConfig, schemaBuilder);
      mutations[updateMutation.name] = updateMutation;
    }
    if (typeConfig.mutations.delete) {
      const deleteMutation = generateDeleteMutation(typeConfig);
      mutations[deleteMutation.name] = deleteMutation;
    }

    // If is content node, add publish mutations
    if (isContentNode) {
      const publishMutation = generatePublishMutation(
        typeConfig,
        schemaBuilder
      );
      mutations[publishMutation.name] = publishMutation;
      const unpublishMutation = generateUnpublishMutation(typeConfig);
      mutations[unpublishMutation.name] = unpublishMutation;
    }
  }

  return mutations;
}
