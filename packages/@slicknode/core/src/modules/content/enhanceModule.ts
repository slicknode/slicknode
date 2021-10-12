import {
  ConnectionConfig,
  ConnectionConfigMap,
  isContent,
  ModuleConfigEnhancer,
  TypeConfig,
} from '../../definition';
import { createHistoryTypeConfig } from '../../schema/createHistoryTypeConfig';

/**
 * Adds history types and history connections to Content nodes
 *
 * @param module
 * @param originalModules
 */
export const enhanceModule: ModuleConfigEnhancer = (
  module,
  originalModules
) => {
  const connections: ConnectionConfig[] = [];
  const types: TypeConfig[] = [];
  let hasContentType = false;

  for (const moduleConfig of originalModules) {
    for (const typeConfig of moduleConfig.types || []) {
      if (isContent(typeConfig)) {
        hasContentType = true;

        // Add history type
        const historyTypeConfig = createHistoryTypeConfig(typeConfig);
        types.push(historyTypeConfig);

        // Add history connection on content node
        connections.push({
          name: '_versions',
          description: `Previously published versions of ${typeConfig.name} nodes`,
          node: {
            typeName: historyTypeConfig.name,
            keyField: 'contentNode',
          },
          edge: {
            sourceField: 'contentNode',
          },
          source: {
            keyField: 'contentNode',
            typeName: typeConfig.name,
          },
        });

        // Add translations connection on content node
        connections.push({
          name: '_localizations',
          description: `All translations of the ${typeConfig.name} node`,
          node: {
            typeName: typeConfig.name,
            keyField: 'contentNode',
          },
          edge: {
            sourceField: 'contentNode',
          },
          source: {
            keyField: 'contentNode',
            typeName: typeConfig.name,
          },
        });
      }
    }
  }

  // Merge connections and history types into module config
  if (hasContentType) {
    return {
      ...module,
      types: [...(module.types || []), ...types],
      connections: [...(module.connections || []), ...connections],
    };
  }

  // Check if module has
  return module;
};
