/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */

import {
  ModuleConfig,
  TypeConfig,
  ObjectTypeConfig,
  InterfaceTypeConfig,
  EnumTypeConfig,
  UnionTypeConfig,
  ScalarTypeConfig,
  FieldConfigMap,
  ArgumentConfigMap,
  ArgumentConfig,
  EnumValueConfigMap,
  FieldConfig,
  ConnectionConfig,
  TypeConfigMap,
  DirectiveConfig,
  InputObjectTypeConfig,
  TypeKind,
} from '../definition';

import {
  astFromValue,
  GraphQLString,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLList,
  assertInputType,
  print,
  isNamedType,
  printType as graphQLPrintType,
} from 'graphql';

import { GraphQLInputType } from 'graphql';

import { ValidatorConfig } from '../validation/type';

import { isOneToOneRelation } from './connectionBuilder';

import SchemaBuilder from './builder';

import _ from 'lodash';

export function printModuleSchema(
  appConfig: ModuleConfig,
  schemaBuilder: SchemaBuilder
): string {
  const appTypeNames = [];

  const connectionMap = (appConfig.connections || []).reduce(
    (map, connection) => {
      if (!map.hasOwnProperty(connection.source.typeName)) {
        map[connection.source.typeName] = [];
      }
      map[connection.source.typeName].push(connection);
      return map;
    },
    {}
  );

  // Print directives
  const printedDirectives = (appConfig.directives || [])
    .map((directive) => printDirective(directive, schemaBuilder))
    .join('\n\n');

  // Print types
  const printedTypes = []
    .concat(
      (appConfig.types || [])
        .map((typeConfig) => {
          appTypeNames.push(typeConfig.name);
          return printType(
            typeConfig,
            _.get(connectionMap, typeConfig.name, []),
            schemaBuilder
          );
        })
        .join('\n\n')
    )
    .join('\n\n');

  // Print extended types with typeExtensions and connections from other modules
  const printedExtensions = _.uniq([
    ...Object.keys(connectionMap),
    ...Object.keys(appConfig.typeExtensions || {}),
  ])
    // Check if type is part of other app
    .filter((typeName) => !appTypeNames.includes(typeName))
    .map((typeName) => {
      return printTypeExtension(
        typeName,
        _.get(connectionMap, typeName, []),
        _.get(appConfig, `typeExtensions.${typeName}`, {}),
        schemaBuilder
      );
    })
    .join('\n\n');

  const elements = [printedTypes, printedExtensions, printedDirectives].filter(
    (s) => s
  );

  return elements.join('\n\n') + (elements.length ? '\n' : '');
}

function printDirective(
  directive: DirectiveConfig,
  schemaBuilder: SchemaBuilder
): string {
  return (
    printDescription(directive) +
    `directive @${directive.name}` +
    printArgs(directive.arguments || {}, '', schemaBuilder.getSchema()) +
    `${
      directive.isRepeatable ? ' repeatable' : ''
    } on ${directive.locations.join(' | ')}`
  );
}

function printType(
  config: TypeConfig,
  connections: Array<ConnectionConfig>,
  schemaBuilder: SchemaBuilder
): string {
  // Print native type via GraphQL
  if (isNamedType(config.type)) {
    return graphQLPrintType(config.type);
  }
  const schema = schemaBuilder.getSchema();

  switch (config.kind) {
    case TypeKind.INPUT_OBJECT: {
      return printInputObjectType(config, schema);
    }
    case TypeKind.OBJECT: {
      return printObjectType(config, connections, schemaBuilder);
    }
    case TypeKind.INTERFACE: {
      return printInterfaceType(config, schema);
    }
    case TypeKind.UNION: {
      return printUnionType(config);
    }
    case TypeKind.ENUM: {
      return printEnumType(config);
    }
    case TypeKind.SCALAR: {
      return printScalarType(config);
    }
  }
  return '';
}

function printScalarType(config: ScalarTypeConfig): string {
  return printDescription(config) + `scalar ${config.name}`;
}

function printObjectType(
  config: ObjectTypeConfig,
  connections: Array<ConnectionConfig>,
  schemaBuilder: SchemaBuilder
): string {
  const schema = schemaBuilder.getSchema();
  const interfaces = config.interfaces || [];
  const implementedInterfaces = interfaces.length
    ? ' implements ' + interfaces.join(' & ')
    : '';
  const printedConnections = connections.length
    ? printConnections(connections, schemaBuilder.typeConfigs) + '\n'
    : '';
  const directives = printObjectTypeDirectives(config);
  return (
    printDescription(config) +
    `type ${config.name}${implementedInterfaces}${
      directives ? ` ${directives}` : ''
    } {\n` +
    printFields(config.fields, schema) +
    '\n' +
    printedConnections +
    '}'
  );
}

export function printInputObjectType(
  config: InputObjectTypeConfig,
  schema: GraphQLSchema
): string {
  const fieldNames = Object.keys(config.fields);
  return (
    printDescription(config) +
    `input ${config.name} {\n` +
    fieldNames
      .map(
        (name, i) =>
          printDescription(config.fields[name], '  ', !i) +
          '  ' +
          printInputValue(name, config.fields[name], schema)
      )
      .join('\n') +
    '\n' +
    '}'
  );
}

