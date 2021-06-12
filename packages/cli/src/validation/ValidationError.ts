/**
 * Created by Ivo Meißner on 08.08.17.
 */

interface IValidationErrorOptions {
  location?: string;
  childErrors?: ValidationError[];
  help?: string;
}

export default class ValidationError {
  public message: string;
  public options: IValidationErrorOptions;

  constructor(message: string, options: IValidationErrorOptions = {}) {
    this.message = message;
    this.options = options;
  }

  public toString(): string {
    let result = this.message;
    if (this.options.childErrors && this.options.childErrors.length) {
      result += '\n\n';
      result += this.options.childErrors
        .map((err) => {
          return err.toString();
        })
        .join('\n')
        .replace(/^/gm, '    ');
    }
    return result;
  }
}
