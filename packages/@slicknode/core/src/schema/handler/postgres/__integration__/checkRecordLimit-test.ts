import {
  buildModules,
  createTestContext,
  createTestUser,
  destroyTestContext,
  TestUser,
} from '../../../../test/utils';
import { Role } from '../../../../auth';
import { Context } from '../../../../context';
import { ModuleConfig } from '../../../../definition';
import path from 'path';
import { checkRecordLimit } from '../checkRecordLimit';
import { expect } from 'chai';

describe('checkRecordLimit', () => {
  let context: Context;
  let staffUser: TestUser;
  let adminUser: TestUser;

  beforeEach(async () => {
    // Setup schema and base data
    const modules = await getModules('content-node-full-schema');
    context = await createTestContext(modules);
    staffUser = await createTestUser([Role.STAFF, Role.ANONYMOUS], context);
    adminUser = await createTestUser([Role.ADMIN, Role.ANONYMOUS], context);
  });

  afterEach(async () => {
    await destroyTestContext(context);
  });

  it('checks limits for nodes', async () => {
    const result = await checkRecordLimit({
      typeConfig: context.schemaBuilder.getObjectTypeConfig('User'),
      context,
      totalNodes: 3,
    });
    expect(result.nodesRemaining).to.equal(1);
    expect(result.totalRemaining).to.equal(Infinity);
  });

  it('checks total limits', async () => {
    const result = await checkRecordLimit({
      typeConfig: context.schemaBuilder.getObjectTypeConfig('User'),
      context,
      totalMax: 3,
    });
    expect(result.nodesRemaining).to.equal(Infinity);
    expect(result.totalRemaining).to.below(4); // Instable result bcs. we use PG statistic table, just check for range
  });

  it('returns infinity for no limits set', async () => {
    const result = await checkRecordLimit({
      typeConfig: context.schemaBuilder.getObjectTypeConfig('User'),
      context,
    });
    expect(result.nodesRemaining).to.equal(Infinity);
    expect(result.totalRemaining).to.equal(Infinity);
    expect(result.nodesCount).to.equal(null);
    expect(result.totalCount).to.equal(null);
  });
});

async function getModules(name: string): Promise<Array<ModuleConfig>> {
  return await buildModules(path.join(__dirname, 'testprojects', name));
}
