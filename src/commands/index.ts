/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {default as configure} from './configure';
import {default as console} from './console';
import {default as deleteCommand} from './delete';
import {default as deploy} from './deploy';
import {default as endpoint} from './endpoint';
import {default as init} from './init';
import {default as login} from './login';
import {default as moduleAdd} from './module-add';
import {default as moduleCreate} from './module-create';
import {default as playground} from './playground';
import {default as pull} from './pull';
import {default as scale} from './scale';
import {default as status} from './status';
import {default as runtimeBuild} from './runtime-build';

export default [
  init,
  deploy,
  scale,
  status,
  moduleAdd,
  moduleCreate,
  runtimeBuild,
  pull,
  login,
  configure,
  endpoint,
  playground,
  console,
  deleteCommand,
];
