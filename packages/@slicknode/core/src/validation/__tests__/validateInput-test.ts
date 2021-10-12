/**
 * Created by Ivo Meißner on 15.12.16.
 *
 */

import { expect } from 'chai';
import { describe, it, before } from 'mocha';
// import type { Validator } from '../type';
import { validateInput } from '../index';
// import _ from 'lodash';
import { ValidationError } from '../../errors';
import { FieldConfigMap } from '../../definition';
import { createContextMock } from '../../test/utils';
import validateInputTestSchema from './validateInputTestSchema';

describe('Input Validation test:', () => {
  let context;

  before((done) => {
    context = createContextMock(validateInputTestSchema);
    done();
  });

  it('fails with invalid input', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: 'invalidemail',
        },
        context
      );
    }).to.throw(ValidationError);
  });

  it('succeeds with valid input', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: 'invalidemail@mymail.com',
        },
        context
      );
    }).to.not.throw(ValidationError);
  });

  it('validates NULL value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: null,
        },
        context
      );
    }).to.throw(ValidationError);
  });

  it('ignores validation if value is not required and missing in input', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: false,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(fields, {}, context);
    }).to.not.throw(ValidationError);
  });

  it('fails for non required but invalid input', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: false,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: 'testinvalid',
        },
        context
      );
    }).to.throw(ValidationError);
  });

  it('succeeds for non required and null value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: false,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: null,
        },
        context
      );
    }).to.not.throw(ValidationError);
  });

  it('returns custom message', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: false,
        validators: [
          {
            type: 'email',
            message: 'custom error message',
          },
        ],
      },
    };

    let exception: any = {};
    try {
      validateInput(
        fields,
        {
          email: 'invalidemail',
        },
        context
      );
    } catch (e) {
      exception = e;
    }
    expect(exception).to.be.a('Error');
    // eslint-disable-next-line
    expect(exception.argumentErrors.email).to.deep.equal([
      { message: 'custom error message' },
    ]);
  });

  it('succeeds for list value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: [],
        },
        context
      );
    }).to.not.throw(ValidationError);

    expect(() => {
      validateInput(
        fields,
        {
          email: ['test@email.com', 'test1@gmail.com'],
        },
        context
      );
    }).to.not.throw(ValidationError);
  });

  it('succeeds for 2 dimensional list value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: [true, true],
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: [[]],
        },
        context
      );
    }).to.not.throw(ValidationError);

    expect(() => {
      validateInput(
        fields,
        {
          email: [['test@email.com', 'test1@gmail.com']],
        },
        context
      );
    }).to.not.throw(ValidationError);
  });

  it('detects null values in non null 2 dimensional list', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: [true, true],
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    try {
      validateInput(
        fields,
        {
          email: [[null]],
        },
        context
      );
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.argumentErrors).to.deep.equal({
        email: [
          {
            message: 'Please provide a value for the field',
            path: [0, 0],
          },
        ],
      });
    }
  });

  it('detects null values in non null 3 dimensional list', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: [false, true, true],
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    const validEmails = [
      [null, [['email@example.com']]],
      [[['email@example.com']], null, [['email@example.com']]],
      [[[]]],
      [[]],
      [],
    ];

    for (const value of validEmails) {
      expect(() => {
        try {
          validateInput(
            fields,
            {
              email: value,
            },
            context
          );
        } catch (e) {
          console.log('Error', value, e.argumentErrors.email);
        }
      }).to.not.throw(ValidationError);
    }

    const invalidLists = [
      { value: [[null]], path: [0, 0] },
      { value: [[[]], [['test@example.com']], null, [[], null]], path: [3, 1] },
      {
        value: [[[]], [['test@example.com', null]], null, [[], []]],
        path: [1, 0, 1],
      },
    ];

    for (const invalidValue of invalidLists) {
      try {
        validateInput(
          fields,
          {
            email: invalidValue.value,
          },
          context
        );
        throw new Error('Does not fail');
      } catch (e) {
        expect(e.argumentErrors).to.deep.equal({
          email: [
            {
              message: 'Please provide a value for the field',
              path: invalidValue.path,
            },
          ],
        });
      }
    }
  });

  it('throws error for list fields with invalid value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: [],
        },
        context
      );
    }).to.not.throw(ValidationError);

    expect(() => {
      validateInput(
        fields,
        {
          email: ['test@email.com', 'invalidemail'],
        },
        context
      );
    }).to.throw(ValidationError);
  });

  it('fails for required list field with null value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: null,
        },
        context
      );
    }).to.throw(ValidationError);
  });

  it('fails for required list field with array that contains null value', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        list: true,
        validators: [
          {
            type: 'email',
          },
        ],
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          email: [null],
        },
        context
      );
    }).to.throw(ValidationError);
  });

  it('validates for child object input', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      validateInput(
        fields,
        {
          test: {
            requiredEmail: 'validemal@email.com',
            requiredEmailList: ['validemal1@email.com'],
          },
        },
        context
      );
    }).to.not.throw(ValidationError);
  });

  it('fails for invalid value in child object for required single value', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              requiredEmail: 'validemalemail.com',
              requiredEmailList: ['validemal1@email.com'],
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['requiredEmail'],
            message:
              'validation.validators.email.message:Please provide a valid email address',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });

  it('fails for invalid value in child object for required list value', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              requiredEmail: 'validemal@email.com',
              requiredEmailList: ['validemal1email.com'],
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['requiredEmailList', 0],
            message:
              'validation.validators.email.message:Please provide a valid email address',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });

  it('fails for invalid value in child object for required list value in any position', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              requiredEmail: 'validemal@email.com',
              requiredEmailList: [
                'validemal1@email.com',
                'invalid',
                'othervalid@email.com',
                null,
              ],
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['requiredEmailList', 1],
            message:
              'validation.validators.email.message:Please provide a valid email address',
          },
          {
            path: ['requiredEmailList', 3],
            message: 'Please provide a value for the field',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });

  it('fails missing required value in related object', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              requiredEmailList: ['validemal1@email.com'],
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['requiredEmail'],
            message: 'Please provide a value for the field',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });

  it('fails missing required list value in related object', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              requiredEmail: 'validemal@email.com',
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['requiredEmailList'],
            message: 'Please provide a value for the field',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });

  it('fails validation for invalid value in related object', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              email: 'invalid',
              requiredEmail: 'validemal@email.com',
              requiredEmailList: [],
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['email'],
            message:
              'validation.validators.email.message:Please provide a valid email address',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });

  it('fails validation for invalid value on third level', () => {
    const fields: FieldConfigMap = {
      test: {
        typeName: 'RelatedType',
        required: true,
      },
    };

    expect(() => {
      try {
        validateInput(
          fields,
          {
            test: {
              email: 'invalid',
              requiredEmail: 'validemal@email.com',
              requiredEmailList: [],
              parent: {
                requiredEmail: 'invalid',
                requiredEmailList: [],
              },
            },
          },
          context
        );
      } catch (e) {
        expect(e.argumentErrors.test).to.deep.equal([
          {
            path: ['email'],
            message:
              'validation.validators.email.message:Please provide a valid email address',
          },
          {
            path: ['parent', 'requiredEmail'],
            message:
              'validation.validators.email.message:Please provide a valid email address',
          },
        ]);
        throw e;
      }
    }).to.throw(ValidationError);
  });
});
