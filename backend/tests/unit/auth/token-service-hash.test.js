describe('TokenService hashToken', () => {
  let TokenService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    ({ TokenService } = await import('../../../src/shared/services/token-service.js'));
  });

  it('produces a deterministic sha256 hash', () => {
    const service = new TokenService();
    const token = 'sample-token';
    const hash1 = service.hashToken(token);
    const hash2 = service.hashToken(token);

    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64); // sha256 hex length
  });
});
