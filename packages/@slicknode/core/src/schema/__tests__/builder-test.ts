/**
 * Created by Ivo Meißner on 19.01.17.
 *
 * @TODO: Enable flow and write tests with type safety. For now, we just let it crash...
 */

import chai, { expect } from 'chai';
import { describe, it } from 'mocha';
import sinonChai from 'sinon-chai';

import * as schemaConfigs from './schemaConfigs/index';
import SchemaBuilder from '../builder';
import { createContextMock } from '../../test/utils';

import {
  assertInputObjectType,
  assertNamedType,
  assertObjectType,
  assertUnionType,
  DirectiveLocation,
  graphql,
  parse,
} from 'graphql';
import sinon from 'sinon';
import nock from 'nock';
import uuid from 'uuid';
import { ModuleKind, TypeKind } from '../../definition';
import { UnconfiguredRuntime } from '@slicknode/runtime-executor';
import { Role } from '../../auth';
import { getComplexity } from 'graphql-query-complexity';
import { estimators } from '../../queryComplexityValidator';

chai.should();
chai.use(sinonChai);

/* eslint-disable no-unused-expressions */

describe('SchemaBuilder:', () => {
  describe('Type builder', () => {
    it('creates a simple type', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.simpleType,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(types).to.include.keys(['Viewer', 'Query', 'TestType']);
    });

    it('adds builtin directives to schema', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.simpleType,
      });

      const schema = builder.getSchema();
      const builtinDirectives = ['skip', 'include', 'deprecated'];
      for (const directiveName of builtinDirectives) {
        const directive = schema.getDirective(directiveName);
        expect(directive.name).to.equal(directiveName);
      }
    });

    it('adds custom type directive', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.simpleType,
      });

      const schema = builder.getSchema();
      const directive = schema.getDirective('index');
      expect(directive.name).to.equal('index');
      expect(directive).to.equal(
        builder.getDirective('index', DirectiveLocation.FIELD_DEFINITION)
      );
    });

    it('creates a mutation with custom input object type', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const mutationType = schema.getMutationType();
      expect(mutationType).to.not.equal(null);

      const mutation = mutationType.getFields().testCustomInputMutation;
      expect(mutation).to.have.property('args');
      expect(mutation.type.toString()).to.equal(
        'testCustomInputMutationPayload'
      );
      expect(mutation.args.length).to.equal(1);
      expect(mutation.args[0].name).to.equal('input');
      expect(mutation.args[0].type.toString()).to.equal('TestInputObject!');
    });

    it('creates a mutation with custom scalar output type', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const mutationType = schema.getMutationType();
      expect(mutationType).to.not.equal(null);

      const mutation = mutationType.getFields().testCustomOutputMutation;
      expect(mutation).to.have.property('args');
      expect(mutation.type.toString()).to.equal('String');
      expect(mutation.args.length).to.equal(1);
      expect(mutation.args[0].name).to.equal('input');
      expect(mutation.args[0].type.toString()).to.equal(
        'testCustomOutputMutationInput!'
      );
    });

    it('creates a mutation with custom object output type + custom resolver', async () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const mutationType = schema.getMutationType();
      expect(mutationType).to.not.equal(null);

      const mutation = mutationType.getFields().testCustomOutputObjectMutation;
      expect(mutation).to.have.property('args');
      expect(mutation.type.toString()).to.equal('ReferencedType');
      expect(mutation.args.length).to.equal(1);
      expect(mutation.args[0].name).to.equal('input');
      expect(mutation.args[0].type.toString()).to.equal(
        'testCustomOutputObjectMutationInput!'
      );

      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const result = await graphql(
        schema,
        'mutation {testCustomOutputObjectMutation (input: {stringInput: "TestString"}){stringField}}',
        null,
        context
      );
      expect(result).to.deep.equal({
        data: {
          testCustomOutputObjectMutation: {
            stringField: 'TestString test',
          },
        },
      });
    });

    it('merges type permissions into mutation configs', async () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      expect(
        builder.mutationConfigs.testCustomOutputObjectMutation.permissions
      ).to.deep.equal([{ role: Role.ANONYMOUS }, { role: Role.ADMIN }]);
    });

    it('throws error for missing resolver for mutation', async () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const mutationType = schema.getMutationType();
      expect(mutationType).to.not.equal(null);

      const mutation =
        mutationType.getFields().testCustomMutationWithoutResolver;
      expect(mutation).to.have.property('args');
      expect(mutation.type.toString()).to.equal('ReferencedType');
      expect(mutation.args.length).to.equal(1);
      expect(mutation.args[0].name).to.equal('input');
      expect(mutation.args[0].type.toString()).to.equal(
        'testCustomMutationWithoutResolverInput!'
      );

      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const result = await graphql(
        schema,
        'mutation {testCustomMutationWithoutResolver (input: {stringInput: "TestString"}){stringField}}',
        null,
        context
      );
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].message).to.include(
        'Resolver for mutation "testCustomMutationWithoutResolver" is not implemented'
      );
    });

    it('creates fields with the correct type', () => {
      const builder = new SchemaBuilder({ modules: schemaConfigs.simpleType });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const fields = assertObjectType(types.TestType).getFields();
      expect(assertNamedType(fields.test.type).name).to.equal('String');
      expect(fields.test.name).to.equal('test');
      expect(fields.test.type.toString()).to.equal('String');
    });

    it('adds description to the type', () => {
      const builder = new SchemaBuilder({ modules: schemaConfigs.simpleType });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(assertObjectType(types.TestType).description).to.equal(
        'TestDescription'
      );
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds related field', () => {
      const builder = new SchemaBuilder({ modules: schemaConfigs.simpleType });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(assertObjectType(types.Viewer).getFields().test.type)
          .name
      ).to.equal('TestType');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds a required field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields()
        .requiredStringField;
      expect(field.type.toString()).to.equal('String!');
    });

    it('adds a required list field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields()
        .listFieldRequired;
      expect(field.type.toString()).to.equal('[String!]!');
    });

    it('adds an optional list field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields().listField;
      expect(field.type.toString()).to.equal('[String]');
    });

    it('adds a required list field inner nullable', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields()
        .listFieldRequiredInnerNull;
      expect(field.type.toString()).to.equal('[String]!');
    });

    it('adds a list field inner nullable', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields()
        .listFieldInnerNull;
      expect(field.type.toString()).to.equal('[String]');
    });

    it('adds a list field with 2 dimensions', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields().listField2d;
      expect(field.type.toString()).to.equal('[[String]!]');
    });

    it('adds a list field with 3 dimensions', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields().listField3d;
      expect(field.type.toString()).to.equal('[[[String!]]!]!');
    });

    it('adds a required list argument', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const testArg = assertObjectType(types.TestType)
        .getFields()
        .argTest.args.find((arg) => arg.name === 'listFieldRequired');
      expect(testArg.type.toString()).to.equal('[String!]!');
    });

    it('adds an optional list arg', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const testArg = assertObjectType(types.TestType)
        .getFields()
        .argTest.args.find((arg) => arg.name === 'listField');
      expect(testArg.type.toString()).to.equal('[String]');
    });

    it('adds a required list arg inner nullable', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const testArg = assertObjectType(types.TestType)
        .getFields()
        .argTest.args.find((arg) => arg.name === 'listFieldRequiredInnerNull');
      expect(testArg.type.toString()).to.equal('[String]!');
    });

    it('adds a list arg inner nullable', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const testArg = assertObjectType(types.TestType)
        .getFields()
        .argTest.args.find((arg) => arg.name === 'listFieldInnerNull');
      expect(testArg.type.toString()).to.equal('[String]');
    });

    it('adds a list arg with 2 dimensions', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const testArg = assertObjectType(types.TestType)
        .getFields()
        .argTest.args.find((arg) => arg.name === 'listField2d');
      expect(testArg.type.toString()).to.equal('[[String]!]');
    });

    it('adds a list arg with 3 dimensions', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const testArg = assertObjectType(types.TestType)
        .getFields()
        .argTest.args.find((arg) => arg.name === 'listField3d');
      expect(testArg.type.toString()).to.equal('[[[String!]]!]!');
    });

    it('adds Int field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(
          assertObjectType(types.TestType).getFields().intField.type
        ).name
      ).to.equal('Int');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds Float field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(
          assertObjectType(types.TestType).getFields().floatField.type
        ).name
      ).to.equal('Float');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds ID field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(
          assertObjectType(types.TestType).getFields().idField.type
        ).name
      ).to.equal('ID');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds String field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(
          assertObjectType(types.TestType).getFields().stringField.type
        ).name
      ).to.equal('String');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds Boolean field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(
          assertObjectType(types.TestType).getFields().booleanField.type
        ).name
      ).to.equal('Boolean');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds Referenced type field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      expect(
        assertNamedType(
          assertObjectType(types.TestType).getFields().referencedField.type
        ).name
      ).to.equal('ReferencedType');
      // expect(assertObjectType(types.TestType).getFields().test.name).to.equal('test');
    });

    it('adds a required Referenced Field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields()
        .requiredReferencedField;
      expect(field.type.toString()).to.equal('ReferencedType!');
    });

    it('adds an Enum Field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields().enumField;
      expect(field.type.toString()).to.equal('TestEnum');
    });

    it('adds a required Enum Field', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const field = assertObjectType(types.TestType).getFields()
        .requiredEnumField;
      expect(field.type.toString()).to.equal('TestEnum!');
    });

    it('adds listTypeName field on query type', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const rootFields = assertObjectType(types.Query).getFields();
      expect(rootFields).to.have.property('listTestNode');
      expect(assertNamedType(rootFields.listTestNode.type).name).to.equal(
        '_TestNodeConnection'
      );
    });

    it('adds listTypeName field with namespace on query type', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const rootFields = assertObjectType(types.Query).getFields();
      expect(rootFields).to.have.property('Namespace_listTestNode');
      expect(
        assertNamedType(rootFields.Namespace_listTestNode.type).name
      ).to.equal('_Namespace_TestNodeConnection');
    });

    it('does not add listTypeName field for no node fields', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const rootFields = assertObjectType(types.Query).getFields();
      expect(rootFields).to.not.have.property('listTestType');
    });

    it('only adds listTypeName field for supported handlers', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const rootFields = assertObjectType(types.Query).getFields();
      expect(rootFields).to.not.have.property('listTestNodeNoHandler');
    });

    it('creates a UnionType', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const type = assertUnionType(types.TestUnion);
      expect(type.getTypes().length).to.equal(2);
      expect(type.getTypes()[0].name).to.equal('TestType');
      expect(type.getTypes()[1].name).to.equal('ReferencedType');
    });

    it('adds a mutation', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const field = schema.getMutationType().getFields().testMutation;
      expect(field.type.toString()).to.equal('testMutationPayload');
    });

    it('does not add field to create mutation with no FieldAccess.CREATE', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const type = assertInputObjectType(types.createFieldAccessTestNodeInput);
      expect(type).to.not.be.undefined;
      expect(type.getFields()).to.have.property('createOnlyField');
      expect(type.getFields()).to.not.have.property('readOnlyField');
      expect(type.getFields()).to.not.have.property('updateOnlyField');
    });

    it('does not add field to update mutation with no FieldAccess.UPDATE', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const type = assertInputObjectType(types.updateFieldAccessTestNodeInput);
      expect(type).to.not.be.undefined;
      expect(type.getFields()).to.have.property('updateOnlyField');
      expect(type.getFields()).to.not.have.property('createOnlyField');
      expect(type.getFields()).to.not.have.property('readOnlyField');
    });

    it('does not add field to type with no FieldAccess.READ', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const type = assertObjectType(types.FieldAccessTestNode);
      expect(type).to.not.be.undefined;
      expect(type.getFields()).to.have.property('readOnlyField');
      expect(type.getFields()).to.not.have.property('createOnlyField');
      expect(type.getFields()).to.not.have.property('updateOnlyField');
    });

    it('adds permissions across modules', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const typeConfig = builder.getObjectTypeConfig('TestNode');
      expect(typeConfig).to.not.be.undefined;

      expect(typeConfig.permissions).to.deep.equal([{ role: Role.ADMIN }]);
    });

    it('triggers a PreMutationHook', (done) => {
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();
      const postMutation = nock('http://dummyhost')
        .post('/post')
        .reply(200, {});
      const preMutation = nock('http://dummyhost')
        .post('/pre', {
          args: {
            input: {
              stringInput: 'TestString',
            },
          },
          event: 'mutation.testMutation.BEFORE',
        })
        .reply(200, {});

      graphql(
        schema,
        'mutation {testMutation (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testMutation: { result: 'ResultTestString' } },
          });
          postMutation.done();
          preMutation.done();
          done();
        })
        .catch(done);
    });

    it('triggers a PostMutationHook', (done) => {
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();
      const postMutation = nock('http://dummyhost')
        .post('/post', {
          args: {
            input: {
              stringInput: 'TestString',
            },
          },
          data: {
            result: 'ResultTestString',
          },
          event: 'mutation.testMutation.AFTER',
        })
        .reply(200, {});
      const preMutation = nock('http://dummyhost').post('/pre').reply(200, {});

      graphql(
        schema,
        'mutation {testMutation (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testMutation: { result: 'ResultTestString' } },
          });
          postMutation.done();
          preMutation.done();
          done();
        })
        .catch(done);
    });

    it('triggers mutation hooks with runtime handler', (done) => {
      const moduleId = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      ).id;
      const checksum =
        'a1fdc3711bb29a95fd382b8519ff8ccbfe03a279bce8c59f870e43e605417ce9';
      const context = createContextMock(schemaConfigs.fullSchemaConfig);

      // Set defaultRuntime
      context._defaultRuntime = new UnconfiguredRuntime();
      const stub = sinon
        .stub(context._defaultRuntime, 'execute' as any)
        .resolves({
          success: true,
          data: 'Test',
        });

      const schema = context.schemaBuilder.getSchema();
      /*
      const postMutation = nock('http://user-null-runtime:8080')
        .post('/testnamespace', {
          handler: 'src/postMutation.js',
          data: {
            args: {
              input: { stringInput: 'TestString' },
            },
            data: { result: 'ResultTestString' },
            event: 'mutation.testRuntimeHooks.AFTER'
          },
          context: context.getRuntimeExecutionContext(moduleId),
          path: `${moduleId}/${checksum}`
        })
        .once()
        .reply(200, {
          success: true,
          data: 'Test'
        });
      const preMutation = nock('http://user-null-runtime:8080')
        .post('/testnamespace', {
          handler: 'src/preMutation.js',
          data: {
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testRuntimeHooks.BEFORE',
          },
          context: context.getRuntimeExecutionContext(moduleId),
          path: `${moduleId}/${checksum}`
        })
        .once()
        .reply(200, {
          success: true,
          data: 'Test'
        });
        */

      graphql(
        schema,
        'mutation {testRuntimeHooks (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testRuntimeHooks: { result: 'ResultTestString' } },
          });
          expect(stub.called).to.equal(true);
          expect(stub.args.length).to.equal(2);
          // Check premutation handler
          const [handler, payload, preContext] = stub.args[0];
          expect(handler).to.equal('src/preMutation.js');
          expect(payload).to.deep.equal({
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testRuntimeHooks.BEFORE',
          });
          expect(preContext).to.deep.equal(
            context.getRuntimeExecutionContext(moduleId)
          );

          // Check postmutation handler
          const [handlerPost, payloadPost, postContext] = stub.args[1];
          expect(handlerPost).to.equal('src/postMutation.js');
          expect(payloadPost).to.deep.equal({
            args: {
              input: { stringInput: 'TestString' },
            },
            data: { result: 'ResultTestString' },
            event: 'mutation.testRuntimeHooks.AFTER',
          });
          expect(postContext).to.deep.equal(
            context.getRuntimeExecutionContext(moduleId)
          );
          done();
        })
        .catch(done);
    });

    it('cancels mutation with failing pre mutation hooks in runtime handler', (done) => {
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      // Set defaultRuntime
      context._defaultRuntime = new UnconfiguredRuntime();
      const stub = sinon
        .stub(context._defaultRuntime, 'execute' as any)
        .resolves({
          success: false,
          data: 'Test',
          message: 'Custom premutation hook error',
        });

      graphql(
        schema,
        'mutation {testRuntimeHooks (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testRuntimeHooks: null },
            errors: [
              {
                locations: [
                  {
                    column: 11,
                    line: 1,
                  },
                ],
                message: 'Custom premutation hook error',
                path: ['testRuntimeHooks'],
              },
            ],
          });
          expect(stub.called).to.equal(true);
          done();
        })
        .catch(done);
    });

    it('triggers a post mutation hook with native code', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.postNativeMutation,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(
        schema,
        'mutation {testNativeHooks (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testNativeHooks: { result: 'ResultTestString' } },
          });
          const expectedPayload = {
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testNativeHooks.AFTER',
            data: { result: 'ResultTestString' },
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('triggers a pre mutation hook with native code', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.preNativeMutation,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(
        schema,
        'mutation {testNativeHooks (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testNativeHooks: { result: 'ResultTestString' } },
          });
          const expectedPayload = {
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testNativeHooks.BEFORE',
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('does not execute mutation when PreMutationHook fails', (done) => {
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();
      const postMutation = nock('http://dummyhost')
        .post('/post')
        .reply(200, {});
      const preMutation = nock('http://dummyhost')
        .post('/pre')
        .replyWithError('hook failed');

      graphql(
        schema,
        'mutation {testMutation (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result.errors[0].path).to.deep.equal(['testMutation']);
          expect(postMutation.isDone()).to.equal(false);
          preMutation.done();
          done();
        })
        .catch(done);
    });

    it('returns a response for mutation when PostMutationHook fails', (done) => {
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();
      nock('http://dummyhost')
        .post('/post', {
          data: {
            result: 'ResultTestString',
          },
          module: {
            mutation: 'testMutation',
            project: null,
          },
        })
        .replyWithError('hook failed');
      const preMutation = nock('http://dummyhost').post('/pre').reply(200, {});

      graphql(
        schema,
        'mutation {testMutation (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: { testMutation: { result: 'ResultTestString' } },
          });
          // postMutation.done();
          preMutation.done();
          done();
        })
        .catch(done);
    });

    it('executes custom resolvers', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.customResolver,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(schema, '{hello}', null, context)
        .then((result) => {
          expect(result).to.deep.equal({ data: { hello: 'world' } });
          const expectedPayload = {
            args: {},
            event: 'resolve.Query.hello',
            source: null,
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          spy.restore();
          done();
        })
        .catch(done);
    });

    it('passes args to custom resolvers', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.customResolver,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(schema, '{hello(name: "max")}', null, context)
        .then((result) => {
          expect(result).to.deep.equal({ data: { hello: 'max' } });
          const expectedPayload = {
            args: {
              name: 'max',
            },
            event: 'resolve.Query.hello',
            source: null,
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('executes BEFORE mutation listener that returns data', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.preMutationReturningData,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(
        schema,
        'mutation {testRuntimeHooksReturningData (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          expect(result).to.deep.equal({
            data: {
              testRuntimeHooksReturningData: {
                result: 'ResultTestString changed',
              },
            },
          });
          const expectedPayload = {
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testRuntimeHooksReturningData.BEFORE',
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('executes BEFORE mutation listener that returns invalid data', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.preMutationReturningInvalidData,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(
        schema,
        'mutation {testRuntimeHooksReturningInvalidData (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          const expectedResult = {
            data: { testRuntimeHooksReturningInvalidData: null },
            errors: [
              {
                locations: [{ column: 11, line: 1 }],
                message:
                  'Invalid args returned from listener mutation.testRuntimeHooksReturningInvalidData.BEFORE: \nVariable "$input" got invalid value null at "input.stringInput"; Expected non-nullable type "String!" not to be null.',
                path: ['testRuntimeHooksReturningInvalidData'],
              },
            ],
          };
          expect(result).to.deep.equal(expectedResult);
          const expectedPayload = {
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testRuntimeHooksReturningInvalidData.BEFORE',
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('executes BEFORE mutation listener that throws error', (done) => {
      const testModule = schemaConfigs.fullSchemaConfig.find(
        (module) => module.id === 'test-app'
      );
      if (!testModule) {
        throw new Error('Testapp not found in config');
      }

      const spy = sinon.spy(
        testModule.functions.preMutationReturningDataWithError,
        'execute' as any
      );
      const context = createContextMock(schemaConfigs.fullSchemaConfig);
      const schema = context.schemaBuilder.getSchema();

      graphql(
        schema,
        'mutation {testRuntimeHooksThrowingError (input: {stringInput: "TestString"}){result}}',
        null,
        context
      )
        .then((result) => {
          const expectedResult = {
            data: { testRuntimeHooksThrowingError: null },
            errors: [
              {
                locations: [{ column: 11, line: 1 }],
                message: 'Input error',
                path: ['testRuntimeHooksThrowingError'],
              },
            ],
          };
          expect(result).to.deep.equal(expectedResult);
          const expectedPayload = {
            args: {
              input: { stringInput: 'TestString' },
            },
            event: 'mutation.testRuntimeHooksThrowingError.BEFORE',
          };
          expect(spy.firstCall.args[0]).to.deep.equal(expectedPayload);
          expect(spy.firstCall.args[1]).to.equal(context);
          spy.should.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('enhances module configs via moduleEnhancers', () => {
      const builder = new SchemaBuilder({
        modules: [
          ...schemaConfigs.fullSchemaConfig,
          {
            id: uuid.v1(),
            version: '0.0.1',
            kind: ModuleKind.DYNAMIC,
            types: [],
            listeners: [],
            admin: {
              base: {
                name: '',
                description: '',
                types: {},
                pages: [],
                mutations: {},
              },
            },
            enhanceModule(moduleConfig, moduleConfigs) {
              expect(moduleConfigs[0]).to.equal(
                schemaConfigs.fullSchemaConfig[0]
              );
              expect(moduleConfigs.length).to.equal(
                schemaConfigs.fullSchemaConfig.length + 1
              );
              return {
                ...moduleConfig,
                types: [
                  ...moduleConfig.types,
                  {
                    kind: TypeKind.UNION,
                    name: 'EnhancedUnion',
                    description: 'Test union description',
                    typeNames: ['TestType', 'ReferencedType'],
                    resolveType: () => {
                      throw new Error('test');
                    },
                  },
                ],
              };
            },
          },
        ],
      });

      const schema = builder.getSchema();
      const types = schema.getTypeMap();
      const type = assertUnionType(types.EnhancedUnion);
      expect(type.getTypes().length).to.equal(2);
      expect(type.getTypes()[0].name).to.equal('TestType');
      expect(type.getTypes()[1].name).to.equal('ReferencedType');
    });
  });

  describe('query complexity', () => {
    it('adds create mutation query complexity', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const complexity = getComplexity({
        estimators,
        schema,
        query: parse(`
          mutation {
            createFieldAccessTestNode(input: {firstName: "Voldemort"}) {
              node {
                id
              }
            }
          }
        `),
        variables: {},
      });
      expect(complexity).to.equal(11);
    });

    it('adds delete mutation query complexity', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const complexity = getComplexity({
        estimators,
        schema,
        query: parse(`
          mutation {
            deleteFieldAccessTestNode(input: {id: "xaz123"}) {
              node {
                id
              }
            }
          }
        `),
        variables: {},
      });
      expect(complexity).to.equal(11);
    });

    it('adds update mutation query complexity', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const complexity = getComplexity({
        estimators,
        schema,
        query: parse(`
          mutation {
            updateFieldAccessTestNode(input: {id: "xaz123"}) {
              node {
                id
              }
            }
          }
        `),
        variables: {},
      });
      expect(complexity).to.equal(11);
    });

    it('adds publish mutation query complexity', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const complexity = getComplexity({
        estimators,
        schema,
        query: parse(`
          mutation {
            publishTestContentNode(input: {ids: ["id1", "id2"], status: "PUBLISHED"}) {
              nodes {
                id
                createdBy {id}
              }
            }
          }
        `),
        variables: {},
      });
      expect(complexity).to.equal(14);
    });

    it('adds unpublish mutation query complexity', () => {
      const builder = new SchemaBuilder({
        modules: schemaConfigs.fullSchemaConfig,
      });

      const schema = builder.getSchema();
      const complexity = getComplexity({
        estimators,
        schema,
        query: parse(`
          mutation {
            unpublishTestContentNode(input: {ids: ["id1", "id2"]}) {
              nodes {
                id
                createdBy {id}
              }
            }
          }
        `),
        variables: {},
      });
      expect(complexity).to.equal(14);
    });
  });
});
