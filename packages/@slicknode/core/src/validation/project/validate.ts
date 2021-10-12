/**
 * Created by Ivo Meißner on 15.09.17.
 *
 */

import {
  ModuleConfig,
  TypeConfigMap,
  TypeConfig,
  FieldConfigMap,
  ConnectionConfig,
  TypeExtensionConfigMap,
  isTypeConfigWithFields,
} from '../../definition';
import _ from 'lodash';
import { PackageError } from '../../errors';
import { enhanceModules } from '../../schema/enhanceModules';

export type ValidationRuleConfig = {
  /**
   * Start validation
   */
  enter?: () => void;
  /**
   * Module validation
   */
  app?:
    | ((config: ModuleConfig) => void)
    | {
        enter?: (config: ModuleConfig) => void;
        leave?: (config: ModuleConfig) => void;
      };
  /**
   * Type validation
   */
  type?:
    | ((
        config: TypeConfig,
        previousConfig: TypeConfig | undefined | null
      ) => void)
    | {
        enter?: (
          config: TypeConfig,
          previousConfig: TypeConfig | undefined | null
        ) => void;
        leave?: (
          config: TypeConfig,
          previousConfig: TypeConfig | undefined | null
        ) => void;
      };
  /**
   * Field validation
   */
  field?:
    | ((
        config: FieldConfigMap,
        previousConfigMap: FieldConfigMap | undefined | null
      ) => void)
    | {
        enter?: (
          config: FieldConfigMap,
          previousConfigMap: FieldConfigMap | undefined | null
        ) => void;
        leave?: (
          config: FieldConfigMap,
          previousConfigMap: FieldConfigMap | undefined | null
        ) => void;
      };
  /**
   * Connection validation
   */
  connection?:
    | ((config: ConnectionConfig) => void)
    | {
        enter?: (config: ConnectionConfig) => void;
        leave?: (config: ConnectionConfig) => void;
      };
  /**
   * Related fields validation
   */
  typeExtensions?:
    | ((
        config: TypeExtensionConfigMap,
        previousConfig: TypeExtensionConfigMap | undefined | null
      ) => void)
    | {
        enter?: (
          config: TypeExtensionConfigMap,
          previousConfig: TypeExtensionConfigMap | undefined | null
        ) => void;
        leave?: (
          config: TypeExtensionConfigMap,
          previousConfig: TypeExtensionConfigMap | undefined | null
        ) => void;
      };
  /**
   * Finish all validations
   */
  leave?: () => void;
};

export type ValidationRule = (
  context: ValidationContext
) => ValidationRuleConfig;

export class ValidationContext {
  modules: Array<ModuleConfig>;
  typeMap: TypeConfigMap;
  _errors: Array<PackageError>;

  constructor(modules: Array<ModuleConfig>) {
    this.modules = enhanceModules(modules);
    this._errors = [];
    this._buildTypeMap();
  }

  _buildTypeMap(): void {
    this.typeMap = this.modules.reduce(
      (map: TypeConfigMap, app: ModuleConfig) => {
        return (app.types || []).reduce(
          (map2: TypeConfigMap, typeConfig: TypeConfig) => {
            map2[typeConfig.name] = typeConfig;
            return map2;
          },
          map
        );
      },
      {}
    );
  }

  reportError(error: PackageError): void {
    this._errors.push(error);
  }

  getErrors(): Array<PackageError> {
    return this._errors;
  }
}

