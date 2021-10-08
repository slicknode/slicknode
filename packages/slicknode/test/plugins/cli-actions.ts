import * as sinon from 'sinon';
import cli from 'cli-ux';
import { expect } from '@oclif/test';
import * as _ from 'lodash';

export function cliActions(expectedActions: string[]) {
  const startedActions: string[] = [];
  return {
    async run(ctx: { cliActionStub?: sinon.SinonStub }) {
      ctx.cliActionStub = sinon
        .stub(cli.action, 'start')
        .callsFake((action: string) => {
          startedActions.push(action);
        });
    },

    finally(ctx: { cliActionStub?: sinon.SinonStub }) {
      if (ctx.cliActionStub) {
        ctx.cliActionStub.restore();
        if (expectedActions.length > startedActions.length) {
          const notStartedActions = _.difference(
            expectedActions,
            startedActions
          );
          return;
          throw new Error(
            `Expected actions not started:\n ${notStartedActions
              .map((action) => `- ${action}`)
              .join('\n')}`
          );
        } else if (expectedActions.length < startedActions.length) {
          throw new Error(
            `One or more actions were not stubbed. Started actions were: "${startedActions.join(
              '", \n"'
            )}"`
          );
        }

        expectedActions.forEach((action, index) => {
          expect(startedActions[index]).to.contain(action);
        });
      }
    },
  };
}
