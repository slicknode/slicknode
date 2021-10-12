/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

import { expect } from 'chai';
import { it } from 'mocha';
import knex from 'knex';
import {
  FieldConfig,
  ObjectTypeConfig,
  TypeKind,
  TypeConfigMap,
} from '../../../../../definition';
import toTableName from '../../toTableName';
import { MigrationScope } from '../../../base';
import { HANDLER_POSTGRES } from '../../..';
import { createContextMock } from '../../../../../test/utils';
import AbstractFieldHandler from '../AbstractFieldHandler';
import { DEFAULT_PRIMARY_KEY } from '../../constants';
import { FieldStorageType } from '../../../../../definition/FieldStorageType';

/* eslint-disable no-unused-expressions max-len */

export function testCreateHandler(
  description: string,
  handler: AbstractFieldHandler,
  fieldName: string,
  fieldConfig: FieldConfig,
  expectedQuery: string,
  newTypes: TypeConfigMap = {},
  schemaName: string | null = null
) {
  it(description, () => {
    const TestType: ObjectTypeConfig = {
      handler: {
        kind: HANDLER_POSTGRES,
      },
      kind: TypeKind.OBJECT,
      description: '',
      name: 'TestType',
      fields: {
        [fieldName]: fieldConfig,
      },
    };
    const RelatedTestNode: ObjectTypeConfig = {
      handler: {
        kind: HANDLER_POSTGRES,
      },
      kind: TypeKind.OBJECT,
      description: '',
      name: 'RelatedTestNode',
      fields: {
        [DEFAULT_PRIMARY_KEY]: {
          typeName: 'ID',
          required: true,
        },
        [fieldName]: fieldConfig,
      },
    };
    const RelatedTestNodeUuid: ObjectTypeConfig = {
      handler: {
        kind: HANDLER_POSTGRES,
      },
      kind: TypeKind.OBJECT,
      description: '',
      name: 'RelatedTestNodeUuid',
      fields: {
        [DEFAULT_PRIMARY_KEY]: {
          typeName: 'ID',
          required: true,
          storageType: FieldStorageType.UUID,
        },
        [fieldName]: fieldConfig,
      },
    };
    const scope: MigrationScope = {
      config: {
        db: knex({ client: 'pg' }),
        schemaName,
      },
      currentTypes: {},
      newTypes: {
        ...newTypes,
        TestType,
        RelatedTestNode,
        RelatedTestNodeUuid,
      },
    };
    const context = createContextMock([]);
    context._dbSchemaName = schemaName;
    let resultQuery = scope.config.db.schema
      .createTable(
        toTableName(TestType, context.getDBSchemaName()),
        (table) => {
          handler.createField(table, fieldName, fieldConfig, scope);
        }
      )
      .toString();
    if (handler.createFieldDependencies) {
      const dependencies = handler.createFieldDependencies(
        scope.config.db,
        TestType,
        fieldName,
        fieldConfig,
        scope,
        toTableName(TestType, scope.config.schemaName)
      );
      if (dependencies) {
        resultQuery += ';\n' + dependencies.toString();
      }
    }
    expect(resultQuery).to.equal(expectedQuery);
  });
}

export function testUpdateHandler(
  description: string,
  handler: AbstractFieldHandler,
  fieldName: string,
  fieldConfig: FieldConfig,
  previousConfig: FieldConfig,
  expectedQuery: string,
  newTypes: TypeConfigMap = {},
  schemaName: string | undefined | null = null,
  currentTypes: TypeConfigMap = {}
) {
  it(description, () => {
    const TestType: ObjectTypeConfig = {
      handler: {
        kind: HANDLER_POSTGRES,
      },
      kind: TypeKind.OBJECT,
      description: '',
      name: 'TestType',
      fields: {
        [fieldName]: fieldConfig,
      },
    };
    const RelatedTestNode: ObjectTypeConfig = {
      handler: {
        kind: HANDLER_POSTGRES,
      },
      kind: TypeKind.OBJECT,
      description: '',
      name: 'RelatedTestNode',
      fields: {
        [DEFAULT_PRIMARY_KEY]: {
          typeName: 'ID',
          required: true,
        },
        [fieldName]: fieldConfig,
      },
    };
    const RelatedTestNodeUuid: ObjectTypeConfig = {
      handler: {
        kind: HANDLER_POSTGRES,
      },
      kind: TypeKind.OBJECT,
      description: '',
      name: 'RelatedTestNodeUuid',
      fields: {
        [DEFAULT_PRIMARY_KEY]: {
          typeName: 'ID',
          required: true,
          storageType: FieldStorageType.UUID,
        },
        [fieldName]: fieldConfig,
      },
    };
    const scope: MigrationScope = {
      config: {
        db: knex({ client: 'pg' }),
        schemaName,
      },
      currentTypes,
      newTypes: {
        ...newTypes,
        TestType,
        RelatedTestNode,
        RelatedTestNodeUuid,
      },
    };
    const context = createContextMock([]);
    // Set db schema name in context
    if (schemaName) {
      context._dbSchemaName = schemaName;
    }
    let resultQuery = scope.config.db.schema
      .alterTable(toTableName(TestType, context.getDBSchemaName()), (table) => {
        handler.updateField(
          table,
          fieldName,
          fieldConfig,
          previousConfig,
          scope
        );
      })
      .toString();
    if (handler.updateFieldDependencies) {
      const dependencies = handler.updateFieldDependencies(
        scope.config.db,
        TestType,
        fieldName,
        fieldConfig,
        previousConfig,
        scope,
        toTableName(TestType, scope.config.schemaName)
      );
      if (dependencies) {
        resultQuery += ';\n' + dependencies.toString();
      }
    }
    expect(resultQuery).to.equal(expectedQuery);
  });
}
