/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */
import { PreMutationHook } from './PreMutationHook';
import { PostMutationHook } from './PostMutationHook';

export type RFDefinition = PreMutationHook | PostMutationHook;
