/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import InputElementSupported from '../InputElementSupported';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';
import { InputElementType } from '../../../../definition/InputElementType';
import _ from 'lodash';

describe('Validate InputElementSupported', () => {
  const testedTypeNames = [
    'String',
    'Int',
    'Boolean',
    'Float',
    'Decimal',
    'DateTime',
    'ID',
  ];

  const supportedCombinations = {
    [InputElementType.TEXT]: ['String'],
    [InputElementType.TEXTAREA]: ['String'],
    [InputElementType.MARKDOWN]: ['String'],
    [InputElementType.PASSWORD]: ['String'],
  };

  it('succeeds for supported input element on object type', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        supportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
            [
              createTestModule({
                namespace: 'MyNamespace',
                types: [
                  {
                    kind: TypeKind.OBJECT,
                    name: 'TestType',
                    description: 'A user of the project',
                    fields: {
                      firstName: {
                        typeName,
                        required: false,
                        inputElementType,
                      },
                    },
                    interfaces: ['Node'],
                  },
                ],
              }),
            ],
            []
          );
        });
      }
    );
  });

  it('fails for unsupported input element on object type', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        const unsupportedTypes = _.difference(testedTypeNames, supportedTypes);
        unsupportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
            [
              createTestModule({
                namespace: 'MyNamespace',
                types: [
                  {
                    kind: TypeKind.OBJECT,
                    name: 'TestType',
                    description: 'A user of the project',
                    fields: {
                      firstName: {
                        typeName,
                        required: false,
                        inputElementType,
                      },
                    },
                    interfaces: ['Node'],
                  },
                ],
              }),
            ],
            [
              `The input type "${inputElementType}" for the @input directive is not supported on fields of type "${typeName}"`,
            ]
          );
        });
      }
    );
  });

  it('fails for unsupported input element on object type via related field', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        const unsupportedTypes = _.difference(testedTypeNames, supportedTypes);
        unsupportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
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
                        required: false,
                      },
                    },
                    interfaces: ['Node'],
                  },
                ],
                typeExtensions: {
                  TestType: {
                    firstName: {
                      typeName,
                      required: false,
                      inputElementType,
                    },
                  },
                },
              }),
            ],
            [
              `The input type "${inputElementType}" for the @input directive is not supported on fields of type "${typeName}"`,
            ]
          );
        });
      }
    );
  });

  it('succeeds for supported input element on input object type', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        supportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
            [
              createTestModule({
                namespace: 'MyNamespace',
                types: [
                  {
                    kind: TypeKind.INPUT_OBJECT,
                    name: 'TestType',
                    description: 'A user of the project',
                    fields: {
                      firstName: {
                        typeName,
                        required: false,
                        inputElementType,
                      },
                    },
                  },
                ],
              }),
            ],
            []
          );
        });
      }
    );
  });

  it('fails for unsupported input element on input object type', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        const unsupportedTypes = _.difference(testedTypeNames, supportedTypes);
        unsupportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
            [
              createTestModule({
                namespace: 'MyNamespace',
                types: [
                  {
                    kind: TypeKind.INPUT_OBJECT,
                    name: 'TestType',
                    description: 'A user of the project',
                    fields: {
                      firstName: {
                        typeName,
                        required: false,
                        inputElementType,
                      },
                    },
                  },
                ],
              }),
            ],
            [
              `The input type "${inputElementType}" for the @input directive is not supported on fields of type "${typeName}"`,
            ]
          );
        });
      }
    );
  });

  it('succeeds for supported input element on interface type', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        supportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
            [
              createTestModule({
                namespace: 'MyNamespace',
                types: [
                  {
                    kind: TypeKind.INTERFACE,
                    name: 'TestType',
                    description: 'A user of the project',
                    fields: {
                      firstName: {
                        typeName,
                        required: false,
                        inputElementType,
                      },
                    },
                  },
                ],
              }),
            ],
            []
          );
        });
      }
    );
  });

  it('fails for unsupported input element on interface type', () => {
    Object.keys(supportedCombinations).forEach(
      (inputElementType: InputElementType) => {
        const supportedTypes = supportedCombinations[inputElementType];
        const unsupportedTypes = _.difference(testedTypeNames, supportedTypes);
        unsupportedTypes.forEach((typeName) => {
          expectReportsErrors(
            InputElementSupported,
            [
              createTestModule({
                namespace: 'MyNamespace',
                types: [
                  {
                    kind: TypeKind.INTERFACE,
                    name: 'TestType',
                    description: 'A user of the project',
                    fields: {
                      firstName: {
                        typeName,
                        required: false,
                        inputElementType,
                      },
                    },
                  },
                ],
              }),
            ],
            [
              `The input type "${inputElementType}" for the @input directive is not supported on fields of type "${typeName}"`,
            ]
          );
        });
      }
    );
  });
});
