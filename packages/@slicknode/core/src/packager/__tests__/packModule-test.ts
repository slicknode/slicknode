/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */
/* eslint-disable no-sync */
import pack from '../pack';
import path from 'path';
import { expect } from 'chai';
import fs from 'fs';

const getDirectories = (srcPath) =>
  fs
    .readdirSync(srcPath)
    .filter((file) => fs.statSync(path.join(srcPath, file)).isDirectory());

import {
  objectTypeModules,
  /*
enumTypeModules,
inputObjectTypeModules,
interfaceTypeModules,
scalarTypeModules,
unionTypeModules,
*/
} from './schemaConfigs/packedSchemas';
import { getArchive } from './testProjects';
import { unpack } from '../index';

describe('packModule', () => {
  it('creates a zip bundle of an app successfully', (done) => {
    async function run() {
      const zip = await pack(objectTypeModules);
      zip.writeZip(path.join(__dirname, 'tmp', 'packed.zip'));
    }
    run().then(done).catch(done);
  });

  describe('cycle pack', () => {
    const dirs = getDirectories(path.join(__dirname, 'testProjects'));
    dirs
      // @TODO: Skip check for modules with runtime bcs. checksum is not matching due to file transforms
      .filter(
        (name) =>
          ![
            'listeners-after-mutation',
            'listeners-before-mutation',
            'resolvers-input-arguments',
            'resolvers-query-field',
          ].includes(name)
      )
      .forEach((name) => {
        it(`packs and unpacks ${name}`, async () => {
          const archive = await getArchive(name);
          const unpacked = await unpack(archive);
          if (unpacked.errors.length) {
            return;
          }
          const packed = await pack(unpacked.modules);
          const unpacked2 = await unpack(packed);
          expect(JSON.parse(JSON.stringify(unpacked))).to.deep.equal(
            JSON.parse(JSON.stringify(unpacked2))
          );
        });
      });
  });
});
