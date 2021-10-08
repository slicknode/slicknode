import * as sinon from 'sinon';
import inquirer from 'inquirer';
import type { Questions, Question } from 'inquirer';
import { ImportMock } from 'ts-mock-imports';

export function prompt(values: any[]) {
  const valueStack = [...values];

  return {
    async run(ctx: { prompt?: sinon.SinonStub }) {
      const stub = ImportMock.mockFunction(inquirer, 'prompt');
      stub.callsFake(async (questions: Questions<unknown>) => {
        const questionArray: any =
          questions instanceof Array ? questions : [questions];
        return questionArray.reduce(
          (result: Record<string, any>, question: Question<unknown>) => {
            if (valueStack.length === 0) {
              throw new Error(
                `Not enough values provided for prompt: ${question.message} "${question.name}"`
              );
            }

            let value = valueStack.shift();

            const filteredValue =
              value === null
                ? null
                : question.filter
                ? question.filter(value)
                : value;
            if (question.validate && filteredValue !== null) {
              const isValid = question.validate(filteredValue);
              if (isValid !== true) {
                throw new Error(String(isValid));
              }
            }
            result[String(question.name)] =
              filteredValue === null
                ? question.default || filteredValue
                : filteredValue;
            return result;
          },
          {}
        );
      });
      ctx.prompt = stub;
    },

    finally(ctx: { prompt?: sinon.SinonStub }) {
      if (ctx.prompt) {
        if (ctx.prompt.restore) {
          ctx.prompt.restore();
        } else {
          throw new Error('Failed to create mock');
        }
        if (valueStack.length !== 0) {
          throw new Error(
            `Some prompt values were not consumed yet:\n ${valueStack
              .map((value) => '- ' + JSON.stringify(value))
              .join('\n\n')}`
          );
        }
      } else {
        throw new Error('No prompt found');
      }
    },
  };
}
