import Context from '../../context';
import { isContent, ObjectTypeConfig } from '../../definition';

/**
 * Adds surrogate cache keys for the provided node
 * @param params
 */
export function addNodeToSurrogateCache(params: {
  typeConfig: ObjectTypeConfig;
  context: Context;
  node: any;
  preview: boolean;
}) {
  const { typeConfig, context, node, preview } = params;

  const keys = getSurrogateKeys({
    typeConfig,
    node,
    preview,
  });

  context.surrogateCache.add(keys);
}

/**
 * Returns the key and fallback key for the given node
 * @param params
 */
export function getSurrogateKeys(params: {
  typeConfig: ObjectTypeConfig;
  node: any;
  preview: boolean;
}) {
  const { typeConfig, node, preview } = params;

  const isContentNode = isContent(typeConfig);

  let baseKey = `n:${typeConfig.name}`;

  if (isContentNode) {
    baseKey += ':' + preview ? 'p' : 'n';
  }

  let nodeKey = baseKey;
  if (node) {
    nodeKey += ':' + isContentNode ? node?.contentNode : node?.id;
  }
  return {
    key: nodeKey,
    fallbackKey: baseKey,
  };
}
