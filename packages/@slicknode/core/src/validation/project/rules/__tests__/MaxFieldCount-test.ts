/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import MaxFieldCount from '../MaxFieldCount';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';
import _ from 'lodash';

describe('Validate MaxFieldCount', () => {
  it('checks max field count', () => {
    expectReportsErrors(
      MaxFieldCount,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: _.range(101).reduce(
                (fieldMap, index) => ({
                  ...fieldMap,
                  [`field${index}`]: {
                    typeName: 'String',
                    required: false,
                  },
                }),
                {}
              ),
            },
          ],
        }),
      ],
      ['The type "TestType" cannot have more than 100 fields']
    );

    expectReportsErrors(
      MaxFieldCount,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: _.range(100).reduce(
                (fieldMap, index) => ({
                  ...fieldMap,
                  [`field${index}`]: {
                    typeName: 'String',
                    required: false,
                  },
                }),
                {}
              ),
            },
          ],
        }),
      ],
      []
    );
  });
});
