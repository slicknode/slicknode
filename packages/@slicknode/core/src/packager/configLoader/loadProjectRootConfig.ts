import * as fs from 'fs';
import { promisify } from 'util';
import yaml from 'js-yaml';
import { config as projectConfigSchema } from '../validation/configSchemas';
import * as path from 'path';

const readFile = promisify(fs.readFile);

export type ProjectRootConfig = {
  dependencies: { [moduleId: string]: string };
};

/**
 * Loads the root project configuration from a slicknode.yml file,
 * validates the content.
 *
 * Throws an error if configuraton is invalid or file could not be loaded.
 *
 * @param file
 */
export async function loadProjectRootConfig(
  file: string
): Promise<ProjectRootConfig> {
  const resolvedPath = path.resolve(file);
  try {
    const rawConfig = (await readFile(resolvedPath)).toString();
    const config = yaml.safeLoad(rawConfig);
    const result = projectConfigSchema.validate(config, {
      abortEarly: false,
    });
    if (result.error) {
      const childErrors = (result.error.details || [])
        .map((detail) => {
          return `Invalid value at path "${detail.path}": ${detail.message}`;
        })
        .join('\n');
      throw new Error(
        `Invalid values in slicknode.yml configuration: \n${childErrors}`
      );
    }
    return config as ProjectRootConfig;
  } catch (error) {
    throw new Error(
      `Error loading Slicknode root config ${resolvedPath}: ${error.message}`
    );
  }
}
