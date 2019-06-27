import sinon, {SinonStub} from 'sinon';
import inquirer, {Questions} from 'inquirer';

export function prompt(values: any[]) {
  const valueStack = [...values];

  return {
    async run(ctx: {prompt?: SinonStub}) {
      ctx.prompt = sinon.stub(inquirer, 'prompt').callsFake(async (questions: Questions<any>) => {
        if (questions instanceof Array) {
          return questions.reduce((result, question) => {
            if (valueStack.length === 0) {
              throw new Error(
                `Not enough values provided for prompt: ${question.message} "${question.name}"`
              );
            }
            const value = valueStack.shift();
            if (question.validate) {
              const isValid = question.validate(value);
              if (isValid !== true) {
                throw new Error(isValid);
              }
            }
            result[question.name] = value;
            return result;
          }, {});
        } else {
        }

        return {};
      });

    },

    finally(ctx: {prompt?: SinonStub}) {
      if (ctx.prompt) {
        ctx.prompt.restore();
        if (valueStack.length !== 0) {
          throw new Error('One or more prompt values not consumed yet');
        }
      }
    }
  }
}
