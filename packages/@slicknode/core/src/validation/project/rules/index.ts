/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import ValidTypeName from './ValidTypeName';
import MaxFieldCount from './MaxFieldCount';
import ReservedFieldName from './ReservedFieldName';
import ValidFieldName from './ValidFieldName';
// import ObjectTypeRequiresNode from './ObjectTypeRequiresNode';
import FieldTypeSupported from './FieldTypeSupported';
import FieldTypeNotChanged from './FieldTypeNotChanged';
import TypeKindNotChanged from './TypeKindNotChanged';
import CoreModulesRequired from './CoreModulesRequired';
import ConnectionEdgeFieldTypesMatch from './ConnectionEdgeFieldTypesMatch';
import ConnectionHandlerTypeSupported from './ConnectionHandlerTypeSupported';
import ConnectionValidFieldName from './ConnectionValidFieldName';
import ConnectionNodeInterfaceImplemented from './ConnectionNodeInterfaceImplemented';
import PermissionQueryValid from './PermissionQueryValid';
import TimeStampedInterfaceStrict from './TimeStampedInterfaceStrict';
import AutocompleteFieldsValid from './AutocompleteFieldsValid';
import ObjectTypeIndexValid from './ObjectTypeIndexValid';

export default [
  ValidTypeName,
  MaxFieldCount,
  ReservedFieldName,
  ValidFieldName,
  // ObjectTypeRequiresNode,
  FieldTypeSupported,
  FieldTypeNotChanged,
  TypeKindNotChanged,
  CoreModulesRequired,
  ConnectionEdgeFieldTypesMatch,
  ConnectionHandlerTypeSupported,
  ConnectionValidFieldName,
  ConnectionNodeInterfaceImplemented,
  PermissionQueryValid,
  TimeStampedInterfaceStrict,
  AutocompleteFieldsValid,
  ObjectTypeIndexValid,
];
