import { TypeExtensionConfigMap } from '../../definition';

export const typeExtensions: TypeExtensionConfigMap = {
  Query: {
    node: {
      // field: nodeField,
      typeName: 'Node',
      description: 'Fetches an object given its ID',
      arguments: {
        id: {
          typeName: 'ID',
          required: true,
          description: 'The ID of an object',
        },
      },
      async resolve(_: any, args, context) {
        const { type, id } = context.fromGlobalId(args.id);

        try {
          const typeConfig = context.schemaBuilder.getObjectTypeConfig(type);
          if (typeConfig.directAccess === false) {
            return null;
          }

          const loader = context.getLoader(type);

          return loader.load(id);
        } catch (e) {
          return null;
        }
      },
    },
  },
};
