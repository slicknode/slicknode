import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  formatError,
  UserError,
  AccessDeniedError,
  AccessTokenExpiredError,
  ValidationError,
} from '../errors';
import { GraphQLError } from 'graphql';

describe('Errors', () => {
  it('formats UserError correctly', () => {
    const error = new GraphQLError(
      'GraphQL error',
      undefined,
      undefined,
      undefined,
      undefined,
      new UserError('User error'),
      undefined
    );
    expect(formatError(error)).to.deep.equal({
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
      message: 'GraphQL error',
    });
  });

  it('formats UserError with path correctly', () => {
    const error = new GraphQLError(
      'GraphQL error',
      undefined,
      undefined,
      undefined,
      ['test', 3, 'other'],
      new UserError('User error'),
      undefined
    );
    expect(formatError(error)).to.deep.equal({
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
      path: ['test', 3, 'other'],
      message: 'GraphQL error',
    });
  });

  it('exposes extensions from GraphQL error', () => {
    const error = new GraphQLError(
      'GraphQL error',
      undefined,
      undefined,
      undefined,
      undefined,
      new UserError('User error'),
      {
        customExtension: 1,
      }
    );
    expect(formatError(error)).to.deep.equal({
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        customExtension: 1,
      },
      message: 'GraphQL error',
    });
  });

  it('handles non UserError correctly', () => {
    const error = new GraphQLError(
      'GraphQL error',
      undefined,
      undefined,
      undefined,
      undefined,
      new Error('User error'),
      {
        customExtension: 1,
      }
    );
    expect(formatError(error)).to.deep.equal({
      extensions: {
        customExtension: 1,
      },
      message: 'GraphQL error',
    });
  });

  it('formats ValidationError', () => {
    const error = new GraphQLError(
      'GraphQL error',
      undefined,
      undefined,
      undefined,
      undefined,
      new ValidationError('User error', {
        test: [{ message: 'Some error message' }],
      }),
      {
        customExtension: 1,
      }
    );
    expect(formatError(error)).to.deep.equal({
      extensions: {
        code: 'INPUT_VALIDATION_FAILED',
        customExtension: 1,
        arguments: {
          test: [{ message: 'Some error message' }],
        },
      },
      message: 'GraphQL error',
    });
  });
});
