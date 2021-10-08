/**
 * Created by Ivo Meißner on 18.06.17.
 *
 */
import faker from 'faker';

import Context from '../../context';
import { hashPassword, IUserAuthInfo } from '../../auth/utils';
import { Role, AuthContext } from '../../auth/type';
import { normalizeEmail } from '../../validation/sanitizers';

export type TestUser = {
  auth: AuthContext;
  user: {
    lastName: string | null;
    firstName: string | null;
    username: string | null;
    email: string | null;
    isAdmin?: boolean;
    isStaff?: boolean;
    isActive?: boolean;
    id?: string;
    roles?: Array<Role>;
  };
};

/**
 * Creates a test user in the given context
 * @param userRoles
 * @param context
 * @param data
 */
export default async function createTestUser(
  userRoles: Array<Role>,
  context: Context,
  data: {
    [x: string]: any;
  } = {}
): Promise<TestUser> {
  const password = '12345abcdABC';
  const hash = await hashPassword(password);

  // Save user in DB
  const user = (await context.db.User.create({
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    email: normalizeEmail(faker.internet.exampleEmail()), // uuid.v1() + '@example.com',
    password: hash,
    locale: 'de-DE',
    ...data,
  })) as any;
  if (!user) {
    throw new Error('Test user could not be created');
  }

  return {
    auth: {
      uid: user.id,
      roles: userRoles,
      write: true,
    },
    user,
  };
}
