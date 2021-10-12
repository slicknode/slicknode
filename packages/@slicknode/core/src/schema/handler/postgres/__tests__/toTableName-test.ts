import toTableName, { TableType } from '../toTableName';
import { ObjectTypeConfig, TypeKind } from '../../../../definition';
import { expect } from 'chai';

describe('PostgresHandler toTableName', () => {
  it('returns table name with default schema', () => {
    const namesList = [
      ['TestType', 'n_test_type'],
      ['Some_OtherType', 'n_some__other_type'],
      ['Some_Other_Type', 'n_some__other__type'],
    ];
    for (const names of namesList) {
      const [name, expectedTableName] = names;
      const tableName = toTableName({
        kind: TypeKind.OBJECT,
        name,
        fields: {
          id: {
            typeName: 'ID',
          },
        },
      });
      expect(tableName).to.equal(expectedTableName);
    }
  });

  it('returns table name with specific schema', () => {
    const namesList = [
      ['TestType', 'some_schema.n_test_type'],
      ['Some_OtherType', 'some_schema.n_some__other_type'],
      ['Some_Other_Type', 'some_schema.n_some__other__type'],
    ];
    for (const names of namesList) {
      const [name, expectedTableName] = names;
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name,
        fields: {
          id: {
            typeName: 'ID',
          },
        },
      };
      const tableName = toTableName(typeConfig, 'some_schema');
      expect(tableName).to.equal(expectedTableName);
    }
  });

  it('returns table name with specific schema for draft', () => {
    const namesList = [
      ['TestType', 'some_schema.p_test_type'],
      ['Some_OtherType', 'some_schema.p_some__other_type'],
      ['Some_Other_Type', 'some_schema.p_some__other__type'],
    ];
    for (const names of namesList) {
      const [name, expectedTableName] = names;
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name,
        fields: {
          id: {
            typeName: 'ID',
          },
        },
      };
      const tableName = toTableName(
        typeConfig,
        'some_schema',
        TableType.PREVIEW
      );
      expect(tableName).to.equal(expectedTableName);
    }
  });

  it('returns table name with specific schema for history', () => {
    const namesList = [
      ['TestType', 'some_schema.h_test_type'],
      ['Some_OtherType', 'some_schema.h_some__other_type'],
      ['Some_Other_Type', 'some_schema.h_some__other__type'],
    ];
    for (const names of namesList) {
      const [name, expectedTableName] = names;
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name,
        fields: {
          id: {
            typeName: 'ID',
          },
        },
      };
      const tableName = toTableName(
        typeConfig,
        'some_schema',
        TableType.HISTORY
      );
      expect(tableName).to.equal(expectedTableName);
    }
  });

  it('returns table name with specific schema for default table type', () => {
    const namesList = [
      ['TestType', 'some_schema.n_test_type'],
      ['Some_OtherType', 'some_schema.n_some__other_type'],
      ['Some_Other_Type', 'some_schema.n_some__other__type'],
    ];
    for (const names of namesList) {
      const [name, expectedTableName] = names;
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name,
        fields: {
          id: {
            typeName: 'ID',
          },
        },
      };
      const tableName = toTableName(
        typeConfig,
        'some_schema',
        TableType.DEFAULT
      );
      expect(tableName).to.equal(expectedTableName);
    }
  });
});
