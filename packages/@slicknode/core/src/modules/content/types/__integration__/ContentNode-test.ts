import { before } from 'mocha';
import { executeWithTestContext } from '../../../../test/utils';
import { tenantModules } from '../../../tenantModules';
import Context from '../../../../context';
import chai, { expect } from 'chai';
import chaiUuid from 'chai-uuid';
import { Role } from '../../../../auth';

chai.use(chaiUuid);

describe('ContentNode type', () => {
  let context: Context;

  before(function (done) {
    this.timeout(30000);
    executeWithTestContext([...tenantModules], (c) => {
      context = c;
      done();
      return;
    });
  });

  it('can perform CRUD mutations', async () => {
    const node = await context.db.ContentNode.create({
      type: 'User',
    });
    expect(node.id).to.be.uuid('v4');
    expect(node.type).to.equal('User');

    // Update node
    const updatedNode = await context.db.ContentNode.update(node.id, {
      type: 'User2',
    });
    expect(updatedNode.type).to.equal('User2');

    // Find node
    const loadedNode = await context.db.ContentNode.find({
      id: updatedNode.id,
    });
    expect(loadedNode.id).to.equal(node.id);
    expect(loadedNode.type).to.equal('User2');

    // Load via fetchAll
    const loadedNodes = await context.db.ContentNode.fetchAll({
      id: node.id,
    });
    expect(loadedNodes.length).to.equal(1);
    expect(loadedNodes[0].id).to.equal(node.id);

    // Load via data loader
    context.auth.roles = [Role.ADMIN, Role.STAFF];
    const dataLoaderNode = await context.getLoader('ContentNode').load(node.id);
    expect(dataLoaderNode.id).to.equal(node.id);
  });
});
