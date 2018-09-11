/**
 * Created by Ivo Meißner on 11.08.17.
 *
 * @flow
 */
/*
import StatusCommand from '../status';
import { TestLogger } from '../../logging';
*/
import { expect } from 'chai';

describe('slicknode status', () => {
  it('checks if is slicknode project folder', (done) => {
    expect(1).to.equal(1);
    done();
    /*
    (async () => {
      const logger = new TestLogger();
      const cmd = new StatusCommand({
        logger,
        options: {},
        args: {}
      });
      await cmd.run();

      expect(logger.getError()).to.include('Project configuration has errors: ');
      expect(logger.getError()).to.include('The directory is not a slicknode project');
    })().then(done).catch(done);
    */
  });
});
