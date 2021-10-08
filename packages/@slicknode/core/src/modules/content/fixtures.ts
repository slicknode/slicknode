import { DataFixture } from '../../definition/DataFixture';

export const fixtures: DataFixture[] = [
  {
    type: 'Locale',
    data: {
      code: 'en',
      name: 'English',
      isActive: true,
      isDefault: true,
    },
  },
  {
    type: 'ContentStatus',
    data: {
      name: 'DRAFT',
      label: 'Draft',
    },
  },
  {
    type: 'ContentStatus',
    data: {
      name: 'PUBLISHED',
      label: 'Published',
    },
  },
];
