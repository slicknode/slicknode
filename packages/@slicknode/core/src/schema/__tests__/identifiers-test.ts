/**
 * Created by Ivo Meißner on 06.07.17.
 *
 */

import { getMutationName } from '../identifiers';
import { expect } from 'chai';
import { describe, it } from 'mocha';

describe('getMutationName', () => {
  it('generates create mutation name', () => {
    expect(getMutationName('Namespace_TypeName', 'CREATE')).to.equal(
      'Namespace_createTypeName'
    );
    expect(getMutationName('Secondary_Namespace_TypeName', 'CREATE')).to.equal(
      'Secondary_Namespace_createTypeName'
    );
    expect(getMutationName('FancyNamespace_TypeName', 'CREATE')).to.equal(
      'FancyNamespace_createTypeName'
    );
    expect(getMutationName('TypeName', 'CREATE')).to.equal('createTypeName');
  });

  it('generates update mutation name', () => {
    expect(getMutationName('Namespace_TypeName', 'UPDATE')).to.equal(
      'Namespace_updateTypeName'
    );
    expect(getMutationName('Secondary_Namespace_TypeName', 'UPDATE')).to.equal(
      'Secondary_Namespace_updateTypeName'
    );
    expect(getMutationName('FancyNamespace_TypeName', 'UPDATE')).to.equal(
      'FancyNamespace_updateTypeName'
    );
    expect(getMutationName('TypeName', 'UPDATE')).to.equal('updateTypeName');
  });

  it('generates delete mutation name', () => {
    expect(getMutationName('Namespace_TypeName', 'DELETE')).to.equal(
      'Namespace_deleteTypeName'
    );
    expect(getMutationName('Secondary_Namespace_TypeName', 'DELETE')).to.equal(
      'Secondary_Namespace_deleteTypeName'
    );
    expect(getMutationName('FancyNamespace_TypeName', 'DELETE')).to.equal(
      'FancyNamespace_deleteTypeName'
    );
    expect(getMutationName('TypeName', 'DELETE')).to.equal('deleteTypeName');
  });

  it('throws exception for invalid verb', () => {
    expect(getMutationName.bind(this, 'typename', 'InvalidVerb')).to.throw(
      'Invalid mutation type provided'
    );
  });
});
