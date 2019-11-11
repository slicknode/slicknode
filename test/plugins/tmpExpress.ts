/**
 * Wraps the listen method of the express library to keep an instance of the express app
 * in context so the connections can be closed after the test
 *
 * Pass the complete export from the module under test (so we replace default export)
 *
 * @param expressLib
 */
import {Application} from 'express';

export function tmpExpress(expressLib: any) {
  const originalDefault = expressLib.default;
  return {
    async run(ctx: {expressListeners?: any[], expressApp?: Application}) {
      expressLib.default = () => {
        const server = originalDefault.apply(null, arguments);
        const originalListen = server.listen;

        if (ctx.expressApp) {
          throw new Error('There is already in express app registered in the context');
        }
        ctx.expressApp = server;

        // Capture listener to close connection later
        server.listen = () => {
          const listener = originalListen.apply(arguments);

          ctx.expressListeners = [
            ...(ctx.expressListeners || []),
            listener,
          ];
          return listener;
        };

        return server;
      }
    },

    // Delete temporary workspace
    async finally(ctx: {expressListeners?: any[], expressApp?: Application}) {
      if (ctx.expressListeners && ctx.expressListeners.length) {
        ctx.expressListeners.forEach(listener => {
          // Close connection
          listener.close();
        });
      }

      // Restore default export
      expressLib.default = originalDefault;
    }
  }
}
