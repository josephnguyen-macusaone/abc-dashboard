import {
  resolveApiBaseUrl,
  API_URL_ENV_KEY,
  USE_RELATIVE_API_ENV_KEY,
  DEFAULT_API_BASE_URL,
  RELATIVE_API_PATH,
} from '../api';

describe('resolveApiBaseUrl', () => {
  it('returns relative path when USE_RELATIVE_API is true', () => {
    const env = { [USE_RELATIVE_API_ENV_KEY]: 'true' };
    expect(resolveApiBaseUrl(env)).toBe(RELATIVE_API_PATH);
  });

  it('returns relative path when USE_RELATIVE_API is true and API_URL is set', () => {
    const env = {
      [USE_RELATIVE_API_ENV_KEY]: 'true',
      [API_URL_ENV_KEY]: 'http://example.com/api/v1',
    };
    expect(resolveApiBaseUrl(env)).toBe(RELATIVE_API_PATH);
  });

  it('returns default URL when env is empty', () => {
    expect(resolveApiBaseUrl({})).toBe(DEFAULT_API_BASE_URL);
  });

  it('returns default URL when API_URL is undefined', () => {
    expect(resolveApiBaseUrl({ [API_URL_ENV_KEY]: undefined })).toBe(DEFAULT_API_BASE_URL);
  });

  it('returns default URL when API_URL is empty string', () => {
    expect(resolveApiBaseUrl({ [API_URL_ENV_KEY]: '' })).toBe(DEFAULT_API_BASE_URL);
  });

  it('returns default URL when API_URL is whitespace only', () => {
    expect(resolveApiBaseUrl({ [API_URL_ENV_KEY]: '   ' })).toBe(DEFAULT_API_BASE_URL);
  });

  it('returns normalized URL for valid http URL', () => {
    const url = 'http://localhost:5000/api/v1';
    expect(resolveApiBaseUrl({ [API_URL_ENV_KEY]: url })).toBe(url);
  });

  it('returns normalized URL for valid https URL', () => {
    const url = 'https://api.example.com/api/v1';
    expect(resolveApiBaseUrl({ [API_URL_ENV_KEY]: url })).toBe(url);
  });

  it('strips trailing slash from absolute URL', () => {
    expect(
      resolveApiBaseUrl({ [API_URL_ENV_KEY]: 'http://localhost:5000/api/v1/' })
    ).toBe('http://localhost:5000/api/v1');
  });

  it('adds http for protocol-less localhost', () => {
    expect(
      resolveApiBaseUrl({ [API_URL_ENV_KEY]: 'localhost:5000/api/v1' })
    ).toBe('http://localhost:5000/api/v1');
  });

  it('adds http for protocol-less 127.0.0.1', () => {
    expect(
      resolveApiBaseUrl({ [API_URL_ENV_KEY]: '127.0.0.1:5000/api/v1' })
    ).toBe('http://127.0.0.1:5000/api/v1');
  });

  it('adds https for protocol-less hostname', () => {
    expect(
      resolveApiBaseUrl({ [API_URL_ENV_KEY]: 'api.example.com/api/v1' })
    ).toBe('https://api.example.com/api/v1');
  });

  it('trims whitespace from URL', () => {
    expect(
      resolveApiBaseUrl({ [API_URL_ENV_KEY]: '  http://localhost:5000/api/v1  ' })
    ).toBe('http://localhost:5000/api/v1');
  });

  it('returns default for invalid URL (malformed)', () => {
    const env = { [API_URL_ENV_KEY]: 'http://[invalid' };
    expect(resolveApiBaseUrl(env)).toBe(DEFAULT_API_BASE_URL);
  });

  it('relative path has no trailing slash', () => {
    expect(RELATIVE_API_PATH.endsWith('/')).toBe(false);
  });

  it('default base URL has no trailing slash', () => {
    expect(DEFAULT_API_BASE_URL.endsWith('/')).toBe(false);
  });
});
