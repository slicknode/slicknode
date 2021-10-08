import {InterfaceTypeConfig} from './InterfaceTypeConfig';
import {UnionTypeConfig} from './UnionTypeConfig';
import {ObjectTypeConfig} from './ObjectTypeConfig';
import {InputObjectTypeConfig} from './InputObjectTypeConfig';

export type CompositeTypeConfig = InterfaceTypeConfig | UnionTypeConfig | ObjectTypeConfig | InputObjectTypeConfig;
