import path from 'path';
import { expect } from 'chai';

import { loadModuleConfig } from '../loadModuleConfig';

describe('loadModuleConfig', () => {
  it('creates a module config from dir successfully', async () => {
    const moduleConfig = await loadModuleConfig(
      path.join(__dirname, 'testModules', 'test-app')
    );
    expect(moduleConfig).to.deep.equal(
      (await import('./testModules/test-app/moduleConfig.json')).default
    );
  });
});