function printInterfaceType(
  config: InterfaceTypeConfig,
  schema: GraphQLSchema
): string {
  return (
    printDescription(config) +
    `interface ${config.name} {\n` +
    printFields(config.fields, schema) +
    '\n' +
    '}'
  );
}

function printEnumType(config: EnumTypeConfig): string {
  return (
    printDescription(config) +
    `enum ${config.name} {\n` +
    printEnumValues(config.values) +
    '\n' +
    '}'
  );
}

function printEnumValues(values: EnumValueConfigMap): string {
  return Object.keys(values)
    .map(
      (value, i) =>
        printDescription(values[value], '  ', !i) +
        '  ' +
        value +
        printDeprecated(values[value])
    )
    .join('\n');
}

function printUnionType(config: UnionTypeConfig): string {
  return (
    printDescription(config) +
    `union ${config.name} = ${config.typeNames.join(' | ')}`
  );
}

function printTypeExtension(
  typeName: string,
  connections: Array<ConnectionConfig>,
  fields: FieldConfigMap,
  schemaBuilder: SchemaBuilder
): string {
  const fieldParts = [];
  // Add related fields
  if (Object.keys(fields).length) {
    fieldParts.push(printFields(fields, schemaBuilder.getSchema(), false));
  }
  // Add connections
  if (connections.length) {
    fieldParts.push(
      printConnections(
        connections,
        schemaBuilder.typeConfigs,
        fieldParts.length === 0
      )
    );
  }

  return `extend type ${typeName} {\n` + fieldParts.join('\n') + '\n}';
}

function printObjectTypeDirectives(typeConfig: ObjectTypeConfig) {
  const result = [];

  // Add autocomplete index
  if (typeConfig.autoCompleteFields) {
    result.push(
      `@autocomplete(fields: ${JSON.stringify(typeConfig.autoCompleteFields)})`
    );
  }

  // Add composite indexes
  if (typeConfig.indexes) {
    typeConfig.indexes.forEach((index) => {
      result.push(
        `@index(fields: ${JSON.stringify(index.fields)}${
          index.unique ? ', unique: true' : ''
        })`
      );
    });
  }

  return result.join(' ');
}

function printFields(
  fieldMap: FieldConfigMap,
  schema: GraphQLSchema,
  printDummyField: boolean = true
): string {
  let printedFieldMap = fieldMap;
  if (printDummyField && !Object.keys(printedFieldMap).length) {
    printedFieldMap = {
      _dummy: {
        typeName: 'Boolean',
        description:
          'Dummy field to allow printing / parsing of types without fields',
      },
    };
  }
  const fieldNames = Object.keys(printedFieldMap);
  return fieldNames
    .map((name: string, i: number) => {
      const f = printedFieldMap[name];

      const typeName = printWrappedTypeName(f.typeName, f);

      return (
        printDescription(f, '  ', !i) +
        '  ' +
        name +
        printArgs(f.arguments || {}, '  ', schema) +
        ': ' +
        typeName +
        printDeprecated(f) +
        printFieldDirectives(f)
      );
    })
    .join('\n');
}

function printConnections(
  connections: Array<ConnectionConfig>,
  typeMap: TypeConfigMap,
  firstInBlock: boolean = false
): string {
  return connections
    .map((connection, i) => {
      let typeName = connection.node.typeName;
      if (!isOneToOneRelation(connection, typeMap)) {
        typeName = '[' + typeName + ']!';
      }
      let relationPath = connection.source.typeName;
      const sourceKeyField = _.get(connection, 'source.keyField', 'id');
      if (sourceKeyField !== 'id') {
        relationPath += '.' + sourceKeyField;
      }
      relationPath += '=';
      if (
        connection.edge.typeName &&
        connection.edge.sourceField &&
        connection.edge.nodeField
      ) {
        relationPath +=
          connection.edge.sourceField +
          '.' +
          connection.edge.typeName +
          '.' +
          connection.edge.nodeField +
          '=';
      } else if (connection.edge.sourceField) {
        relationPath += connection.edge.sourceField + '.';
      }
      const nodeKeyField = _.get(connection, 'node.keyField', 'id');
      if (nodeKeyField !== 'id') {
        relationPath += nodeKeyField + '.';
      }
      relationPath += connection.node.typeName;

      return (
        printDescription(connection, '  ', firstInBlock && !i) +
        '  ' +
        connection.name +
        ': ' +
        typeName +
        ' @relation(path: "' +
        relationPath +
        '")'
      );
    })
    .join('\n');
}

