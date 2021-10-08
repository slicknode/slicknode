import { describe, it, before } from 'mocha';
import { baseModules } from '../../../modules';
import { createContextMock } from '../../../test/utils';
import { Context } from '../../../context';
import { expect } from 'chai';

describe('createDbProxy', () => {
  let context: Context;

  before(() => {
    context = createContextMock(baseModules);
  });

  it('returns type names for user type', () => {
    // Get user auth type
    const userTable = context.db.$names.User;
    expect(userTable).to.deep.equal({
      $name: 'n_user',
      id: 'id',
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      username: 'username',
      isActive: 'is_active',
      isStaff: 'is_staff',
      isAdmin: 'is_admin',
      lastLogin: 'last_login',
      password: 'password',
      passwordChanged: 'password_changed',
      createdAt: 'created_at',
      lastUpdatedAt: 'last_updated_at',
      image: 'image',
    });
  });

  it('throws error for unknown type name', () => {
    expect(() => {
      const test = context.db.$names.UnknownType;
    }).to.throw(
      'ObjectTypeConfig for type UnknownType not registered in schema builder'
    );
  });
});
