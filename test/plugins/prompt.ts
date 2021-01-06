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

            let value = valueStack.shift();

            const filteredValue = value === null ? null : question.filter ? question.filter(value) : value;
            if (question.validate && filteredValue !== null) {
              const isValid = question.validate(filteredValue);
              if (isValid !== true) {
                throw new Error(isValid);
              }
            }
            result[question.name] = filteredValue === null ? question.default || filteredValue : filteredValue;
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
