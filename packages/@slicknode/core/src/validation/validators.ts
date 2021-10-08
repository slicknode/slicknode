/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */

import validator from 'validator';
import _ from 'lodash';
import { ValidationError } from '../errors';
import { fromGlobalId } from '../utils/id';

/**
 * Checks if value is a valid email
 * @param values
 * @param field
 * @param __
 */
export function email(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function
) {
  if (
    _.isString(_.get(values, field)) &&
    validator.isEmail(_.get(values, field))
  ) {
    return;
  }

  throw new ValidationError(
    __(
      'validation.validators.email.message:Please provide a valid email address'
    )
  );
}

/**
 * Checks if value is a valid ISO 639-1 locale code
 * @param values
 * @param field
 * @param __
 */
export function locale(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function
) {
  const value = _.get(values, field);
  if (!_.isString(value)) {
    throw new ValidationError(
      __('validation.validators.locale.messages.noValue:Please provide a value')
    );
  }

  // Check if max length was configured
  if (
    !validator.matches(value, '^[a-z]{2,3}(?:-[A-Z]{2,3}(?:-[a-zA-Z]{4})?)?$')
  ) {
    throw new ValidationError(
      __(
        'validation.validators.locale.messages.invalid:The input value is not a valid locale'
      )
    );
  }
}

/**
 * Checks if the value has the specified length
 * @param values
 * @param field
 * @param __
 * @param config
 */
export function length(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function,
  config: {
    [x: string]: any;
  }
) {
  const value = _.get(values, field);
  if (!_.isString(value)) {
    throw new ValidationError(
      __('validation.validators.length.messages.noValue:Please provide a value')
    );
  }

  // Check if max length was configured
  if (
    _.has(config, 'max') &&
    !validator.isLength(value, {
      max: _.get(config, 'max'),
    })
  ) {
    throw new ValidationError(
      __(
        'validation.validators.length.messages.maxLength:The maximum length of the value is {{length}} characters',
        {
          length: _.get(config, 'max'),
        }
      )
    );
  }

  // Check if max length was configured
  if (
    _.has(config, 'min') &&
    !validator.isLength(value, {
      min: _.get(config, 'min'),
    })
  ) {
    throw new ValidationError(
      __(
        'validation.validators.length.messages.minLength:The value needs to be at least {{length}} characters long',
        {
          length: _.get(config, 'min'),
        }
      )
    );
  }
}

/**
 * Checks if the value has the specified length
 * @param values
 * @param field
 * @param __
 * @param config
 */
export function regex(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function,
  config: {
    [x: string]: any;
  }
) {
  const value = _.get(values, field);
  if (!_.isString(value)) {
    throw new ValidationError(
      __('validation.validators.regex.messages.noValue:Please provide a value')
    );
  }

  // Check if regex matches
  if (
    !validator.matches(value, _.get(config, 'pattern', _.get(config, 'regex')))
  ) {
    throw new ValidationError(
      __(
        'validation.validators.regex.messages.doesNotMatch:The input value has an invalid format'
      )
    );
  }
}

/**
 * Checks if the given value is a valid global ID as used by nodes
 * @param values
 * @param field
 * @param __
 * @param config
 */
export function gid(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function,
  config: {
    [x: string]: any;
  }
) {
  const value = _.get(values, field);
  if (!_.isString(value)) {
    throw new ValidationError(
      __('validation.validators.gid.messages.noValue:Please provide a value')
    );
  }

  // Check if we have
  try {
    const { id, type } = fromGlobalId(value);

    // We have specific type
    if (
      config.hasOwnProperty('types') &&
      _.isArray(config.types) &&
      !_.includes(config.types, type)
    ) {
      throw new Error('ID for invalid type provided');
    } else if (!validator.matches(type, '^([A-Za-z0-9_]+)$')) {
      throw new Error('Invalid type name');
    }

    // Check if ID portion is valid UUID
    switch (_.get(config, 'idType', 'int')) {
      case 'int':
        if (!validator.isNumeric(id)) {
          throw new Error('Invalid ID');
        }
        break;
      case 'uuid':
        if (!validator.isUUID(id)) {
          throw new Error('Invalid UUID');
        }
        break;
      case 'privateModule':
        if (!id.match(/^@private\/([a-z0-9]+)((-[a-z0-9]+)*)$/)) {
          throw new Error('Invalid app ID');
        }
        break;
      case 'module':
        if (!id.match(/^(@private\/)?([a-z0-9]+)((-[a-z0-9]+)*)$/)) {
          throw new Error('Invalid app ID');
        }
        break;
      default:
        throw new Error('Invalid ID type');
    }
  } catch (e) {
    throw new ValidationError(
      __(
        'validation.validators.gid.messages.invalidValue:The provided value is invalid'
      )
    );
  }
}

/**
 * Checks if value is a valid email
 * @param values
 * @param field
 * @param __
 * @param config // Configuration as per validator.isURL(options)
 */
export function url(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function,
  config: {
    [x: string]: any;
  }
) {
  const mergedConfig = {
    /* eslint-disable camelcase */
    protocols: config.protocols || ['http', 'https'],
    require_tld: false,
    require_protocol: true,
    /* eslint-enable camelcase */
  };
  if (
    _.isString(_.get(values, field)) &&
    validator.isURL(_.get(values, field), mergedConfig)
  ) {
    return;
  }

  throw new ValidationError(
    __('validation.validators.url.message:Please provide a valid URL')
  );
}

export function compareNumber(
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function,
  config: {
    [x: string]: any;
  }
) {
  const value = _.get(values, field);
  if (_.isNumber(value)) {
    // Validate gte value
    const gte = _.get(config, 'gte');
    if (gte !== null && value < gte) {
      throw new ValidationError(
        __(
          'validation.validators.compareNumber.message.gte:The provided value needs to be greater than or equal to {{value}}',
          {
            value: gte,
          }
        )
      );
    }

    // Validate gt value
    const gt = _.get(config, 'gt');
    if (gt !== null && value <= gt) {
      throw new ValidationError(
        __(
          'validation.validators.compareNumber.message.gt:The provided value needs to be greater than {{value}}',
          {
            value: gt,
          }
        )
      );
    }

    // Validate gt value
    const lt = _.get(config, 'lt');
    if (lt !== null && value >= lt) {
      throw new ValidationError(
        __(
          'validation.validators.compareNumber.message.lt:The provided value needs to be less than {{value}}',
          {
            value: lt,
          }
        )
      );
    }

    // Validate gt value
    const lte = _.get(config, 'lte');
    if (lte !== null && value > lte) {
      throw new ValidationError(
        __(
          'validation.validators.compareNumber.message.lte:The provided value needs to be less than or equal to {{value}}',
          {
            value: lte,
          }
        )
      );
    }

    return;
  }

  throw new ValidationError(
    __(
      'validation.validators.compareNumber.message.type:Please provide a valid number'
    )
  );
}
