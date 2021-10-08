/**
 * Created by Ivo Meißner on 21.06.17.
 *
 */

import { generateAccessToken, IUserAuthInfo } from '../../auth/utils';

import request from 'supertest';
import { JWT_SECRET } from '../../config';

type QueryRequestConfig = {
  query: string;
  variables?: {
    [x: string]: any;
  };
  files?: {
    [x: string]: any;
  };
  headers?: {
    [x: string]: any;
  };
};

/**
 * Executes the query in the provided express app
 * Returns the response object if there was no error
 *
 * @param app
 * @param config
 * @param user
 */
export default async function (
  app: any,
  config: QueryRequestConfig,
  user: IUserAuthInfo | undefined | null = null
) {
  let req = request(app).post('/');

  if (user) {
    const token = generateAccessToken({
      user,
      issuer: '_root',
      maxAge: 10000,
      write: true,
      secret: JWT_SECRET,
    });
    req.set('Authorization', `Bearer ${token}`);
  }

  if (config.files) {
    // Build multipart form data request
    req = req.field('query', config.query);
    req = req.field('variables', JSON.stringify(config.variables));

    // Attach files
    Object.keys(config.files || {}).forEach((name: string) => {
      req = req.attach(name, (config.files || {})[name]);
    });
  } else {
    // Send as JSON body
    req.send({
      query: config.query,
      variables: config.variables,
    });
  }

  const result = await req
    // .expect(200)
    .set('Accept', 'application/json');
  return result.body;
}
