/**
 * Created by Ivo Meißner on 21.12.16.
 *
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { sanitizeInput } from '../index';
// import _ from 'lodash';
import { FieldConfigMap } from '../../definition';

describe('Input sanitize test:', () => {
  it('sanitizes the values', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        sanitizers: [
          {
            type: 'normalizeEmail',
          },
        ],
      },
    };

    expect(
      sanitizeInput(fields, {
        email: 'UPPERCASE@EMAIL.com',
      })
    ).to.deep.equal({
      email: 'uppercase@email.com',
    });
  });

  it('sanitizes only values with sanitizers configured', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        sanitizers: [
          {
            type: 'normalizeEmail',
          },
        ],
      },
      email2: {
        typeName: 'String',
        required: true,
      },
    };

    expect(
      sanitizeInput(fields, {
        email: 'UPPERCASE@EMAIL.com',
        email2: 'TEST',
      })
    ).to.deep.equal({
      email: 'uppercase@email.com',
      email2: 'TEST',
    });
  });

  it('ignores not provided values', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        sanitizers: [
          {
            type: 'normalizeEmail',
          },
        ],
      },
    };

    expect(
      sanitizeInput(fields, {
        email2: 'TEST',
      })
    ).to.deep.equal({
      email2: 'TEST',
    });
  });

  it('ignores NULL values', () => {
    const fields: FieldConfigMap = {
      email: {
        typeName: 'String',
        required: true,
        sanitizers: [
          {
            type: 'normalizeEmail',
          },
        ],
      },
    };

    expect(
      sanitizeInput(fields, {
        email2: null,
      })
    ).to.deep.equal({
      email2: null,
    });
  });
});
