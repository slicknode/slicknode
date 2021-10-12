import { ModuleConfig } from '../definition';

import AuthModule from './auth';
import CoreModule from './core';
import RelayModule from './relay';
import FileModule from './file';
import ImageModule from './image';
import ContentModule from './content';

export const baseModules: Array<ModuleConfig> = [
  CoreModule,
  RelayModule,
  AuthModule,
  FileModule,
  ImageModule,
  ContentModule,
];
