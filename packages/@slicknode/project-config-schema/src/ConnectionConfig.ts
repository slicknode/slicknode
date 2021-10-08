/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

export type ConnectionConfig = {
  label?: string;
  /**
   * The name of the field to be added to the source GraphQL type
   */
  name: string;
  /**
   * Description of the field
   */
  description?: string;
  /**
   * The reason for the deprecation, will be also applied to GraphQL field
   */
  deprecationReason?: string;
  /**
   * Configuration of the source type on which the connection field is added
   */
  source: {
    /**
     * The type name of the source type
     */
    typeName: string;
    /**
     * The field of the source object which is used in the edge type to filter
     * related edges. If none is provided, the default ID is used.
     *
     * This can be used if a field other than the ID is stored in the edge or node tables,
     * for example a username or other identifier.
     */
    keyField?: string;
  };
  /**
   * Configuration of the edge.
   *
   * If we have a User, a Group and a Membership type,
   * and the ConnectionConfig should define the field User.groups,
   * the edge would be "Membership"
   */
  edge: {
    /**
     * The field in which the value for source.keyField is stored
     * If the value is NULL, the objects won't be filtered and all
     * objects will be returned. For example to mount a connection on the GraphQL Viewer or
     * Query object
     *
     * If no typeName is configured for the edge, then the sourceField on the node is used.
     */
    sourceField: string | undefined | null;
    /**
     * If the data for the connection is not stored inline in the node, for example
     * for n:m relations or to connect objects from unrelated data sources,
     * an edge type can be defined.
     *
     * This can also be used if additional fields need to be defined on the edge,
     * for example createdAt etc.
     */
    typeName?: string;
    /**
     * If the typeName is defined, the nodeField has to be set to the field
     * that stores the value for node.keyField
     */
    nodeField?: string;
  };
  /**
   * Configuration of the node of the connection
   */
  node: {
    /**
     * The typeName of the node
     */
    typeName: string;
    /**
     * The field that contains the key of the node, default is "id"
     * This is used for cursors or when a custom edge type is defined
     * for object identification.
     */
    keyField?: string;
  };
};

export type ConnectionConfigMap = {
  [key: string]: ConnectionConfig;
};
