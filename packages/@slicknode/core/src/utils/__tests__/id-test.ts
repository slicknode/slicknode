import { expect } from 'chai';
import { toGlobalId, fromGlobalId } from '../id';

describe('ID utils', () => {
  const globalIds = [
    { type: 'User', id: '1' },
    { type: 'User', id: 'abc' },
    { type: 'User', id: '1:3' },
    { type: 'Module_User', id: '1-45' },
    { type: 'Module_User', id: 'some_other' },
  ];
  for (const globalId of globalIds) {
    it(`generates global ID type "${globalId.type}", id: ${globalId.id}`, () => {
      const gid = toGlobalId(globalId.type, globalId.id);
      expect(gid).to.not.contain('=');
      const restored = fromGlobalId(gid);
      expect(restored).to.deep.eq(globalId);
    });
  }

  it('generates global ID successfully', () => {
    expect(toGlobalId('User', '23')).to.equal('VXNlcjoyMw');
  });
});
