import { TypeConfig, TypeConfigMap } from './TypeConfig';
import { TypeKind } from './TypeKind';
import { ObjectTypeConfig } from './ObjectTypeConfig';
import { InputObjectTypeConfig } from './InputObjectTypeConfig';
import { InterfaceTypeConfig } from './InterfaceTypeConfig';
import { ScalarTypeConfig } from './ScalarTypeConfig';
import { UnionTypeConfig } from './UnionTypeConfig';
import { AssertionError } from '../errors';
import { EnumTypeConfig } from './EnumTypeConfig';
import { FieldConfig, FieldConfigMap } from './FieldConfig';

export function isObjectTypeConfig(type: TypeConfig): type is ObjectTypeConfig {
  return type.kind === TypeKind.OBJECT;
}

export function isInputObjectTypeConfig(
  type: TypeConfig
): type is InputObjectTypeConfig {
  return type.kind === TypeKind.INPUT_OBJECT;
}

export function isInterfaceTypeConfig(
  type: TypeConfig
): type is InterfaceTypeConfig {
  return type.kind === TypeKind.INTERFACE;
}

export function isScalarTypeConfig(type: TypeConfig): type is ScalarTypeConfig {
  return type.kind === TypeKind.SCALAR;
}

export function isUnionTypeConfig(type: TypeConfig): type is UnionTypeConfig {
  return type.kind === TypeKind.UNION;
}

export function isEnumTypeConfig(type: TypeConfig): type is EnumTypeConfig {
  return type.kind === TypeKind.ENUM;
}

export function isNode(type: TypeConfig): type is ObjectTypeConfig & {
  interfaces: string[];
  fields: FieldConfigMap & { id: FieldConfig };
} {
  return (
    type.kind === TypeKind.OBJECT && (type.interfaces || []).includes('Node')
  );
}

export function isContent(type: TypeConfig): type is ObjectTypeConfig & {
  interfaces: string[];
  fields: FieldConfigMap & { id: FieldConfig };
} {
  return (
    type.kind === TypeKind.OBJECT && (type.interfaces || []).includes('Content')
  );
}

export function isContentUnion(
  type: TypeConfig,
  typeMap: TypeConfigMap
): type is UnionTypeConfig {
  if (type.kind !== TypeKind.UNION) {
    return false;
  }

  for (const typeName of type.typeNames) {
    const subTypeConfig = typeMap[typeName];
    if (!subTypeConfig || !isContent(subTypeConfig)) {
      return false;
    }
  }
  return true;
}

export function isTypeConfigWithFields(
  type: TypeConfig
): type is InterfaceTypeConfig | ObjectTypeConfig | InputObjectTypeConfig {
  return (
    isInterfaceTypeConfig(type) ||
    isObjectTypeConfig(type) ||
    isInputObjectTypeConfig(type)
  );
}

export function assertObjectTypeConfig(type: TypeConfig): ObjectTypeConfig {
  if (isObjectTypeConfig(type)) {
    return type;
  } else {
    throw new AssertionError('Type is not of type ObjectTypeConfig');
  }
}

export function assertInputObjectTypeConfig(
  type: TypeConfig
): InputObjectTypeConfig {
  if (isInputObjectTypeConfig(type)) {
    return type;
  } else {
    throw new AssertionError('Type is not of type InputObjectTypeConfig');
  }
}
export function assertInterfaceTypeConfig(
  type: TypeConfig
): InterfaceTypeConfig {
  if (isInterfaceTypeConfig(type)) {
    return type;
  } else {
    throw new AssertionError('Type is not of type InterfaceTypeConfig');
  }
}

export function assertScalarTypeConfig(type: TypeConfig): ScalarTypeConfig {
  if (isScalarTypeConfig(type)) {
    return type;
  } else {
    throw new AssertionError('Type is not of type ScalarTypeConfig');
  }
}

export function assertUnionTypeConfig(type: TypeConfig): UnionTypeConfig {
  if (isUnionTypeConfig(type)) {
    return type;
  } else {
    throw new AssertionError('Type is not of type UnionTypeConfig');
  }
}
