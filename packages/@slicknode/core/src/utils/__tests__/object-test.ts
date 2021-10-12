/**
 * Created by Ivo Meißner on 25.05.18
 *
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  snakeToCamelCaseObject,
  camelToSnakeCaseObject,
  deepReplaceVariables,
} from '../object';
/* eslint-disable camelcase */

describe('object utils', () => {
  describe('deepReplaceVariables', () => {
    it('replaces empty object', () => {
      expect(
        deepReplaceVariables({
          source: {},
          variables: {},
        })
      ).to.deep.equal({});
    });

    it('replaces single var in object', () => {
      expect(
        deepReplaceVariables({
          source: {
            key: 'key with ${var}',
          },
          variables: {
            var: 'test',
          },
        })
      ).to.deep.equal({
        key: 'key with test',
      });
    });

    it('returns non string properties unchanged', () => {
      expect(
        deepReplaceVariables({
          source: {
            key: true,
          },
          variables: {
            var: 'test',
          },
        })
      ).to.deep.equal({
        key: true,
      });
    });

    it('replaces multiple vars in object', () => {
      expect(
        deepReplaceVariables({
          source: {
            key: 'key with ${var} ${var2}',
          },
          variables: {
            var: 'test',
            var2: 'val2',
          },
        })
      ).to.deep.equal({
        key: 'key with test val2',
      });
    });

    it('ignores spaces inside brackets var in object', () => {
      expect(
        deepReplaceVariables({
          source: {
            key: 'key with ${ var }',
          },
          variables: {
            var: 'test',
          },
        })
      ).to.deep.equal({
        key: 'key with test',
      });
    });

    it('replaces single var from deep object', () => {
      expect(
        deepReplaceVariables({
          source: {
            key: 'key with ${deep.var}',
          },
          variables: {
            deep: {
              var: 'test',
            },
          },
        })
      ).to.deep.equal({
        key: 'key with test',
      });
    });

    it('replaces single var from deep object with special character key', () => {
      expect(
        deepReplaceVariables({
          source: {
            key: 'key with ${headers.x-some-header}',
          },
          variables: {
            headers: {
              ['x-some-header']: 'test',
            },
          },
        })
      ).to.deep.equal({
        key: 'key with test',
      });
    });

    it('replaces variables deep', () => {
      expect(
        deepReplaceVariables({
          source: {
            deep: {
              key: 'key with ${ var }',
            },
          },
          variables: {
            var: 'test',
          },
        })
      ).to.deep.equal({
        deep: {
          key: 'key with test',
        },
      });
    });
  });
  describe('snakeToCamelCaseObject', () => {
    it('converts empty object', () => {
      expect(snakeToCamelCaseObject({})).to.deep.equal({});
    });

    it('converts simple object', () => {
      expect(
        snakeToCamelCaseObject({
          some_test_value: 'Test',
        })
      ).to.deep.equal({
        someTestValue: 'Test',
      });
    });

    it('converts object recursively', () => {
      expect(
        snakeToCamelCaseObject({
          some_test_value: 'Test',
          otherProperty: 23,
          object_value: {
            obj_val: {
              some: {},
            },
          },
        })
      ).to.deep.equal({
        someTestValue: 'Test',
        otherProperty: 23,
        objectValue: {
          objVal: {
            some: {},
          },
        },
      });
    });

    it('overrides object with custom mapping', () => {
      expect(
        snakeToCamelCaseObject(
          {
            some_test_value: 'Test',
            otherProperty: 23,
            object_value: {
              obj_val: {
                some: {},
              },
            },
          },
          { obj_val: 'otherProp' }
        )
      ).to.deep.equal({
        someTestValue: 'Test',
        otherProperty: 23,
        objectValue: {
          otherProp: {
            some: {},
          },
        },
      });
    });
  });

  describe('camelToSnakeCaseObject', () => {
    it('converts empty object', () => {
      expect(camelToSnakeCaseObject({})).to.deep.equal({});
    });

    it('converts simple object', () => {
      expect(
        camelToSnakeCaseObject({
          someTestValue: 'Test',
        })
      ).to.deep.equal({
        some_test_value: 'Test',
      });
    });

    it('converts object recursively', () => {
      expect(
        camelToSnakeCaseObject({
          someTestValue: 'Test',
          otherProperty: 23,
          objectValue: {
            objVal: {
              some: {},
            },
          },
        })
      ).to.deep.equal({
        some_test_value: 'Test',
        other_property: 23,
        object_value: {
          obj_val: {
            some: {},
          },
        },
      });
    });

    it('converts object with custom mapping', () => {
      expect(
        camelToSnakeCaseObject(
          {
            someTestValue: 'Test',
            otherProperty: 23,
            objectValue: {
              objVal: {
                some: {},
              },
            },
          },
          {
            objVal: 'newVal',
          }
        )
      ).to.deep.equal({
        some_test_value: 'Test',
        other_property: 23,
        object_value: {
          newVal: {
            some: {},
          },
        },
      });
    });
  });
});
