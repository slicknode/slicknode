/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import TimeStampedInterfaceStrict from '../TimeStampedInterfaceStrict';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate TimeStampedInterfaceStrict', () => {
  it('passes for correct TimeStampedInterface implementation', () => {
    expectReportsErrors(
      TimeStampedInterfaceStrict,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                lastUpdatedAt: { typeName: 'DateTime', required: false },
                createdAt: { typeName: 'DateTime', required: true },
              },
              interfaces: ['TimeStampedInterface'],
            },
            {
              kind: TypeKind.INTERFACE,
              name: 'TimeStampedInterface',
              description: 'A user of the project',
              fields: {
                lastUpdatedAt: { typeName: 'DateTime', required: false },
                createdAt: { typeName: 'DateTime', required: true },
              },
            },
          ],
        }),
      ],
      [],
      []
    );
  });

  it('fails for TimeStampedInterface with non-null lastUpdatedAt field', () => {
    expectReportsErrors(
      TimeStampedInterfaceStrict,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                lastUpdatedAt: { typeName: 'DateTime', required: true },
                createdAt: { typeName: 'DateTime', required: true },
              },
              interfaces: ['TimeStampedInterface'],
            },
            {
              kind: TypeKind.INTERFACE,
              name: 'TimeStampedInterface',
              description: 'A user of the project',
              fields: {
                lastUpdatedAt: { typeName: 'DateTime', required: false },
                createdAt: { typeName: 'DateTime', required: true },
              },
            },
          ],
        }),
      ],
      [
        'Field "lastUpdatedAt" on type "TestType" cannot be non-null with "TimeStampedInterface"',
      ],
      []
    );
  });

  it('passes for type without TimeStampedInterface with non-null lastUpdatedAt field', () => {
    expectReportsErrors(
      TimeStampedInterfaceStrict,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                lastUpdatedAt: { typeName: 'DateTime', required: true },
                createdAt: { typeName: 'DateTime', required: true },
              },
            },
            {
              kind: TypeKind.INTERFACE,
              name: 'TimeStampedInterface',
              description: 'A user of the project',
              fields: {
                lastUpdatedAt: { typeName: 'DateTime', required: false },
                createdAt: { typeName: 'DateTime', required: true },
              },
            },
          ],
        }),
      ],
      [],
      []
    );
  });
});
