/**
 * Created by Ivo Meißner on 02.12.17.
 *
 * @flow
 */

import { expect } from 'chai';
import { semverCompare } from '../string';

describe('string utils', () => {
  describe('semverCompare', () => {
    it('compares versions correctly', () => {
      const versions = [
        '1.6.5',
        '1.2.10',
        '50.3.3',
        '11.1.x',
        '0.4.7',
        '10.0.5',
        '10.0.10',
        '5.9.0',
        '50.33.0',
        '0.0.0',
        '0.4.7',
        '0.0.3',
      ];

      expect(versions.sort(semverCompare)).to.deep.equal([
        '0.0.0',
        '0.0.3',
        '0.4.7',
        '0.4.7',
        '1.2.10',
        '1.6.5',
        '5.9.0',
        '10.0.5',
        '10.0.10',
        '11.1.x',
        '50.3.3',
        '50.33.0',
      ]);
    });
    it('throws an error for invalid semver versions', () => {
      const invalidVersions = ['f', '0.0.g.g', '1.2.3.4'];
      invalidVersions.forEach((version) => {
        expect(() => {
          semverCompare(version, '0.0.1');
        }).to.throw();
      });
    });
  });
});