function printFieldDirectives(config: FieldConfig): string {
  let directives = [];
  if (config.unique) {
    directives.push('@unique');
  }

  if (config.index) {
    directives.push('@index');
  }

  directives = directives.concat(
    (config.validators || [])
      // Only print externally supported validators
      .filter((validator: ValidatorConfig) =>
        ['length', 'email', 'regex', 'gid', 'url'].includes(validator.type)
      )
      .map((validator: ValidatorConfig) => {
        const configKeys = Object.keys(validator.config || {});

        return `@validate${_.startCase(validator.type)}${
          configKeys.length
            ? '(' +
              configKeys
                .map(
                  (key) =>
                    // @TODO: Use specific types to serialize
                    key +
                    ':' +
                    JSON.stringify((validator.config || {})[key] || null)
                )
                .join(' ') +
              ')'
            : ''
        }`;
      })
  );

  if (config.inputElementType) {
    directives.push(`@input(type: ${config.inputElementType})`);
  }

  if (!directives.length) {
    return '';
  }
  return ' ' + directives.join(' ');
}

function printDescription(def, indentation = '', firstInBlock = true): string {
  if (!def.description) {
    return '';
  }

  const lines = def.description
    .split('\n')
    .reduce((lineList, line) => {
      // For > 120 character long lines, cut at space boundaries into sublines
      // of ~80 chars.
      const sublines = breakLine(line, 120 - indentation.length);
      return [...lineList, ...sublines];
    }, [])
    .map((line) => line.trim().replace(/"""/g, '\\"""'));
  if (lines.length === 1) {
    return (
      (firstInBlock ? '' : '\n') + indentation + `"""${lines.join('\n')}"""\n`
    );
  }

  return (
    (firstInBlock ? '' : '\n') +
    ['"""', ...lines, '"""'].map((line) => indentation + line).join('\n') +
    '\n'
  );
  /*
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') {
      description += indentation + '#\n';
    } else {
      // For > 120 character long lines, cut at space boundaries into sublines
      // of ~80 chars.
      const sublines = breakLine(lines[i], 120 - indentation.length);
      for (let j = 0; j < sublines.length; j++) {
        description += indentation + '# ' + sublines[j] + '\n';
      }
    }
  }
  
  
  let description = indentation && !firstInBlock ? '\n' : '';
  return description;
  */
}

function printArgs(
  args: ArgumentConfigMap,
  indentation = '',
  schema: GraphQLSchema
) {
  const argNames = Object.keys(args);
  if (argNames.length === 0) {
    return '';
  }

  // If every arg does not have a description, print them on one line.
  if (argNames.every((name) => !args[name].description)) {
    return (
      '(' +
      argNames.map((n) => printInputValue(n, args[n], schema)).join(', ') +
      ')'
    );
  }

  return (
    '(\n' +
    argNames
      .map(
        (name, i) =>
          printDescription(args[name], '  ' + indentation, !i) +
          '  ' +
          indentation +
          printInputValue(name, args[name], schema)
      )
      .join('\n') +
    '\n' +
    indentation +
    ')'
  );
}

function printInputValue(
  name: string,
  arg: ArgumentConfig,
  schema: GraphQLSchema
) {
  const type = assertInputType(
    createWrappedType(assertInputType(schema.getType(arg.typeName)), arg)
  );
  let argDecl = name + ': ' + String(type);

  // Add default value if existent
  if (typeof arg.defaultValue !== 'undefined') {
    argDecl += ` = ${print(astFromValue(arg.defaultValue, type))}`;
  }

  return argDecl;
}

function printDeprecated(fieldOrEnumVal) {
  const reason = fieldOrEnumVal.deprecationReason;
  if (!reason) {
    return '';
  }
  if (reason === '') {
    return ' @deprecated';
  }
  return (
    ' @deprecated(reason: ' + print(astFromValue(reason, GraphQLString)) + ')'
  );
}

function breakLine(line: string, len: number): Array<string> {
  if (line.length < len + 5) {
    return [line];
  }
  const parts = line.split(new RegExp(`((?: |^).{15,${len - 40}}(?= |$))`));
  if (parts.length < 4) {
    return [line];
  }
  const sublines = [parts[0] + parts[1] + parts[2]];
  for (let i = 3; i < parts.length; i += 2) {
    sublines.push(parts[i].slice(1) + parts[i + 1]);
  }
  return sublines;
}

function printWrappedTypeName(
  typeName: string,
  config: {
    [x: string]: any;
  }
): string {
  let wrappedName = typeName;
  if (config.list) {
    let dimensions: Array<boolean>;
    if (_.isArray(config.list)) {
      dimensions = config.list;
    } else {
      dimensions = [config.required || false];
    }
    wrappedName = dimensions.reduce((tmpName, required) => {
      return `[${tmpName}${required ? '!' : ''}]`;
    }, wrappedName);
  }
  if (config.required) {
    wrappedName += '!';
  }
  return wrappedName;
}

function createWrappedType(
  namedType: GraphQLInputType,
  config: {
    [x: string]: any;
  }
): GraphQLInputType {
  let type = namedType;

  if (config.list) {
    const list =
      config.list === true ? [config.required || false] : config.list;
    list.forEach((required) => {
      if (required) {
        type = new GraphQLNonNull(type);
      }
      type = new GraphQLList(type);
    });
  }
  if (config.required) {
    type = new GraphQLNonNull(type);
  }

  return type;
}
