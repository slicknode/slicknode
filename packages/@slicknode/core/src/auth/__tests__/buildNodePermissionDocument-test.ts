/**
 * Created by Ivo Meißner on 13.08.17.
 *
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { ObjectTypeConfig, TypeKind } from '../../definition';

import buildNodePermissionDocument from '../buildNodePermissionDocument';
import { Role } from '../type';

describe('Permission document builder', () => {
  it('converts simple permission to query', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        field: { typeName: 'Boolean' },
      },
      permissions: [{ role: Role.ADMIN }],
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1 {
  scope(role: ADMIN, operations: [READ])
}
`);
  });

  it('adds fields to scope', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        field: { typeName: 'Boolean' },
        field2: { typeName: 'Boolean' },
      },
      permissions: [
        {
          role: Role.ADMIN,
          fields: ['field', 'field2'],
        },
      ],
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1 {
  scope(role: ADMIN, operations: [READ], fields: ["field", "field2"])
}
`);
  });

  it('adds PUBLISH permissions', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        field: { typeName: 'Boolean' },
        field2: { typeName: 'Boolean' },
      },
      permissions: [],
      mutations: {
        publish: [
          {
            role: Role.ADMIN,
          },
        ],
      },
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1 {
  scope(role: ADMIN, operations: [PUBLISH])
}
`);
  });

  it('adds UNPUBLISH permissions', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        field: { typeName: 'Boolean' },
        field2: { typeName: 'Boolean' },
      },
      permissions: [],
      mutations: {
        unpublish: [
          {
            role: Role.ADMIN,
          },
        ],
      },
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1 {
  scope(role: ADMIN, operations: [UNPUBLISH])
}
`);
  });

  it('combines query and scope', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        field: { typeName: 'Boolean' },
      },
      permissions: [
        {
          role: Role.ADMIN,
          query: `query {
        node(filter: {field: true})
      }`,
        },
      ],
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1 {
  scope(role: ADMIN, operations: [READ])
  node(filter: { field: true })
}
`);
  });

  it('adds variable definitions', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        id: { typeName: 'ID' },
        field: { typeName: 'Boolean' },
      },
      permissions: [
        {
          role: Role.ADMIN,
          query: `query TestQuery($node_id: ID!) {
        node(filter: {id: {eq: $node_id}})
      }`,
        },
      ],
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1($node_id: ID!) {
  scope(role: ADMIN, operations: [READ])
  node(filter: { id: { eq: $node_id } })
}
`);
  });

  it('combines multiple permissions with the scope on one query', () => {
    const permission = {
      role: Role.ADMIN,
      query: `query TestQuery($node_id: ID!) {
        node(filter: {id: {eq: $node_id}})
      }`,
    };
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        id: { typeName: 'ID' },
        field: { typeName: 'Boolean' },
      },
      permissions: [permission],
      mutations: {
        create: [permission],
        delete: [permission],
        update: [permission],
      },
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1($node_id: ID!) {
  scope(role: ADMIN, operations: [CREATE, DELETE, UPDATE, READ])
  node(filter: { id: { eq: $node_id } })
}
`);
  });

  it('creates multiple queries for different scopes', () => {
    const permission = {
      role: Role.ADMIN,
      query: `query TestQuery($node_id: ID!) {
        node(filter: {id: {eq: $node_id}})
      }`,
    };
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        id: { typeName: 'ID' },
        field: { typeName: 'Boolean' },
      },
      permissions: [permission],
      mutations: {
        create: [permission],
        delete: [
          {
            ...permission,
            role: Role.STAFF,
          },
          {
            role: permission.role,
          },
        ],
        update: [permission],
      },
    };

    expect(buildNodePermissionDocument(type)).to
      .equal(`query TestTypePermission1 {
  scope(role: ADMIN, operations: [DELETE])
}


query TestTypePermission2($node_id: ID!) {
  scope(role: ADMIN, operations: [CREATE, UPDATE, READ])
  node(filter: { id: { eq: $node_id } })
}


query TestTypePermission3($node_id: ID!) {
  scope(role: STAFF, operations: [DELETE])
  node(filter: { id: { eq: $node_id } })
}
`);
  });

  it('creates empty document for no permissions', () => {
    const type: ObjectTypeConfig = {
      kind: TypeKind.OBJECT,
      name: 'TestType',
      fields: {
        id: { typeName: 'ID' },
        field: { typeName: 'Boolean' },
      },
      permissions: [],
    };

    expect(buildNodePermissionDocument(type)).to.equal('');
  });
});