export function validateUsingRules(
  modules: Array<ModuleConfig>,
  currentModules: Array<ModuleConfig>,
  rules: Array<ValidationRule>
): ValidationContext {
  const context = new ValidationContext(modules);
  const ruleConfigs = rules.map((rule) => rule(context));

  // Create current object maps
  const currentModuleMap = currentModules.reduce(
    (
      appMap: {
        [x: string]: any;
      },
      app: ModuleConfig
    ) => {
      appMap[app.id] = app;
      return appMap;
    },
    {}
  );
  const currentTypeMap = currentModules.reduce(
    (typeMap: TypeConfigMap, app: ModuleConfig) => {
      return (app.types || []).reduce(
        (typeMap2: TypeConfigMap, typeConfig: TypeConfig) => {
          typeMap2[typeConfig.name] = typeConfig;
          return typeMap2;
        },
        typeMap
      );
    },
    {}
  );

  // Create lists of rules that need to be invoked for specific objects
  // to reduce number of array scans
  const appRules = ruleConfigs
    .filter((rule) => rule.hasOwnProperty('app'))

    .map((rule) => rule.app);
  const typeRules = ruleConfigs
    .filter((rule) => rule.hasOwnProperty('type'))

    .map((rule) => rule.type);
  const fieldRules = ruleConfigs
    .filter((rule) => rule.hasOwnProperty('field'))

    .map((rule) => rule.field);
  const connectionRules = ruleConfigs
    .filter((rule) => rule.hasOwnProperty('connection'))

    .map((rule) => rule.connection);
  const relatedFieldRules = ruleConfigs
    .filter((rule) => rule.hasOwnProperty('typeExtensions'))

    .map((rule) => rule.typeExtensions);

  // Trigger rule enter
  ruleConfigs.forEach((rule) => {
    if (rule.enter) {
      rule.enter();
    }
  });

  // Run validation for all modules
  modules.forEach((app) => {
    // Validate app object
    validateObject(app, currentModuleMap[app.id] || null, appRules, () => {
      // Validate types
      (app.types || []).forEach((typeConfig) => {
        validateObject(
          typeConfig,
          currentTypeMap[typeConfig.name] || null,
          typeRules,
          () => {
            if (isTypeConfigWithFields(typeConfig)) {
              Object.keys(typeConfig.fields)
                .map((name) => ({ [name]: typeConfig.fields[name] }))
                .forEach((fieldMap) => {
                  const fieldName = Object.keys(fieldMap)[0];
                  const currentFieldConfig = _.get(
                    currentTypeMap,
                    typeConfig.name + '.fields.' + fieldName
                  );
                  validateObject(
                    fieldMap,
                    currentFieldConfig
                      ? { [fieldName]: currentFieldConfig }
                      : null,
                    fieldRules
                  );
                });
            }
          }
        );
      });

      // Validate connections
      (app.connections || []).forEach((connectionConfig) => {
        validateObject(connectionConfig, null, connectionRules);
      });

      // Validate related fields
      const typeExtensions = app.typeExtensions || {};
      if (typeExtensions) {
        Object.keys(typeExtensions).forEach((typeName) => {
          const currentTypeExtensionConfig = _.get(
            currentModuleMap[app.id],
            `typeExtensions.${typeName}`,
            null
          );
          const relatedFieldConfig = typeExtensions[typeName];

          // Child validation of fields
          /*
          Field validation rules have to be implemented explicitly now.
          @TODO: Remove
          const childValidation = () => {
            Object.keys(relatedFieldConfig)
              .map(name => ({[name]: relatedFieldConfig[name]}))
              .forEach(fieldMap => {
                const fieldName = Object.keys(fieldMap)[0];
                const currentFieldConfig = _.get(
                  currentTypeExtensionConfig,
                  fieldName
                );
                validateObject(
                  fieldMap,
                  currentFieldConfig ? {[fieldName]: currentFieldConfig} : null,
                  fieldRules
                );
              });
          };
          */

          validateObject(
            { [typeName]: relatedFieldConfig },
            { [typeName]: currentTypeExtensionConfig },
            relatedFieldRules
            // childValidation
          );
        });
      }
    });
  });

  // Trigger rule leave
  ruleConfigs.forEach((rule) => {
    if (rule.leave) {
      rule.leave();
    }
  });

  return context;
}

function validateObject(
  validatedObject: any,
  currentObject: any | undefined | null,
  rules: Array<{
    [x: string]: any;
  }>,
  childValidation?: () => void
): void {
  rules.forEach((rule) => {
    switch (typeof rule) {
      case 'function': {
        rule(validatedObject, currentObject);
        break;
      }
      case 'object': {
        if (typeof rule.enter === 'function') {
          rule.enter(validatedObject, currentObject);
        }
        break;
      }
      default: {
        throw new Error(
          'Invalid validation rule. Type of rule expected to be either function or object'
        );
      }
    }
  });

  if (childValidation) {
    childValidation();
  }

  rules.forEach((rule) => {
    switch (typeof rule) {
      case 'object': {
        if (typeof rule.leave === 'function') {
          rule.leave(validatedObject, currentObject);
        }
        break;
      }
    }
  });
}
