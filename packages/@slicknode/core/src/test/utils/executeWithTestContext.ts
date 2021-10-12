/**
 * Created by Ivo Meißner on 18.06.17.
 *
 */

import { ModuleConfig } from '../../definition';
import Context from '../../context';
import createTestContext from './createTestContext';

export default function executeWithTestContext(
  modules: Array<ModuleConfig>,
  execute: (context: Context) => void | Promise<any>
) {
  createTestContext(modules)
    .then((context) => {
      const promise = execute(context);
      if (promise) {
        return promise;
      }
    })
    .catch((err) => {
      throw err;
    });
}
