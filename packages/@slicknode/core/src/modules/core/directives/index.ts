/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { IndexDirective } from './IndexDirective';
import { InputDirective } from './InputDirective';
import { RelationDirective } from './RelationDirective';
import { UniqueDirective } from './UniqueDirective';
import { ValidateEmailDirective } from './ValidateEmailDirective';
import { ValidateLengthDirective } from './ValidateLengthDirective';
import { ValidateRegexDirective } from './ValidateRegexDirective';
import { ValidateGidDirective } from './ValidateGidDirective';
import { ValidateUrlDirective } from './ValidateUrlDirective';
import { AutocompleteDirective } from './AutocompleteDirective';

export default [
  // CMS configuration
  InputDirective,

  // Schema / DB configuration
  IndexDirective,
  RelationDirective,
  UniqueDirective,
  AutocompleteDirective,

  // Validators
  ValidateEmailDirective,
  ValidateLengthDirective,
  ValidateRegexDirective,
  ValidateGidDirective,
  ValidateUrlDirective,
];
