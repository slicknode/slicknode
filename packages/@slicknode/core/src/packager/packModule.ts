/**
 * Created by Ivo Meißner on 2019-07-12
 *
 */
import { ModuleConfig } from '../definition';
import AdmZip from 'adm-zip';
import {
  printInputObjectType,
  printModuleSchema,
} from '../schema/schemaPrinter';
import { TypeKind } from '../definition';
import buildNodePermissionDocument from '../auth/buildNodePermissionDocument';
import _ from 'lodash';
import yaml from 'js-yaml';
import SchemaBuilder from '../schema/builder';
import { tenantModules } from '../modules';

/**
 * Creates a Zip file of the module in registry format
 * @TODO: Create spec for this
 *
 * @param config
 * @returns {Promise<void>}
 */
export default async function packModule(
  config: ModuleConfig
): Promise<AdmZip> {
  const zip = new AdmZip();
  const builder = new SchemaBuilder({ modules: tenantModules });

  // No prefix for module package
  const prefix = 'module';

  // Add schema.graphql
  if (config.rawSchema) {
    zip.addFile(`${prefix}/schema.graphql`, Buffer.from(config.rawSchema));
  } else {
    zip.addFile(
      `${prefix}/schema.graphql`,
      Buffer.from(printModuleSchema(config, builder))
    );
  }
  zip.addFile(`${prefix}/permissions/`, Buffer.from(''));

  // Add permission files
  const permissionTypes = (config.types || []).filter(
    (conf) =>
      conf.kind === TypeKind.OBJECT &&
      ((conf.interfaces || []).includes('Node') || conf.permissions)
  );

  permissionTypes.map(buildNodePermissionDocument).forEach((perm, key) => {
    // Only add object types
    const typeConfig = permissionTypes[key];
    if (typeConfig && typeConfig.kind === TypeKind.OBJECT) {
      zip.addFile(
        `${prefix}/permissions/${typeConfig.name}.graphql`,
        Buffer.from(perm)
      );
    }
  });

  // Add permissions of types from other modules
  if (config.typePermissions) {
    const extendedPermissionTypeNames = Object.keys(config.typePermissions);
    extendedPermissionTypeNames
      .map((name) =>
        buildNodePermissionDocument({
          name,

          ...config.typePermissions[name],
          fields: {},
          kind: TypeKind.OBJECT,
        })
      )
      .forEach((perm, key) => {
        zip.addFile(
          `${prefix}/permissions/${extendedPermissionTypeNames[key]}.graphql`,
          Buffer.from(perm)
        );
      });
  }

  // Add settings document
  if (config.settings) {
    zip.addFile(
      `${prefix}/settings.graphql`,
      printInputObjectType(config.settings, builder.getSchema()) as any // @FIXME: Fix types in adm-zip
    );
  }

  // Add slicknode.yml
  if (config.hasOwnProperty('rawConfig')) {
    zip.addFile(`${prefix}/slicknode.yml`, Buffer.from(config.rawConfig || ''));
  } else {
    // Generate slicknode.yml from config
    const app = {
      module: {
        id: config.id,
        ...(config.namespace
          ? {
              namespace: config.namespace,
            }
          : null),
        label: _.get(config, 'admin.base.name', config.namespace || config.id),
      },
      ...(config.runtime ? { runtime: config.runtime.config } : {}),
    };
    zip.addFile(`${prefix}/slicknode.yml`, Buffer.from(yaml.safeDump(app)));
  }
  return zip;
}
