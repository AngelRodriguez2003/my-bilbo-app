import { normalizeProjectUrl } from '@/lib/supabaseUrl';

const PROJECT = 'https://abcdefghijklmnop.supabase.co';

describe('normalizeProjectUrl', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('leaves a correct project URL untouched and stays quiet', () => {
    expect(normalizeProjectUrl(PROJECT)).toBe(PROJECT);
    expect(warn).not.toHaveBeenCalled();
  });

  it('strips trailing slashes without complaining', () => {
    expect(normalizeProjectUrl(`${PROJECT}/`)).toBe(PROJECT);
    expect(normalizeProjectUrl(`${PROJECT}///`)).toBe(PROJECT);
    expect(warn).not.toHaveBeenCalled();
  });

  it('strips the REST endpoint and warns: it is what causes PGRST125', () => {
    expect(normalizeProjectUrl(`${PROJECT}/rest/v1/`)).toBe(PROJECT);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('/rest/v1');
  });

  it('trims surrounding whitespace pasted from the dashboard', () => {
    expect(normalizeProjectUrl(`  ${PROJECT}  `)).toBe(PROJECT);
  });

  it('passes an unparseable value through for supabase-js to reject', () => {
    expect(normalizeProjectUrl('no-es-una-url')).toBe('no-es-una-url');
  });

  it('treats missing or empty config as unconfigured', () => {
    expect(normalizeProjectUrl(undefined)).toBeUndefined();
    expect(normalizeProjectUrl('   ')).toBeUndefined();
  });
});
