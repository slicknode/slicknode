export interface IWaitForParams {
  // Handler to test. If returns true, the function is resolved
  handler: () => Promise<boolean>;

  // Interval with which to invoke the handler in ms
  interval: number;

  // Timeout in ms after which the waiting is aborted and an exception is raised
  timeout: number;
}

/**
 * Waits for a handler to resolve successfully
 * @param params
 */
export async function waitFor(params: IWaitForParams) {
  const start = new Date().getTime();

  return await new Promise<void>(async (resolve, reject) => {
    if (await params.handler()) {
      resolve();
      return;
    }

    const interval = setInterval(async () => {
      // Check if resolves successfully
      try {
        if (await params.handler()) {
          clearInterval(interval);
          resolve();
        }
        /* tslint:disable:no-empty */
      } catch (e) {}

      // Check for timeout
      if (start < new Date().getTime() - params.timeout) {
        clearInterval(interval);
        reject(new Error('Wait timeout exceeded'));
      }
    }, params.interval);
  });
}
