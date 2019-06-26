import sinon, {SinonStub} from 'sinon';
import inquirer, {Questions} from 'inquirer';

export function prompt(values: any[]) {
  const valueStack = [...values];

  return {
    run(ctx: {prompt?: SinonStub}) {
      ctx.prompt = sinon.stub(inquirer, 'prompt').callsFake(async (questions: Questions<any>) => {
        if (questions instanceof Array) {
          return questions.reduce((result, question) => {
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
        }

        return {};
      });

    },

    finally(ctx: {prompt: SinonStub}) {
      ctx.prompt.restore();
    }
  }
}
