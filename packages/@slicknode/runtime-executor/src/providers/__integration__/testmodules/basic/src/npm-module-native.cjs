/**
 * Created by Ivo Meißner on 21.01.18.
 */
/* eslint-disable */

const bcrypt = require('bcrypt');

module.exports = function () {
  return bcrypt.hash('password', 1);
};
