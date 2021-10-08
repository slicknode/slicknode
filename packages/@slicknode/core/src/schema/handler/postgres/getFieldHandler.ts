import {
  FieldConfig,
  isContent,
  isContentUnion,
  TypeConfig,
  TypeKind,
} from '../../../definition';
import { HANDLER_POSTGRES, MigrationScope } from '../base';
import AbstractFieldHandler from './fields/AbstractFieldHandler';
import _ from 'lodash';
import * as fields from './fields';

/**
 * Returns the AbstractFieldHandler for the field
 *
 * @param fieldConfig
 * @param scope
 * @returns {AbstractFieldHandler}
 */
export function getFieldHandler(
  fieldConfig: FieldConfig,
  scope: MigrationScope
): AbstractFieldHandler {
  if (_.has(fields, fieldConfig.typeName)) {
    return fields[fieldConfig.typeName];
  }

  // Check if is related type
  const relatedType: TypeConfig | undefined | null =
    _.get(scope, 'newTypes.' + fieldConfig.typeName) ||
    _.get(scope, 'currentTypes.' + fieldConfig.typeName);

  if (relatedType) {
    switch (relatedType.kind) {
      case TypeKind.OBJECT:
        if (
          relatedType.handler &&
          relatedType.handler.kind === HANDLER_POSTGRES
        ) {
          return isContent(relatedType) ? fields.Content : fields.RelatedObject;
        }
        break;
      case TypeKind.ENUM:
        return fields.Enum;
      case TypeKind.UNION:
        // Use the newTypes type map if type exists, otherwise use current types
        // (for example if a union along with all fields was removed)
        const typeMap =
          scope.newTypes && scope.newTypes.hasOwnProperty(relatedType.name)
            ? scope.newTypes
            : scope.currentTypes;
        if (isContentUnion(relatedType, typeMap)) {
          return fields.ContentUnion;
        } else {
          console.log('No content union', relatedType, fieldConfig);
        }
    }
  }

  throw new Error('No field handler found for type ' + fieldConfig.typeName);
}
