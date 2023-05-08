/**
 * Created by Ivo Meißner on 24.01.17.
 *
 */
import { expect } from 'chai';
import { it } from 'mocha';

import { createContextMock } from '../../../../test/utils';
import applyPermissionQueryFilter from '../applyPermissionQueryFilter';

import { ModuleConfig, ObjectTypeConfig } from '../../../../definition';

import { Permission, Role } from '../../../../auth/type';

import toTableName from '../toTableName';
import Context from '../../../../context';

export function testAddPermissionFilter(
  description: string,
  typeName: string,
  modules: Array<ModuleConfig>,
  roles: Array<Role>,
  expectedQuery: string,
  uid: string = '1'
): void {
  it(description, () => {
    const context = createContextMock(modules);
    context.auth.uid = uid;
    context.auth.roles = roles;

    const tableName = toTableName(
      context.schemaBuilder.getObjectTypeConfig(typeName),
      context.getDBSchemaName()
    );
    const queryBuilder = context.getDBWrite()(tableName);
    let aliasCount = 0;
    const getTableAlias = () => {
      aliasCount++;
      return '_f' + aliasCount;
    };
    const result = applyPermissionQueryFilter({
      query: queryBuilder,
      typeConfig: context.schemaBuilder.getObjectTypeConfig(typeName),
      permissions:
        context.schemaBuilder.getObjectTypeConfig(typeName).permissions,
      tableName,
      getTableAlias,
      context,
      preview: false,
    });
    expect(result.toString()).to.equal(expectedQuery);
  });
}
