/**
 * Created by Ivo Meißner on 07.08.17.
 */

import {expect} from 'chai';
import * as os from 'os';
import * as path from 'path';
import ConfigStorage from '../ConfigStorage';

const storage = new ConfigStorage(path.join(os.tmpdir(), 'slicknode', 'ConfigStorage-test'));

describe('api ConfigStorage', () => {
  it('Sets and reads values', () => {
    const testValue = 'TestValue';
    storage.setItem('test:name', testValue);
    expect(storage.getItem('test:name')).to.equal(testValue);
  });

  it('Sets and deletes values', () => {
    const testValue = 'TestValue';
    storage.setItem('test:name2', testValue);
    expect(storage.getItem('test:name2')).to.equal(testValue);
    storage.removeItem('test:name2');
    expect(storage.getItem('test:name2')).to.equal(null);
  });
});
