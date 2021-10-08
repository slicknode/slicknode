/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */
/* eslint-disable max-len */

import { expect } from 'chai';

import { printModuleSchema } from '../schemaPrinter';
import SchemaBuilder from '../builder';

import {
  objectTypeModules,
  enumTypeModules,
  inputObjectTypeModules,
  interfaceTypeModules,
  scalarTypeModules,
  unionTypeModules,
  extendedTypeModules,
  connectionModules,
  inputElementModules,
  directiveModules,
} from './schemaConfigs/printedSchemas';

describe('Schema printer', () => {
  it('prints object type', () => {
    const builder = new SchemaBuilder({ modules: objectTypeModules });
    const printedSchema = printModuleSchema(objectTypeModules[0], builder);
    expect(printedSchema).to.equal(`"""TestDescription"""
type TestType @autocomplete(fields: ["stringField"]) @index(fields: ["stringField","idField"], unique: true) @index(fields: ["stringField"]) {
  """Field description"""
  stringField: String @validateRegex(pattern:"/^(a-z)$/i")
  requiredStringField: String!
  intField: Int @index

  """
  Some multiline
  comment with special \\""" characters
  """
  floatField: Float

  """
  Super long comment in one line that will be broken into multiple lines of 80
  characters. We need some more text here so that it actually creates a break.
  """
  booleanField: Boolean
  idField: ID
  listField(query: String = "query"): [String]
  requiredListField: [String!]! @unique
}
`);
  });

  it('prints enum type', () => {
    const builder = new SchemaBuilder({ modules: enumTypeModules });
    const printedSchema = printModuleSchema(enumTypeModules[0], builder);
    expect(printedSchema).to.equal(`"""TestDescription"""
enum TestType {
  """Test value"""
  TEST

  """Second description"""
  SECOND @deprecated(reason: "Deprecated value")
}
`);
  });

  it('prints custom directives', () => {
    const builder = new SchemaBuilder({ modules: directiveModules });
    const printedSchema = printModuleSchema(directiveModules[0], builder);
    expect(printedSchema).to.equal(`"""
My fancy
description
"""
directive @testDirective(
  """Arg description"""
  input: [[String!]]!

  """Arg description"""
  input2: String = "Test value"
) on FIELD_DEFINITION | ARGUMENT_DEFINITION
`);
  });

  it('prints input object type', () => {
    const builder = new SchemaBuilder({ modules: inputObjectTypeModules });
    const printedSchema = printModuleSchema(inputObjectTypeModules[0], builder);
    expect(printedSchema).to.equal(`"""TestDescription"""
input TestType {
  """Field description"""
  stringField: String
  requiredStringField: String!
  intField: Int
  floatField: Float
  booleanField: Boolean
  idField: ID
  listField: [String]
  requiredListField: [String!]! = ["test"]
}
`);
  });

  it('prints interface type', () => {
    const builder = new SchemaBuilder({ modules: interfaceTypeModules });
    const printedSchema = printModuleSchema(interfaceTypeModules[0], builder);
    expect(printedSchema).to.equal(`"""TestDescription"""
interface TestType {
  """Field description"""
  stringField: String
  requiredStringField: String!
  intField: Int
  floatField: Float
  booleanField: Boolean
  idField: ID
  listField(query: String = "query"): [String]
  requiredListField: [String!]! @unique
}
`);
  });

  it('prints scalar type', () => {
    const builder = new SchemaBuilder({ modules: scalarTypeModules });
    const printedSchema = printModuleSchema(scalarTypeModules[0], builder);
    expect(printedSchema).to.equal(`"""An ISO-8601 encoded UTC date string."""
scalar DateTime
`);
  });

  it('prints union type', () => {
    const builder = new SchemaBuilder({ modules: unionTypeModules });
    const printedSchema = printModuleSchema(unionTypeModules[0], builder);
    expect(printedSchema).to.equal(`type Object1 {
  stringField: String
}

type Object2 {
  stringField: String
}

"""TestDescription"""
union TestType = Object1 | Object2
`);
  });

  it('prints connections', () => {
    const builder = new SchemaBuilder({ modules: connectionModules });
    const printedSchema = printModuleSchema(connectionModules[0], builder);
    expect(printedSchema).to.equal(`type Group implements Node {
  id: ID!
  externalId: String!

  """Group members"""
  members: [Member]! @relation(path: "Group=group.Membership.member=Member")

  """Super admin"""
  superAdmin: Member @relation(path: "Group=group.SuperAdmin.member=Member")
  memberships: [Membership]! @relation(path: "Group=group.Membership")
  membershipCustomKey: [Member]! @relation(path: "Group.externalId=externalGroupId.Membership.externalMemberId=externalId.Member")
}

type SuperAdmin implements Node {
  id: ID!
  group: Group! @unique
  member: Member! @unique
}

type Membership implements Node {
  id: ID!
  group: Group!
  member: Member!
  externalMemberId: String!
  externalGroupId: String!
}

type Member implements Node {
  id: ID!
  externalId: String!
}
`);
  });

  it('prints type extensions', () => {
    const builder = new SchemaBuilder({ modules: extendedTypeModules });
    const printedSchema = printModuleSchema(extendedTypeModules[0], builder);
    expect(printedSchema).to.equal(`type Group implements Node {
  id: ID!
  externalId: String!
}

type Membership implements Node {
  id: ID!
  group: Group!
  member: User!
  externalMemberId: String!
  externalGroupId: String!
}

extend type User {
  email: String!

  """Groups"""
  groups: [Group]! @relation(path: "User=member.Membership.group=Group")
  membershipCustomKey: [Group]! @relation(path: "User.externalId=externalMemberId.Membership.externalGroupId=externalId.Group")
}

extend type Query {
  """Test description"""
  testField: String

  """Test description"""
  testField2: String
}
`);
  });

  it('prints input elements', () => {
    const builder = new SchemaBuilder({ modules: inputElementModules });
    const printedSchema = printModuleSchema(inputElementModules[0], builder);
    expect(printedSchema).to.equal(`type ObjectType {
  textField: String @input(type: TEXT)
  textAreaField: String @input(type: TEXTAREA)
  markdownField: String @input(type: MARKDOWN)
  passwordField: String @input(type: PASSWORD)
}

interface InterfaceType {
  textField: String @input(type: TEXT)
  textAreaField: String @input(type: TEXTAREA)
  markdownField: String @input(type: MARKDOWN)
  passwordField: String @input(type: PASSWORD)
}
`);
  });
});
