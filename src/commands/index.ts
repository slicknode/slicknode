/**
 * Created by Ivo Meißner on 28.07.17.
 */
import {ConfigureCommand} from './configure';
import {ConsoleCommand} from './console';
import {DeleteCommand} from './delete';
import {DeployCommand} from './deploy';
import {EndpointCommand} from './endpoint';
import {InitCommand} from './init';
import {LoginCommand} from './login';
import {ModuleAddCommand} from './module/add';
import {ModuleCreateCommand} from './module/create';
import {PlaygroundCommand} from './playground';
import {PullCommand} from './pull';
import {RuntimeBuildCommand} from './runtime/build';
import {ScaleCommand} from './scale';
import {StatusCommand} from './status';

export default [
  InitCommand,
  DeployCommand,
  ScaleCommand,
  StatusCommand,
  ModuleAddCommand,
  ModuleCreateCommand,
  RuntimeBuildCommand,
  PullCommand,
  LoginCommand,
  ConfigureCommand,
  EndpointCommand,
  PlaygroundCommand,
  ConsoleCommand,
  DeleteCommand,
];
