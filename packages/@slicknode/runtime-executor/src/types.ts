/**
 * Created by Ivo Meißner on 17.01.18.
 *
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ExecutionPayload =
  | Record<string, any>
  | boolean
  | number
  | null
  | undefined;

export interface RuntimeInterface {
  /**
   * Executes the function
   *
   * @param handler The handler that is invoked inside the package. Something like build/resolvers/Query/getMyData
   * Works like require(<handler>)(payload, context);
   */
  execute(
    handler: string,
    payload: ExecutionPayload,
    context: ExecutionContext
  ): Promise<ExecutionResult>;
}

export interface RuntimeConfig {
  /**
   * The memory in MB for the runtime
   */
  memory?: number;

  /**
   * The engine of the runtime, for example nodejs@6.10
   */
  engine: string;
}

export type Charge = {
  // The type of the charge, for example "aws-lambda"
  type: string;

  // The amount to be charged
  amount: number;
};

/**
 * Response that is returned by the function
 */
export type ExecutionResult = {
  data: any;
  success: boolean;
  message: string | null | undefined;
  logs: string | null | undefined;
  charges: Array<Charge>;
};

export type SettingsValue = string | boolean | number;
export type SettingsValueMap = {
  [key: string]: SettingsValue;
};

/**
 * Information about the request, settings for the module etc
 * that is passed to the function handler as second argument
 */
export type ExecutionContext = {
  api: {
    /**
     * The access token
     */
    accessToken: string;
    /**
     * The GraphQL API endpoint
     */
    endpoint: string;
  };
  request: {
    /**
     * The IP address of the client
     */
    ip: string;

    /**
     * The unique request id as UUID string
     */
    id: string;
  };
  project: {
    /**
     * The project alias
     */
    alias: string;
  };
  module: {
    // The module that is initiating the event
    id: string;
  };
  settings: SettingsValueMap;
};
