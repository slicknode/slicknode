require('../lib')
  .run()
  .then(require('@oclif/command/flush'))
  .catch(require('@oclif/errors/handle'));
