/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

// Core types
import DateTime from './DateTime';
import TimeStampedInterface from './TimeStampedInterface';
import Query from './Query';
import Mutation from './Mutation';
import Viewer from './Viewer';
import Decimal from './Decimal';

// Filters
import IDFilter from './IDFilter';
import IntFilter from './IntFilter';
import StringFilter from './StringFilter';
import FloatFilter from './FloatFilter';
import DateTimeFilter from './DateTimeFilter';
import DecimalFilter from './DecimalFilter';

// Ordering
import OrderDirection from './OrderDirection';

import { TypeConfig } from '../../../definition';

// Input
import InputElementType from './InputElementType';

/* eslint-disable max-len */
const types: Array<TypeConfig> = [
  DateTime,
  TimeStampedInterface,
  Query,
  Mutation,
  Viewer,
  IDFilter,
  StringFilter,
  IntFilter,
  FloatFilter,
  DateTimeFilter,
  OrderDirection,
  Decimal,
  DecimalFilter,
  InputElementType,
];

export default types;
