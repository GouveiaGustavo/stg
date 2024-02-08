const { Command } = require('@adonisjs/ace');

class TimezoneTester extends Command {
  static get signature() {
    return 'timezone:tester';
  }

  static get description() {
    return 'Tell something helpful about this command';
  }

  async handle(args, options) {
    this.info(new Date());
  }
}

module.exports = TimezoneTester;
