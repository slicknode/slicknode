/**
 * Created by Ivo Meißner on 12.01.18.
 *
 */

import PermissionQueryValid from '../PermissionQueryValid';
import { expectReportsErrors, createTestModule } from './utils';
import { ObjectTypeConfig, TypeKind } from '../../../../definition';
import { baseModules } from '../../../../modules';
import { HANDLER_POSTGRES } from '../../../../schema/handler';
import { Role } from '../../../../auth';

describe('Validate PermissionQueryValid', () => {
  const testTypeConfig: ObjectTypeConfig = {
    kind: TypeKind.OBJECT,
    name: 'TestType',
    handler: {
      kind: HANDLER_POSTGRES,
    },
    description: 'A user of the project',
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      bool: {
        typeName: 'Boolean',
      },
      float: {
        typeName: 'Float',
      },
      string: {
        typeName: 'String',
      },
    },
    interfaces: ['Node'],
  };

  it('fails for syntax errors in permission queries', () => {
    const invalidQueries = [
      '0test',
      '{ node(filter: {bool: true})',
      '...',
      '&',
    ];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
                permissions: [{ role: Role.STAFF, query }],
              },
            ],
          }),
        ],
        ['Invalid permission query for type TestType:']
      );
    });
  });

  it('fails for invalid fields in read permission queries', () => {
    const invalidQueries = ['query {node(filter:{invalidField: false})}'];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
                permissions: [{ role: Role.STAFF, query }],
              },
            ],
          }),
        ],
        [
          'Invalid permission query for type TestType: Field "invalidField" is not defined by type "_TestTypeFilter"',
        ]
      );
    });
  });

  it('fails for invalid fields in create permission queries', () => {
    const invalidQueries = ['query {node(filter:{invalidField: false})}'];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
                mutations: {
                  create: [{ role: Role.STAFF, query }],
                },
              },
            ],
          }),
        ],
        [
          'Invalid permission query for type TestType: Field "invalidField" is not defined by type "_TestTypeFilter"',
        ]
      );
    });
  });

  it('fails for invalid fields in update permission queries', () => {
    const invalidQueries = ['query {node(filter:{invalidField: false})}'];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
                mutations: {
                  update: [{ role: Role.STAFF, query }],
                },
              },
            ],
          }),
        ],
        [
          'Invalid permission query for type TestType: Field "invalidField" is not defined by type "_TestTypeFilter"',
        ]
      );
    });
  });

  it('fails for invalid fields in delete permission queries', () => {
    const invalidQueries = ['query {node(filter:{invalidField: false})}'];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
                mutations: {
                  delete: [{ role: Role.STAFF, query }],
                },
              },
            ],
          }),
        ],
        [
          'Invalid permission query for type TestType: Field "invalidField" is not defined by type "_TestTypeFilter"',
        ]
      );
    });
  });

  it('succeeds for valid permission queries', () => {
    const invalidQueries = [
      'query {node(filter:{bool: false, string: {eq: "test"}, float: {gte: -2.43}})}',
    ];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
                mutations: {
                  delete: [{ role: Role.STAFF, query }],
                  update: [{ role: Role.STAFF, query }],
                  create: [{ role: Role.STAFF, query }],
                },
                permissions: [{ role: Role.STAFF, query }],
              },
            ],
          }),
        ],
        []
      );
    });
  });

  it('succeeds for valid permission queries in separate module', () => {
    const invalidQueries = [
      'query {node(filter:{bool: false, string: {eq: "test"}, float: {gte: -2.43}})}',
    ];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
              },
            ],
          }),
          createTestModule({
            namespace: 'MyNamespace2',
            typePermissions: {
              [testTypeConfig.name]: {
                ...testTypeConfig,
                mutations: {
                  delete: [{ role: Role.STAFF, query }],
                  update: [{ role: Role.STAFF, query }],
                  create: [{ role: Role.STAFF, query }],
                },
                permissions: [{ role: Role.STAFF, query }],
              },
            },
          }),
        ],
        []
      );
    });
  });

  it('fails for invalid fields in separate module query', () => {
    const invalidQueries = [
      'query {node(filter:{bool: false, invalidField: {eq: "test"}, float: {gte: -2.43}})}',
    ];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
              },
            ],
          }),
          createTestModule({
            namespace: 'MyNamespace2',
            typePermissions: {
              [testTypeConfig.name]: {
                ...testTypeConfig,
                mutations: {
                  delete: [{ role: Role.STAFF, query }],
                },
              },
            },
          }),
        ],
        [
          'Invalid permission query for type TestType: Field "invalidField" is not defined by type "_TestTypeFilter"',
        ]
      );
    });
  });

  it('fails for syntax errors in separate module query', () => {
    const invalidQueries = [
      'error query {node(filter:{bool: false, float: {gte: -2.43}})}',
    ];
    invalidQueries.forEach((query) => {
      expectReportsErrors(
        PermissionQueryValid,
        [
          ...baseModules,
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                ...testTypeConfig,
              },
            ],
          }),
          createTestModule({
            namespace: 'MyNamespace2',
            typePermissions: {
              [testTypeConfig.name]: {
                ...testTypeConfig,
                mutations: {
                  delete: [{ role: Role.STAFF, query }],
                },
              },
            },
          }),
        ],
        [
          'Invalid permission query for type TestType: Syntax Error: Unexpected Name "error"',
        ]
      );
    });
  });
});
