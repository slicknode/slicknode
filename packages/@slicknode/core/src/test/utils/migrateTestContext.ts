/**
 * Created by Ivo Meißner on 23.01.19
 *
 */
import Context from '../../context';
import {
  // MutationConfig,
  ModuleConfig,
} from '../../definition';
import { migrateModules } from '../../migration';
import SchemaBuilder from '../../schema/builder';

/**
 * Migrates the context to to the provided modules and returns the new context instance
 *
 * @param context
 * @param modules
 * @returns {Promise<void>}
 */
export default async function migrateTestContext(
  context: Context,
  modules: Array<ModuleConfig>
): Promise<Context> {
  await migrateModules(
    modules,
    context.getDBWrite(),
    context.getDBSchemaName()
  );

  // Update schema builder
  const schemaBuilder = new SchemaBuilder({ modules });

  // Create Project Context
  const newContext = new Context({
    req: context.req,
    res: context.res,
    jwtSecret: context.jwtSecret,
    schemaBuilder,
    project: context.project,
    dbSchemaName: context.getDBSchemaName(),
  });
  newContext.setDBWrite(context.getDBWrite());
  return newContext;
}
