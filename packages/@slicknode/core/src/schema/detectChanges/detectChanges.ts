/**
 * Created by Ivo Meißner on 29.09.17.
 *
 */

import {
  ModuleConfig,
  TypeConfigMap,
  TypeConfig,
  ProjectChange,
} from '../../definition';
import _ from 'lodash';

import { ProjectChangeType } from '../../definition';

/**
 * Strips resolvers etc. to compare against actual configuration values
 *
 * @param config
 */
function prepareForComparison(config: any): any {
  let preparedConfig = config;

  // If we have an ID field, only compare other fields because config
  // is injected dynamically by config loader (resolvers, access, etc.) and ID is reserved anyways
  if (_.get(config, 'fields.id')) {
    preparedConfig = {
      ...config,
      fields: {
        ..._.omit(config.fields, ['id']),
      },
    };
  }
  return JSON.parse(JSON.stringify(preparedConfig));
}

/**
 * Compares two app configurations
 *
 * @param from
 * @param to
 */
export default function detectChanges(
  from: Array<ModuleConfig>,
  to: Array<ModuleConfig>
): Array<ProjectChange> {
  const changes = [];

  const fromModuleIds = from.map((app) => app.id);
  const toModuleIds = to.map((app) => app.id);

  // Find removed modules
  _.difference(fromModuleIds, toModuleIds)
    .map((app) => ({
      description: `Remove module "${app}"`,
      app,
      path: [],
      type: ProjectChangeType.REMOVE,
      breaking: true,
    }))
    .forEach((change) => changes.push(change));

  // Find added modules
  _.difference(toModuleIds, fromModuleIds)
    .map((app) => ({
      description: `Add module "${app}"`,
      app,
      path: [],
      type: ProjectChangeType.ADD,
      breaking: false,
    }))
    .forEach((change) => changes.push(change));

  const fromTypeMap = buildTypeConfigMap(from);
  const toTypeMap = buildTypeConfigMap(to);

  const removedTypeNames = _.difference(
    Object.keys(fromTypeMap),
    Object.keys(toTypeMap)
  );
  const addedTypeNames = _.difference(
    Object.keys(toTypeMap),
    Object.keys(fromTypeMap)
  );

  // Find removed types
  removedTypeNames
    .map((typeName) => ({
      description: `Remove type "${typeName}". WARNING: Data will be lost!`,
      path: [],
      type: ProjectChangeType.REMOVE,
      breaking: true,
    }))
    .forEach((change) => changes.push(change));

  // Find added types
  addedTypeNames
    .map((typeName) => ({
      description: `Add type "${typeName}"`,
      path: [],
      type: ProjectChangeType.ADD,
      breaking: true,
    }))
    .forEach((change) => changes.push(change));

  // Find updated types
  _.difference(Object.keys(toTypeMap), addedTypeNames)
    .filter(
      (typeName) =>
        !_.isEqual(
          prepareForComparison(fromTypeMap[typeName]),
          prepareForComparison(toTypeMap[typeName])
        )
    )
    .forEach((typeName) => {
      changes.push({
        description: `Update type "${typeName}"`,
        path: [],
        type: ProjectChangeType.UPDATE,
        breaking: true,
      });
    });

  return changes;
}

function buildTypeConfigMap(modules: Array<ModuleConfig>): TypeConfigMap {
  const map = {};

  return modules.reduce((map1, app: ModuleConfig) => {
    return (app.types || []).reduce(
      (
        typeMap: {
          [x: string]: any;
        },
        typeConfig: TypeConfig
      ) => {
        typeMap[typeConfig.name] = typeConfig;
        return typeMap;
      },
      map1
    );
  }, map);
}
