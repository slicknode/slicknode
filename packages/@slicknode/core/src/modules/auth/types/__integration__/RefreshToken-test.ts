import chai, { expect } from 'chai';
import { Role } from '../../../../auth';
import { generateAuthTokenSet } from '../../../../auth/utils';
import Context from '../../../../context';
import {
  createTestContext,
  createTestUser,
  destroyTestContext,
  executeQuery,
} from '../../../../test/utils';
import { baseModules } from '../../../baseModules';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.should();

const DELETE_MUTATION = `
mutation DeleteToken(
  $input: deleteRefreshTokenInput!
) {
  deleteRefreshToken(input: $input) {
    node {id}
  }
}
`;

describe('RefreshToken type', () => {
  let context: Context;

  before(async () => {
    context = await createTestContext(baseModules);
  });

  after(async () => {
    await destroyTestContext(context);
  });

  it('user can delete own refresh tokens', async () => {
    const testUser = await createTestUser([Role.AUTHENTICATED], context);

    const authTokenSet = await generateAuthTokenSet({
      context,
      moduleId: 'auth',
      user: testUser.user,
    });
    const refreshToken = await context.db.RefreshToken.find({
      user: testUser.user.id,
    });

    const globalRefreshId = context.toGlobalId('RefreshToken', refreshToken.id);
    const result = await executeQuery(
      DELETE_MUTATION,
      context,
      {
        input: {
          id: globalRefreshId,
        },
      },
      {
        authContext: testUser.auth,
      }
    );
    expect(result.deleteRefreshToken.node.id).to.equal(globalRefreshId);

    // Check if was removed
    const deletedToken = await context.db.RefreshToken.find({
      id: refreshToken.id,
    });
    expect(deletedToken).to.equal(null);
  });

  it('cannot delete other users tokens', async () => {
    const testUser = await createTestUser([Role.AUTHENTICATED], context);
    const testUser2 = await createTestUser([Role.AUTHENTICATED], context);

    const authTokenSet = await generateAuthTokenSet({
      context,
      moduleId: 'auth',
      user: testUser.user,
    });
    const refreshToken = await context.db.RefreshToken.find({
      user: testUser.user.id,
    });

    const globalRefreshId = context.toGlobalId('RefreshToken', refreshToken.id);
    await expect(
      executeQuery(
        DELETE_MUTATION,
        context,
        {
          input: {
            id: globalRefreshId,
          },
        },
        {
          authContext: testUser2.auth,
        }
      )
    ).to.eventually.rejectedWith(
      "mutationBuilder.deleteMutation.errors.permissionDenied:You don't have permission to delete this object."
    );

    // Ensure token is still there
    const deletedToken = await context.db.RefreshToken.find({
      id: refreshToken.id,
    });
    expect(deletedToken.id).to.equal(refreshToken.id);
  });

  it('requires authentication', async () => {
    const testUser = await createTestUser([Role.AUTHENTICATED], context);
    const testUser2 = await createTestUser([Role.AUTHENTICATED], context);

    const authTokenSet = await generateAuthTokenSet({
      context,
      moduleId: 'auth',
      user: testUser.user,
    });
    const refreshToken = await context.db.RefreshToken.find({
      user: testUser.user.id,
    });

    const globalRefreshId = context.toGlobalId('RefreshToken', refreshToken.id);
    await expect(
      executeQuery(DELETE_MUTATION, context, {
        input: {
          id: globalRefreshId,
        },
      })
    ).to.eventually.rejectedWith(
      'You must be logged in to perform this action'
    );

    // Ensure token is still there
    const deletedToken = await context.db.RefreshToken.find({
      id: refreshToken.id,
    });
    expect(deletedToken.id).to.equal(refreshToken.id);
  });
});
