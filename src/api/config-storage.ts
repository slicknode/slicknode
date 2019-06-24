/**
 * Created by Ivo Meißner on 07.08.17.
 */

import * as fs from 'fs';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import * as path from 'path';

export default class ConfigStorage {
  public file: string;
  public cache: {[key: string]: any} | null;

  constructor(file: string) {
    this.file = file;
    this.cache = null;
  }

  public getItem(keyName: string): string | null {
    const val = this.getValues()[keyName];
    return val ? String(val) : null;
  }

  public setItem(keyName: string, keyValue: string): void {
    this.setValues({
      ...this.getValues(),
      [keyName]: keyValue,
    });
  }

  public removeItem(keyName: string): void {
    this.setValues(_.omit(this.getValues(), [ keyName ]));
  }

  public clear(): void {
    this.setValues({});
  }

  /**
   * @private
   */
  public getValues(): {[key: string]: any} {
    try {
      if (!this.cache) {
        const data = fs.readFileSync(this.file, 'utf8');
        this.cache = JSON.parse(data) || {};
      }
      return this.cache || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * @private
   */
  public setValues(values: {[key: string]: any}): void {
    try {
      mkdirp.sync(path.dirname(this.file));
      const data = JSON.stringify(values);
      fs.writeFileSync(this.file, data);
      this.cache = null;
    } catch (e) {
      throw new Error(
        'ERROR: Could not write configuration to user home dir. Make sure your user has write permission.',
      );
    }
  }
}
