import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import { createAdminApi } from '../createAdminApi';
import { baseModules, Context, Role } from '@slicknode/core';
import {
  createTestContext,
  destroyTestContext,
} from '@slicknode/core/build/test/utils';
import { QueryMock, Variables } from 'graphql-query-test-mock';
import { before } from 'mocha';
import { expect } from 'chai';
import { transformConfig } from '@slicknode/project-config-transform';
import { Kind, parse } from 'graphql';
import * as uuid from 'uuid';

const rootApiEndpoint = 'http://localhost';
const secret = 'sometestsecret';

const queryMock = new QueryMock();

describe('Admin API', () => {
  describe('POST /authenticate', () => {
    let context: Context;
    beforeEach(() => {
      queryMock.setup(rootApiEndpoint);
    });

    afterEach(() => {
      queryMock.reset();
    });

    before(async () => {
      context = await createTestContext(baseModules);
    });

    after(async () => {
      await destroyTestContext(context);
    });

    it('checks if context is in request', (done) => {
      const app = express();
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/authenticate')
        .expect('Content-Type', /json/)
        .expect(500)
        .expect(
          JSON.stringify({
            message:
              'Slicknode context was not found in request. Add context middleware before admin API',
          }),
          done
        );
    });

    it('authenticates and creates new admin user successfully', (done) => {
      const app = express();
      const code = 'test-auth-code';
      const email = `test-${uuid.v1()}@example.com`;
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        req.context.res = res; // Set res manually wo we can test if auth cookie is set
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );

      // Mock authenticate mutation
      queryMock.mockQuery({
        name: 'VerifyAuthCode',
        variables: {
          input: {
            code,
            adminSecret: secret,
          },
        },
        data: {
          verifyProjectAuthCode: {
            success: true,
            email,
            firstName: 'Firstname',
            lastName: 'Lastname',
            isStaff: true,
            isAdmin: true,
            externalUserId: null,
          },
        },
      });
      let updateProjectUserVars: Variables;
      queryMock.mockQuery({
        name: 'UpdateProjectUser',
        data: {
          updateProjectAuthCodeUser: {
            success: true,
          },
        },
        matchVariables: (vars) => {
          updateProjectUserVars = vars;
          return true;
        },
      });

      request(app)
        .post('/authenticate')
        .send({
          code,
        })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect('set-cookie', /_sn_sess/)
        .end(async (err, res) => {
          expect(res.body.success).to.equal(true);
          expect(res.body.data.accessTokenLifetime).to.be.above(0);
          expect(res.body.data.refreshTokenLifetime).to.be.above(0);
          expect(res.body.data.accessToken).to.be.string;
          expect(res.body.data.refreshToken).to.be.string;

          if (err) {
            done(err);
          }

          // Load user
          const user = await context.db.User.find({
            email,
          });
          expect(String(user?.id)).to.equal(
            updateProjectUserVars.input.externalUserId
          );
          expect(user?.isStaff).to.be.true;
          expect(user?.isAdmin).to.be.true;
          done();
        });
    });

    it('authenticates and creates new staff user successfully', (done) => {
      const app = express();
      const code = 'test-auth-code';
      const email = 'test@example.com';
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        req.context.res = res; // Set res manually wo we can test if auth cookie is set
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );

      // Mock authenticate mutation
      queryMock.mockQuery({
        name: 'VerifyAuthCode',
        variables: {
          input: {
            code,
            adminSecret: secret,
          },
        },
        data: {
          verifyProjectAuthCode: {
            success: true,
            email,
            firstName: 'Firstname',
            lastName: 'Lastname',
            isStaff: true,
            isAdmin: false,
            externalUserId: null,
          },
        },
      });
      let updateProjectUserVars: Variables;
      queryMock.mockQuery({
        name: 'UpdateProjectUser',
        data: {
          updateProjectAuthCodeUser: {
            success: true,
          },
        },
        matchVariables: (vars) => {
          updateProjectUserVars = vars;
          return true;
        },
      });

      request(app)
        .post('/authenticate')
        .send({
          code,
        })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect('set-cookie', /_sn_sess/)
        .end(async (err, res) => {
          expect(res.body.success).to.equal(true);
          expect(res.body.data.accessTokenLifetime).to.be.above(0);
          expect(res.body.data.refreshTokenLifetime).to.be.above(0);
          expect(res.body.data.accessToken).to.be.string;
          expect(res.body.data.refreshToken).to.be.string;

          if (err) {
            done(err);
          }

          // Load user
          const user = await context.db.User.find({
            email,
          });
          expect(String(user?.id)).to.equal(
            updateProjectUserVars.input.externalUserId
          );
          expect(user?.isStaff).to.be.true;
          expect(user?.isAdmin).to.be.false;
          done();
        });
    });

    it('fails with error in verify code mutation', (done) => {
      const app = express();
      const code = 'test-auth-code';
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        req.context.res = res; // Set res manually wo we can test if auth cookie is set
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );

      // Mock authenticate mutation
      queryMock.mockQuery({
        name: 'VerifyAuthCode',
        variables: {
          input: {
            code,
            adminSecret: secret,
          },
        },
        data: {},
        graphqlErrors: [{ message: 'Mutation failed' }],
      });

      request(app)
        .post('/authenticate')
        .send({
          code,
        })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(500)
        .expect(/Mutation failed/, done);
    });

    it('fails with unsuccessful verification', (done) => {
      const app = express();
      const code = 'test-auth-code';
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        req.context.res = res; // Set res manually wo we can test if auth cookie is set
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );

      // Mock authenticate mutation
      queryMock.mockQuery({
        name: 'VerifyAuthCode',
        variables: {
          input: {
            code,
            adminSecret: secret,
          },
        },
        data: {
          verifyProjectAuthCode: {
            success: false,
            user: {
              id: 'xyzuser',
              email: 'Some email',
              firstName: 'Firstname',
              lastName: 'Lastname',
            },
            projectUser: {
              isStaff: true,
              isAdmin: true,
            },
            externalUserId: null,
          },
        },
      });

      request(app)
        .post('/authenticate')
        .send({
          code,
        })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(500)
        .expect(/Auth code verification not successful/, done);
    });

    it('fails for invalid auth code', (done) => {
      const app = express();
      const code = 'test-auth-code';
      app.use((req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );

      // Mock authenticate mutation
      queryMock.mockQuery({
        name: 'VerifyAuthCode',
        variables: {
          input: {
            code,
            adminSecret: secret,
          },
        },
        data: {},
        graphqlErrors: [{ message: 'some error' }],
      });

      request(app)
        .post('/authenticate')
        .send({
          code,
        })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(500)
        .expect(/some error/, done);
    });
  });

  describe('GET /config/permissions', () => {
    let context: Context;
    beforeEach(async () => {
      queryMock.setup(rootApiEndpoint);
      context = await createTestContext(baseModules);
    });

    afterEach(async () => {
      queryMock.reset();
      await destroyTestContext(context);
    });

    it('checks if context is in request', (done) => {
      const app = express();
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config/permissions/User')
        .expect('Content-Type', /json/)
        .expect(500)
        .expect(
          JSON.stringify({
            message:
              'Slicknode context was not found in request. Add context middleware before admin API',
          }),
          done
        );
    });

    it('access denied for anonymous user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config/permissions/User')
        .expect('Content-Type', /json/)
        .expect(401)
        .expect(/Authentication required/, done);
    });

    it('access denied for non staff user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.AUTHENTICATED];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config/permissions/User')
        .expect('Content-Type', /json/)
        .expect(403)
        .expect(/Permission denied/, done);
    });

    it('validates type parameter', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.STAFF];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config/permissions/invalid_-')
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) done(err);
          expect(res.body.success).to.equal(false);
          expect(res.body.message).to.contain(
            'fails to match the required pattern'
          );
          done();
        });
    });

    it('returns permissions for STAFF user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.STAFF];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config/permissions/User')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) done(err);
          expect(res.body.success).to.equal(true);
          expect(res.body.message).to.equal('OK');
          const schema = parse(res.body.data.schema);
          expect(schema.kind).to.equal(Kind.DOCUMENT);
          expect(schema.definitions[0].kind).to.equal(Kind.SCHEMA_DEFINITION);

          const document = parse(res.body.data.document);
          expect(document.kind).to.equal(Kind.DOCUMENT);
          expect(document.definitions[0].kind).to.equal(
            Kind.OPERATION_DEFINITION
          );
          done();
        });
    });

    it('throws error for unknown type', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.STAFF];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config/permissions/UnknownType')
        .expect('Content-Type', /json/)
        .expect(404)
        .end((err, res) => {
          if (err) done(err);
          expect(res.body.success).to.equal(false);
          expect(res.body.message).to.contain(
            'not registered in schema builder'
          );
          done();
        });
    });
  });

  describe('GET /config', () => {
    let context: Context;
    beforeEach(async () => {
      queryMock.setup(rootApiEndpoint);
      context = await createTestContext(baseModules);
    });

    afterEach(async () => {
      queryMock.reset();
      await destroyTestContext(context);
    });

    it('checks if context is in request', (done) => {
      const app = express();
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config')
        .expect('Content-Type', /json/)
        .expect(500)
        .expect(
          JSON.stringify({
            message:
              'Slicknode context was not found in request. Add context middleware before admin API',
          }),
          done
        );
    });

    it('access denied for anonymous user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config')
        .expect('Content-Type', /json/)
        .expect(401)
        .expect(/Authentication required/, done);
    });

    it('access denied for non staff user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.AUTHENTICATED];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config')
        .expect('Content-Type', /json/)
        .expect(403)
        .expect(/Permission denied/, done);
    });

    it('returns config for STAFF user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.STAFF];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) done(err);
          expect(res.body.success).to.equal(true);
          expect(res.body.message).to.equal('OK');
          expect(res.body.data.modules.length).to.equal(baseModules.length);
          expect(res.body.data).to.deep.equal(
            transformConfig({
              modules: baseModules,
              buildDefaultAdmin: true,
            })
          );
          done();
        });
    });

    it('returns config for ADMIN user', (done) => {
      const app = express();
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        context.auth.uid = '1';
        context.auth.roles = [Role.ADMIN];
        req.context = context;
        next();
      });
      app.use(
        '/',
        createAdminApi({
          secret,
          rootApiEndpoint,
        })
      );
      request(app)
        .get('/config')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) done(err);
          expect(res.body.success).to.equal(true);
          expect(res.body.message).to.equal('OK');
          expect(res.body.data.modules.length).to.equal(baseModules.length);
          expect(res.body.data).to.deep.equal(
            transformConfig({
              modules: baseModules,
              buildDefaultAdmin: true,
            })
          );
          done();
        });
    });
  });
});
