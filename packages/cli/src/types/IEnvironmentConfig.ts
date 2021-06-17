/**
 * Created by Ivo Meißner on 19.08.17.
 */

export interface IEnvironmentConfig {
  endpoint: string;
  alias: string;
  id: string;
  name: string;
}

export interface IEnvironmentConfigMap {
  [key: string]: IEnvironmentConfig;
}
