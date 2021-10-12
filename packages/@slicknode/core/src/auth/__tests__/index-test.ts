/**
 * Created by Ivo Meißner on 07.12.16.
 *
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { isMutateAllowed } from '../index';
import { Role } from '../type';

/* eslint-disable no-unused-expressions */

function createDummyMutation(permissions) {
  return {
    name: 'dummyMutation',
    fields: {},
    inputFields: {
      id: { typeName: 'ID' },
      field: { typeName: 'String' },
    },
    permissions,
    mutate() {},
  };
}

describe('Permission Checks:', () => {
  describe('isMutateAllowed', () => {
    it('succeeds for full access', () => {
      const context = {
        uid: null,
        roles: [Role.ADMIN],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.true;
    });

    it('fails for missing role', () => {
      const context = {
        uid: null,
        roles: [Role.ANONYMOUS],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.false;
    });

    it('can handle multiple permissions', () => {
      const context = {
        uid: null,
        roles: [Role.ANONYMOUS],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
        },
        {
          role: Role.ANONYMOUS,
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.true;
    });

    it('fails for no roles', () => {
      const context = {
        uid: null,
        roles: [],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
        },
        {
          role: Role.ANONYMOUS,
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.false;
    });

    it('succeeds for partial access', () => {
      const context = {
        uid: null,
        roles: [Role.ADMIN],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
          fields: ['someField'],
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.true;
    });

    // Disabled, bcs custom mutations can have only ID field as input and would be public otherwise
    // it('does not consider id field for mutation input', () => {
    //   const context = {
    //     uid: null,
    //     roles: [ Role.ADMIN ],
    //     write: true
    //   };
    //   const permissions = [
    //     {
    //       role: Role.ADMIN,
    //       fields: [ 'someField' ]
    //     }
    //   ];
    //   expect(
    //     isMutateAllowed({someField: 'test', id: '1234'}, context, createDummyMutation(permissions))
    //   ).to.be.true;
    // });

    it('checks the role for partial access', () => {
      const context = {
        uid: null,
        roles: [Role.ADMIN],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
          fields: ['otherfield'],
        },
        {
          role: Role.ANONYMOUS,
          fields: ['id'],
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.false;
    });

    it('fails for partial access on wrong fields', () => {
      const context = {
        uid: null,
        roles: [Role.ADMIN],
        write: true,
      };
      const permissions = [
        {
          role: Role.ADMIN,
          fields: ['otherfield', 'field'],
        },
      ];
      expect(
        isMutateAllowed(
          { someField: 'test', field: 'sef' },
          context,
          createDummyMutation(permissions)
        )
      ).to.be.false;
    });
  });
});
