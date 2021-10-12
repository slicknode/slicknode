/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ValidFieldName from '../ValidFieldName';
import { expectReportsErrors, createTestModule } from './utils';
import { ModuleKind, TypeKind } from '../../../../definition';
import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Validate ValidFieldName', () => {
  it('fails for invalid field names', () => {
    const invalidFieldNames = ['0test', '_test', 'snake_case', 'UPPERCASE'];
    invalidFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  [name]: {
                    typeName: 'String',
                  },
                },
              },
            ],
          }),
        ],
        [
          `Invalid field name "${name}". Field names have to start with a lowercase letter and can only contain alphanumeric characters`,
        ]
      );
    });
  });

  it('succeeds for valid field names', () => {
    const validFieldNames = [
      'field',
      'validName',
      'valid09Name9',
      'validFieldNameHey',
      'otherValidName0',
    ];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  [name]: {
                    typeName: 'String',
                  },
                },
              },
            ],
          }),
        ],
        []
      );
    });
  });

  it('ignores invalid field names in NATIVE modules', () => {
    const validFieldNames = ['_service'];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            kind: ModuleKind.NATIVE,
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  [name]: {
                    typeName: 'String',
                  },
                },
              },
            ],
          }),
        ],
        []
      );
    });
  });

  it('succeeds for valid field names on related fields in same app', () => {
    const validFieldNames = [
      'field',
      'validName',
      'valid09Name9',
      'validFieldNameHey',
      'otherValidName0',
    ];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
            typeExtensions: {
              TestType: {
                [name]: {
                  typeName: 'String',
                },
              },
            },
          }),
        ],
        []
      );
    });
  });

  it('succeeds for valid field names on related fields in same app', () => {
    const validFieldNames = [
      'field',
      'validName',
      'valid09Name9',
      'validFieldNameHey',
      'otherValidName0',
    ];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
            typeExtensions: {
              TestType: {
                [name]: {
                  typeName: 'String',
                },
              },
            },
          }),
        ],
        []
      );
    });
  });

  it('fails for valid field names without namespace in foreign app', () => {
    const validFieldNames = [
      'field',
      'validName',
      'valid09Name9',
      'validFieldNameHey',
      'otherValidName0',
    ];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
            typeExtensions: {
              ReferencedType: {
                [name]: {
                  typeName: 'String',
                },
              },
            },
          }),
          createTestModule({
            namespace: 'OtherNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'ReferencedType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
          }),
        ],
        [
          `Invalid field name "${name}". A field in a type extension of another app has to start with the namespace "MyNamespace_"`,
        ]
      );
    });
  });

  it('succeeds for valid field names on related fields in foreign app', () => {
    const validFieldNames = [
      'field',
      'validName',
      'valid09Name9',
      'validFieldNameHey',
      'otherValidName0',
    ];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            typeExtensions: {
              ReferencedType: {
                ['MyNamespace_' + name]: {
                  typeName: 'String',
                },
              },
            },
          }),
          createTestModule({
            namespace: 'OtherNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'ReferencedType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
          }),
        ],
        []
      );
    });
  });

  it('fails for valid field names on related fields with wrong namespace', () => {
    const validFieldNames = [
      'field',
      'validName',
      'valid09Name9',
      'validFieldNameHey',
      'otherValidName0',
    ];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
            typeExtensions: {
              ReferencedType: {
                ['InvalidNamespace_' + name]: {
                  typeName: 'String',
                },
              },
            },
          }),
          createTestModule({
            namespace: 'OtherNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'ReferencedType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
          }),
        ],
        [
          `Invalid field name "InvalidNamespace_${name}". A field in a type extension of another app has to start with the namespace "MyNamespace_"`,
        ]
      );
    });
  });

  it('fails for invalid field names on related fields in foreign app', () => {
    const validFieldNames = ['0test', '_test', 'snake_case', 'UPPERCASE'];
    validFieldNames.forEach((name) => {
      expectReportsErrors(
        ValidFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
            typeExtensions: {
              ReferencedType: {
                ['MyNamespace_' + name]: {
                  typeName: 'String',
                },
              },
            },
          }),
          createTestModule({
            namespace: 'OtherNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'ReferencedType',
                fields: {
                  id: {
                    typeName: 'ID',
                  },
                },
              },
            ],
          }),
        ],
        [
          `Invalid field name "MyNamespace_${name}". Field names have to start with a lowercase letter and can only contain alphanumeric characters`,
        ]
      );
    });
  });
});
