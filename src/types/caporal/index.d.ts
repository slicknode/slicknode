/* tslint:disable */
declare class Caporal {
    public INTEGER: number;
    public INT: number;
    public FLOAT: number;
    public BOOL: number;
    public BOOLEAN: number;
    public STRING: number;
    public LIST: number;
    public ARRAY: number;
    public REPEATABLE: number;
    public REQUIRED: number;

    public version(ver: string): Caporal;
    public version(): string;

    public name(name: string): Caporal;
    public name(): string;

    public description(name: string): Caporal;
    public description(): string;

    public logger(logger: Logger): Caporal;
    public logger(): Logger;

    public bin(name: string): Caporal;
    public bin(): string;

    public help(helpText: string, helpOptions?: helpOptions): Caporal;

    public command(synospis: string, description: string): Command;

    public action(cb: ActionCallback): Caporal;

    public option(synopsis: string, description: string, validator?: ValidatorArg, defaultValue?: any, required?: boolean): Caporal;

    public argument(synopsis: string, description: string, validator?: ValidatorArg, defaultValue?: any): Command;

    public parse(argv: string[]): any;
    public fatalError(error: Error): void;
}

interface helpOptions {
    indent?: boolean,
    name?: string
}

type ActionCallback = (args: { [k: string]: any },
                       options: { [k: string]: any },
                       logger: Logger) => void;

type ValidatorArg = string[]|string|RegExp|ValidatorFn|Number;
type ValidatorFn = (str: string | string[]) => any;

declare interface Logger {
    debug(...str: any[]): void;
    info(...str: any[]): void;
    log(...str: any[]): void;
    warn(...str: any[]): void;
    error(...str: any[]): void;
}

declare interface Command {
    help(helpText: string, helpOptions?: helpOptions): Command;

    argument(synopsis: string, description: string, validator?: ValidatorArg, defaultValue?: any): Command;

    command(synospis: string, description: string): Command;

    option(synopsis: string, description: string, validator?: ValidatorArg, defaultValue?: any, required?: boolean): Command;

    action(cb: ActionCallback): Command;

    alias(alias: string): Command;

    complete(cb: AutocompleteCallback): Command;
}

type AutocompleteCallback = () => string[] | Promise<string[]>;
declare module 'caporal' {
    const caporal: Caporal;
    export = caporal;
}
