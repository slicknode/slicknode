/**
 * Created by Ivo Meißner on 21.01.18.
 */
/* eslint-disable */

const returnContext = require('./return-context.cjs');

module.exports = function (event, context) {
  return returnContext(event, context);
};
