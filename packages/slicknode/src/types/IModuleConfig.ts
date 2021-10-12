export interface IRuntimeConfig {
  engine: 'nodejs@8';
}

export interface IBeforeMutationListener {
  event: string;
  handler: string;
}

export interface IAfterMutationListener {
  event: string;
  handler: string;
  config?: {
    query?: string;
  };
}

export type Listener = IBeforeMutationListener | IAfterMutationListener;

export interface IModuleConfig {
  module: {
    id: string;
    namespace: string;
    label: string;
  };
  runtime?: IRuntimeConfig;
  listeners?: Listener[];
  resolvers?: {
    [typeName: string]: {
      [fieldName: string]: {
        handler: string;
      };
    };
  };
}
