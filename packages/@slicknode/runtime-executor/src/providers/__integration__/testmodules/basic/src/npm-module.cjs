/**
 * Created by Ivo Meißner on 21.01.18.
 */
/* eslint-disable */

const _ = require('lodash');

module.exports = function () {
  const data = { test: 3 };
  return _.get(data, 'test');
};
