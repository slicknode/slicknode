/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

/**
 * Configuration variables for an app
 */
export type ModuleSettings = {
  [key: string]: string | number | boolean;
};

/**
 * Module settings map of a complete project
 */
export type ModuleSettingsMap = {
  [moduleId: string]: ModuleSettings;
};
