/**
 * Created by Ivo Meißner on 21.09.18
 *
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import mergeObjectTypePermissionSets from '../mergeObjectTypePermissionSets';
import { Role } from '../type';

describe('mergeObjectTypePermissionSets', () => {
  it('merges two full permission sets', () => {
    const target = {
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ANONYMOUS }],
        create: [{ role: Role.STAFF }],
        update: [{ role: Role.RUNTIME }],
      },
    };

    const permissions = {
      permissions: [{ role: Role.STAFF }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
        create: [{ role: Role.ANONYMOUS }],
        update: [{ role: Role.FULLY_AUTHENTICATED }],
      },
    };

    const result = mergeObjectTypePermissionSets(target, permissions);
    expect(result).to.deep.equal({
      permissions: [{ role: Role.ADMIN }, { role: Role.STAFF }],
      mutations: {
        delete: [{ role: Role.ANONYMOUS }, { role: Role.ADMIN }],
        create: [{ role: Role.STAFF }, { role: Role.ANONYMOUS }],
        update: [{ role: Role.RUNTIME }, { role: Role.FULLY_AUTHENTICATED }],
      },
    });
  });

  it('returns original object if no permissions are merged', () => {
    const target = {
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ANONYMOUS }],
        create: [{ role: Role.STAFF }],
        update: [{ role: Role.RUNTIME }],
      },
    };

    const permissions = {};

    const result = mergeObjectTypePermissionSets(target, permissions);
    expect(result).to.deep.equal({
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ANONYMOUS }],
        create: [{ role: Role.STAFF }],
        update: [{ role: Role.RUNTIME }],
      },
    });
    expect(result).to.equal(target);
  });

  it('keeps properties on target', () => {
    const target = {
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ANONYMOUS }],
        create: [{ role: Role.STAFF }],
        update: [{ role: Role.RUNTIME }],
      },
    };

    const permissions = {
      permissions: [{ role: Role.STAFF }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
        create: [{ role: Role.ANONYMOUS }],
        update: [{ role: Role.FULLY_AUTHENTICATED }],
      },
    };

    const result = mergeObjectTypePermissionSets(target, permissions);
    expect(result).to.deep.equal({
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }, { role: Role.STAFF }],
      mutations: {
        delete: [{ role: Role.ANONYMOUS }, { role: Role.ADMIN }],
        create: [{ role: Role.STAFF }, { role: Role.ANONYMOUS }],
        update: [{ role: Role.RUNTIME }, { role: Role.FULLY_AUTHENTICATED }],
      },
    });
    expect(result).to.not.equal(target);
  });

  it('adds mutation property if not existent', () => {
    const target = {
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }],
    };

    const permissions = {
      permissions: [{ role: Role.STAFF }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
        create: [{ role: Role.ANONYMOUS }],
        update: [{ role: Role.FULLY_AUTHENTICATED }],
      },
    };

    const result = mergeObjectTypePermissionSets(target, permissions);
    expect(result).to.deep.equal({
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }, { role: Role.STAFF }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
        create: [{ role: Role.ANONYMOUS }],
        update: [{ role: Role.FULLY_AUTHENTICATED }],
      },
    });
    expect(result).to.not.equal(target);
  });

  it('adds permissions property if not existent', () => {
    const target = {
      otherProperty: 'test',
    };

    const permissions = {
      permissions: [{ role: Role.STAFF }],
    };

    const result = mergeObjectTypePermissionSets(target as any, permissions);
    expect(result).to.deep.equal({
      otherProperty: 'test',
      permissions: [{ role: Role.STAFF }],
    });
    expect(result).to.not.equal(target);
  });

  it('adds specific mutation with new permissions', () => {
    const target = {
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
      },
    };

    const permissions = {
      mutations: {
        create: [{ role: Role.ANONYMOUS }],
      },
    };

    const result = mergeObjectTypePermissionSets(target, permissions);
    expect(result).to.deep.equal({
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
        create: [{ role: Role.ANONYMOUS }],
      },
    });
    expect(result).to.not.equal(target);
  });

  it('adds publish, unpublish mutations', () => {
    const target = {
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
      },
    };

    const permissions = {
      mutations: {
        publish: [{ role: Role.ANONYMOUS }],
        unpublish: [{ role: Role.ANONYMOUS }],
      },
    };

    const result = mergeObjectTypePermissionSets(target, permissions);
    expect(result).to.deep.equal({
      otherProperty: 'test',
      permissions: [{ role: Role.ADMIN }],
      mutations: {
        delete: [{ role: Role.ADMIN }],
        publish: [{ role: Role.ANONYMOUS }],
        unpublish: [{ role: Role.ANONYMOUS }],
      },
    });
    expect(result).to.not.equal(target);
  });
});
