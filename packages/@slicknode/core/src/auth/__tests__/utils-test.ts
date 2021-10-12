/**
 * Created by Ivo Meißner on 16.12.16.
 *
 */

import chai, { expect } from 'chai';
import { TypeKind } from '../../definition';
import { describe, it } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
import { Role } from '../type';
import { ObjectTypeConfig } from '../../definition';

chai.use(chaiAsPromised);
chai.should();

import {
  hashPassword,
  checkPassword,
  createAuthorizingResolver,
  queryFilteringRequired,
} from '../utils';

import { GraphQLResolveInfo } from 'graphql';

/* eslint-disable no-unused-expressions, max-len */

function createDummyContext(contextRoles: Array<Role>): any {
  return {
    auth: {
      roles: contextRoles,
    },
  };
}

function createDummyResolveInfo(fieldName: string): any {
  return {
    fieldName,
  };
}

describe('Auth utils:', () => {
  describe('hashPassword', () => {
    it('creates valid password hash', () => {
      const promise = new Promise((resolve) => {
        hashPassword('testpw').then((hash) => {
          expect(hash).to.be.a('string');
          expect(hash.length).to.be.above(5);
          checkPassword('testpw', hash).then((result) => {
            resolve(result);
          });
        });
      });
      return promise.should.eventually.be.true;
    });
  });
  describe('checkPassword', () => {
    it('returns true for valid password', () => {
      return checkPassword(
        'test',
        '$2a$10$hoQpKEvkFlEkMaa2ULkszuDmZr2NjANCNidMhs/KU72BnbMMqqUZ2'
      ).should.eventually.be.true;
    });
    it('returns false for invalid password', () => {
      return checkPassword(
        'invalidpassword',
        '$2a$10$hoQpKEvkFlEkMaa2ULkszuDmZr2NjANCNidMhs/KU72BnbMMqqUZ2'
      ).should.eventually.be.false;
    });
  });

  describe('createAuthorizingResolver', () => {
    it('returns the original resolver for no set permissions', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',
        fields: {
          name: fieldConfig,
        },
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      // const context = createDummyContext([ Role.STAFF ]);
      expect(testResolver).to.equal(resolve);
    });

    it('returns null if no permissions match', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',
        fields: {
          name: fieldConfig,
        },
        permissions: [{ role: Role.STAFF }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal(null);
      }
    });

    it('returns value from custom resolver for granted access', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        name: 'name',
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
        },
        permissions: [{ role: Role.STAFF }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns value from default resolver for granted access', () => {
      const fieldConfig = {
        typeName: 'String',
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
        },
        permissions: [{ role: Role.STAFF }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver(
            { name: 'wurst' },
            {},
            context,
            createDummyResolveInfo('name')
          )
        ).to.equal('wurst');
      }
    });

    it('returns value for field level granted access', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.STAFF, fields: ['name'] }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns null if not included in specified fields', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig, other: fieldConfig },
        permissions: [{ role: Role.STAFF, fields: ['other'] }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(testResolver({}, {}, context, {} as GraphQLResolveInfo)).to.be
          .null;
      }
    });

    it('can handle multiple permissions in context', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.STAFF }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns null if access on type is allowed, but field type has access restrictions', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'relatedType',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.STAFF }],
      };
      const relatedType: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.ANONYMOUS }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig, relatedType }
      );

      const context = createDummyContext([Role.STAFF]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(testResolver({}, {}, context, {} as GraphQLResolveInfo)).to.be
          .null;
      }
    });

    it('returns value for different permissions on field and related type', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'relatedType',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.STAFF }],
      };
      const relatedType: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.ANONYMOUS }],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig, relatedType }
      );

      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns value for granted access on field and no restrictions on related type', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'relatedType',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.STAFF }],
      };
      const relatedType: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig, relatedType }
      );

      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns value for granted access on field and set + matching query', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            userId: {
              node: {
                eq: $user_id
              }
            }
          }
        }`,
          },
        ],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      context.auth.uid = 123;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver(
            {
              userId: 123,
            },
            {},
            context,
            {} as GraphQLResolveInfo
          )
        ).to.equal('testval');
      }
    });

    it('returns value for granted access on field and query filter', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            userId: {
              node: {
                eq: $user_id
              }
            }
          }
        }`,
          },
        ],
      };
      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );

      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      context.auth.uid = 12;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver(
            {
              userId: 123,
            },
            {},
            context,
            {} as GraphQLResolveInfo
          )
        ).to.equal('testval');
      }
    });

    it('returns null for access via multiLevelPath and a field that is not available in all matching permissions', () => {
      const fieldConfig = {
        typeName: 'String',
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              user: {
                id: {
                  eq: $user_id
                }
              }
            }
          }
        }`,
            fields: ['name'],
          },
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              admin: {
                user: {
                  id: {
                    eq: $user_id
                  }
                }
              }
            }
          }
        }`,
            fields: ['otherField'],
          },
        ],
      };

      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );
      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      context.auth.uid = null;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal(null);
      }
    });

    it('returns value for access via multiLevelPath multiple rules with same field access', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
          otherField: fieldConfig,
        },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              user: {
                id: {
                  eq: $user_id
                }
              }
            }
          }
        }`,
            fields: ['name'],
          },
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              admin: {
                user: {
                  id: {
                    eq: $user_id
                  }
                }
              }
            }
          }
        }`,
            fields: ['otherField', 'name'],
          },
        ],
      };

      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );
      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      context.auth.uid = null;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns value for access via multiLevelPath multiple rules + multiple roles', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
          otherField: fieldConfig,
        },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              user: {
                id: {
                  eq: $user_id
                }
              }
            }
          }
        }`,
            fields: ['name'],
          },
          {
            role: Role.ANONYMOUS,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              admin: {
                user: {
                  id: {
                    eq: $user_id
                  }
                }
              }
            }
          }
        }`,
            fields: ['otherField', 'name'],
          },
        ],
      };

      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );
      const context = createDummyContext([Role.STAFF, Role.ANONYMOUS]);
      context.auth.uid = null;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns value for access via multiLevelPath multiple rules + multiple roles, only one matching', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
          otherField: fieldConfig,
        },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              user: {
                id: {
                  eq: $user_id
                }
              }
            }
          }
        }`,
            fields: ['name'],
          },
          {
            role: Role.ANONYMOUS,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              admin: {
                user: {
                  id: {
                    eq: $user_id
                  }
                }
              }
            }
          }
        }`,
            fields: ['otherField', 'name'],
          },
        ],
      };

      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );
      const context = createDummyContext([Role.STAFF]);
      context.auth.uid = null;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns value for access via multiLevelPath one field matching + one permission wildcard access', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
          otherField: fieldConfig,
        },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              user: {
                id: {
                  eq: $user_id
                }
              }
            }
          }
        }`,
          },
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              admin: {
                user: {
                  id: {
                    eq: $user_id
                  }
                }
              }
            }
          }
        }`,
            fields: ['otherField', 'name'],
          },
        ],
      };

      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );
      const context = createDummyContext([Role.STAFF]);
      context.auth.uid = null;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal('testval');
      }
    });

    it('returns null for access via multiLevelPath field not matching + one permission role not matching', () => {
      const resolve = () => 'testval';
      const fieldConfig = {
        typeName: 'String',
        resolve,
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: {
          name: fieldConfig,
          otherField: fieldConfig,
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              user: {
                id: {
                  eq: $user_id
                }
              }
            }
          }
        }`,
          },
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
          node {
            group: {
              admin: {
                user: {
                  id: {
                    eq: $user_id
                  }
                }
              }
            }
          }
        }`,
            fields: ['otherField'],
          },
        ],
      };

      const testResolver = createAuthorizingResolver(
        'name',
        fieldConfig,
        typeConfig,
        { Test: typeConfig }
      );
      const context = createDummyContext([Role.STAFF]);
      context.auth.uid = null;
      expect(testResolver).to.not.be.null;
      if (testResolver) {
        expect(
          testResolver({}, {}, context, {} as GraphQLResolveInfo)
        ).to.equal(null);
      }
    });
  });

  describe('queryFilteringRequired', () => {
    it('returns false for full access permissions', () => {
      const fieldConfig = {
        typeName: 'String',
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [{ role: Role.STAFF }],
      };
      const context = createDummyContext([Role.STAFF]);

      expect(queryFilteringRequired(typeConfig.permissions, context)).to.be
        .false;
    });

    it('returns true for access via query', () => {
      const fieldConfig = {
        typeName: 'String',
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [
          {
            role: Role.STAFF,
            query: `query FilterQuery($user_id: ID!) {
          node(filter: {name: "test})
        }`,
          },
        ],
      };
      const context = createDummyContext([Role.STAFF]);

      expect(queryFilteringRequired(typeConfig.permissions, context)).to.be
        .true;
    });

    it('returns false for access via query + one full access via other role', () => {
      const fieldConfig = {
        typeName: 'String',
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [
          {
            role: Role.STAFF,
            query: `query FilterQuery($user_id: ID!) {
          node(filter: {name: "test})
        }`,
          },
          { role: Role.ANONYMOUS },
        ],
      };
      const context = createDummyContext([Role.ANONYMOUS]);

      expect(queryFilteringRequired(typeConfig.permissions, context)).to.be
        .false;
    });

    it('returns false for no permissions', () => {
      const context = createDummyContext([Role.ANONYMOUS]);

      expect(queryFilteringRequired(null, context)).to.be.false;
    });

    it('returns true for an empty array of permissions on type', () => {
      const fieldConfig = {
        typeName: 'String',
      };
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'Test',

        fields: { name: fieldConfig },
        permissions: [],
      };
      const context = createDummyContext([Role.ANONYMOUS]);

      expect(queryFilteringRequired(typeConfig.permissions, context)).to.be
        .true;
    });
  });
});
