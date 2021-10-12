/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */

import { ModuleConfig } from '../definition';
import { TypeKind, ModuleKind } from '../definition';
import buildNodePermissionDocument from '../auth/buildNodePermissionDocument';
import yaml from 'js-yaml';
import _ from 'lodash';

import SchemaBuilder from '../schema/builder';
import {
  printModuleSchema,
  printInputObjectType,
} from '../schema/schemaPrinter';
import AdmZip from 'adm-zip';

/**
 * Packs the complete app configuration into a zip file
 * @param modules
 * @returns {Promise.<module.exports>}
 */
export default async function pack(
  modules: Array<ModuleConfig>
): Promise<AdmZip> {
  const builder = new SchemaBuilder({ modules });
  const slicknodeJson = {
    dependencies: {},
  };

  const archive = modules.reduce((zip: AdmZip, config: ModuleConfig) => {
    const prefix = `modules/${config.id}`;
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
    slicknodeJson.dependencies[config.id] =
      config.kind === ModuleKind.NATIVE
        ? 'latest'
        : `./modules/${config.id.replace('@private/', '')}`;

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
        Buffer.from(printInputObjectType(config.settings, builder.getSchema()))
      );
    }

    // Add slicknode.yml
    if (config.hasOwnProperty('rawConfig')) {
      zip.addFile(
        `${prefix}/slicknode.yml`,
        Buffer.from(config.rawConfig || '')
      );
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
          label: _.get(
            config,
            'admin.base.name',
            config.namespace || config.id
          ),
        },
        ...(config.runtime ? { runtime: config.runtime.config } : {}),
      };
      zip.addFile(`${prefix}/slicknode.yml`, Buffer.from(yaml.safeDump(app)));
    }
    return zip;
  }, new AdmZip());
  archive.addFile('slicknode.yml', Buffer.from(yaml.safeDump(slicknodeJson)));

  return archive;
}
