import sinon, {SinonStub} from 'sinon';
import cli from 'cli-ux';
import {expect} from '@oclif/test';

export function cliActions(expectedActions: string[]) {
  const startedActions: string[] = [];
  return {
    async run(ctx: {
      cliActionStub?: SinonStub,
    }) {
      ctx.cliActionStub = sinon.stub(cli.action, 'start').callsFake((action: string) => {
        startedActions.push(action);
      });
    },

    finally(ctx: {cliActionStub?: SinonStub}) {
      if (ctx.cliActionStub) {
        ctx.cliActionStub.restore();
        if (expectedActions.length > startedActions.length) {
          throw new Error('One or more actions not started');
        } else if (expectedActions.length < startedActions.length) {
          throw new Error(
            `One or more actions were not stubbed. Started actions were: "${startedActions.join('", \n"')}"`
          );
        }

        expectedActions.forEach((action, index) => {
          expect(startedActions[index]).to.contain(action);
        });
      }
    }
  }
}
