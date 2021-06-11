import { flags } from '@oclif/command';

export const range = flags.build({
  parse: (value: string): number[] => {
    if (!value.match(/^(\d+)(-\d+)?$/)) {
      throw new Error('Invalid range value provided');
    }
    const parts = value.split('-');
    const valueRange = [
      parseInt(parts[0], 10),
      parseInt(parts[parts.length === 1 ? 0 : 1], 10),
    ];

    if (valueRange[0] > valueRange[1]) {
      throw new Error('Min value cannot be smaller than max');
    }
    return valueRange;
  },
});
