import Context, { ContextOptions } from '../Context';
import SchemaBuilder from '../../schema/builder';
import httpMocks from 'node-mocks-http';
import { JWT_SECRET } from '../../config';
import { baseModules } from '../../modules';
import { expect } from 'chai';
import { Path } from 'graphql/jsutils/Path';
import { UnconfiguredRuntime } from '@slicknode/runtime-executor';

function createContext(options: Partial<ContextOptions>): Context {
  const schemaBuilder = new SchemaBuilder({ modules: baseModules });
  const req = httpMocks.createRequest!({
    headers: {
      host: 'localhost:3000',
    },
  });

  const res = httpMocks.createResponse();

  // Add dummy translator
  res.__ = (text) => text;

  return new Context({
    res,
    req,
    jwtSecret: JWT_SECRET,
    schemaBuilder,
    ...options,
  });
}

function createPath(elements: Array<string | number>): Path {
  let current: Path = undefined;
  elements.forEach((element) => {
    current = {
      key: element,
      prev: current,
      typename: undefined,
    };
  });
  return current;
}

describe('Context', () => {
  describe('Runtime', () => {
    it('sets and returns runtime', async () => {
      const context = createContext({});
      const runtime = new UnconfiguredRuntime();
      const moduleId = 'somemodule';
      context.setRuntime(moduleId, runtime);
      expect(await context.getRuntime(moduleId)).to.equal(runtime);
    });
  });
  describe('Locale Setting', () => {
    it('returns the default locale for root level field', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });
      expect(
        context.getLocale({
          key: 'someField',
          prev: undefined,
          typename: undefined,
        })
      ).to.equal(defaultLocale);
    });

    it('returns the default locale for nested level field', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });
      expect(context.getLocale(createPath(['field', 'someSubfield']))).to.equal(
        defaultLocale
      );
    });

    it('returns the specific locale for nested level field', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });

      context.setLocale(createPath(['field1', 'field2', 'field3']), 'en-US');
      expect(
        context.getLocale(createPath(['field1', 'field2', 'field3']))
      ).to.equal('en-US');
    });

    it('returns parent locale for unknown field', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });

      context.setLocale(createPath(['field1', 'field2', 'field3']), 'en-US');
      expect(
        context.getLocale(createPath(['field1', 'field2', 'field3', 'unknown']))
      ).to.equal('en-US');
    });

    it('returns locale in the middle of path', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });

      context.setLocale(createPath(['en', 'de', 'ru', 'fr']), 'fr');
      context.setLocale(createPath(['en', 'de', 'ru']), 'ru');
      context.setLocale(createPath(['en', 'de']), 'de');
      context.setLocale(createPath(['en']), 'en');
      expect(context.getLocale(createPath(['en', 'de']))).to.equal('de');
      expect(context.getLocale(createPath(['en', 'de', 'ru']))).to.equal('ru');
    });

    it('handles skipped path elements', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });

      context.setLocale(createPath(['en', 'de', 'ru', 'fr']), 'fr');
      context.setLocale(createPath(['en', 'de', 'ru']), 'ru');
      context.setLocale(createPath(['en']), 'en');
      expect(context.getLocale(createPath(['en', 'de']))).to.equal('en');
      expect(context.getLocale(createPath(['en', 'de', 'ru']))).to.equal('ru');
      expect(context.getLocale(createPath(['en', 'de', 'ru', 'fr']))).to.equal(
        'fr'
      );
      expect(
        context.getLocale(createPath(['en', 'de', 'ru', 0, 'fr']))
      ).to.equal('ru');
    });
  });

  describe('Preview Setting', () => {
    it('returns the default preview setting for root level field', () => {
      const context = createContext({});
      expect(
        context.getPreview({
          key: 'someField',
          prev: undefined,
          typename: undefined,
        })
      ).to.equal(false);
    });

    it('returns the default preview setting for nested level field', () => {
      const context = createContext({});
      expect(
        context.getPreview(createPath(['field', 'someSubfield']))
      ).to.equal(false);
    });

    it('returns the specific preview setting for nested level field', () => {
      const context = createContext({});

      context.setPreview(createPath(['field1', 'field2', 'field3']), true);
      expect(
        context.getPreview(createPath(['field1', 'field2', 'field3']))
      ).to.equal(true);
    });

    it('returns defaultPreview setting from options', () => {
      const context = createContext({
        defaultPreview: true,
      });

      expect(
        context.getPreview(createPath(['field1', 'field2', 'field3']))
      ).to.equal(true);
    });

    it('returns parent preview setting for unknown field', () => {
      const context = createContext({});

      context.setPreview(createPath(['field1', 'field2', 'field3']), true);
      expect(
        context.getPreview(
          createPath(['field1', 'field2', 'field3', 'unknown'])
        )
      ).to.equal(true);
    });

    it('returns locale in the middle of path', () => {
      const defaultLocale = 'de-DE';
      const context = createContext({
        defaultLocale,
      });

      context.setPreview(createPath(['true', 'false', 'true', 'false']), false);
      context.setPreview(createPath(['true', 'false', 'true']), true);
      context.setPreview(createPath(['true', 'false']), false);
      context.setPreview(createPath(['true']), true);
      expect(context.getPreview(createPath(['true', 'false']))).to.equal(false);
      expect(
        context.getPreview(createPath(['true', 'false', 'true']))
      ).to.equal(true);
    });

    it('handles skipped path elements', () => {
      const context = createContext({});

      context.setPreview(createPath(['true', 'none', 'none', 'true']), true);
      context.setPreview(createPath(['true']), true);
      context.setPreview(createPath(['true', 'false']), false);
      expect(context.getPreview(createPath(['true', 'none']))).to.equal(true);
      expect(
        context.getPreview(createPath(['true', 'false', 'unknown']))
      ).to.equal(false);
      expect(
        context.getPreview(
          createPath(['true', 'none', 'none', 'true', 'unknown'])
        )
      ).to.equal(true);
      expect(
        context.getPreview(
          createPath(['true', 'none', 0, 'none', 'true', 'unknown'])
        )
      ).to.equal(true);
    });
  });
});
