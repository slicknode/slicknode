import * as Config from '@oclif/config';
import Help from '@oclif/plugin-help';
import {renderList} from '@oclif/plugin-help/lib/list';
import {compact} from '@oclif/plugin-help/lib/util';
import chalk from 'chalk';
const {bold} = chalk;
import CommandHelp from '@oclif/plugin-help/lib/command';
import indent from 'indent-string';
import stripAnsi from 'strip-ansi';
import wrap from 'wrap-ansi';

export class SlicknodeHelp extends Help {
  public topic(topic: Config.Topic): string {
    let description = this.render(topic.description || '');
    const title = description.split('\n')[0];
    description = description.split('\n').slice(1).join('\n');
    let output = compact([
      title,
      [
        bold('USAGE'),
        indent(
          wrap(
            `$ ${this.config.bin} ${topic.name.replace(/:/g, ' ')} COMMAND`,
            this.opts.maxWidth - 2,
            {trim: false, hard: true},
          ),
          2,
        ),
      ].join('\n'),
      description && ([
        bold('DESCRIPTION'),
        indent(wrap(description, this.opts.maxWidth - 2, {trim: false, hard: true}), 2),
      ].join('\n')),
    ]).join('\n\n');
    if (this.opts.stripAnsi) { output = stripAnsi(output); }
    return output + '\n';
  }

  public command(command: Config.Command): string {
    const help = new CommandHelp(command, this.config, this.opts);
    return help.generate();
  }

  public topics(topics: Config.Topic[]): string | undefined {
    if (!topics.length) { return; }
    const body = renderList(topics.map((c) => [
      c.name.replace(/:/g, ' '),
      c.description && this.render(c.description.split('\n')[0]),
    ]), {
      spacer: '\n',
      stripAnsi: this.opts.stripAnsi,
      maxWidth: this.opts.maxWidth - 2,
    });
    return [
      bold('COMMANDS'),
      indent(body, 2),
    ].join('\n');
  }
}
