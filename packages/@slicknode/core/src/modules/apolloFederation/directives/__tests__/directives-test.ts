/**
 * Created by Ivo Meißner on 2019-07-26
 *
 */

import chai, { expect } from 'chai';
import { it, describe } from 'mocha';
import { createContextMock } from '../../../../test/utils';
import { tenantModules } from '../../../index';
import chaiAsPromised from 'chai-as-promised';
import { printSchema } from 'graphql';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

describe('ApolloFederation directives', () => {
  it('adds @key directive to schema', () => {
    const context = createContextMock([...tenantModules]);
    const schema = context.schemaBuilder.getSchema();
    const schemaDocument = printSchema(schema);
    expect(schemaDocument).to.include(
      'directive @key(fields: _FieldSet!) on OBJECT | INTERFACE'
    );
  });

  it('adds @external directive to schema', () => {
    const context = createContextMock([...tenantModules]);
    const schema = context.schemaBuilder.getSchema();
    const schemaDocument = printSchema(schema);
    expect(schemaDocument).to.include(
      'directive @external on FIELD_DEFINITION'
    );
  });

  it('adds @requires directive to schema', () => {
    const context = createContextMock([...tenantModules]);
    const schema = context.schemaBuilder.getSchema();
    const schemaDocument = printSchema(schema);
    expect(schemaDocument).to.include(
      'directive @requires(fields: _FieldSet!) on FIELD_DEFINITION'
    );
  });

  it('adds @provides directive to schema', () => {
    const context = createContextMock([...tenantModules]);
    const schema = context.schemaBuilder.getSchema();
    const schemaDocument = printSchema(schema);
    expect(schemaDocument).to.include(
      'directive @provides(fields: _FieldSet!) on FIELD_DEFINITION'
    );
  });
});
