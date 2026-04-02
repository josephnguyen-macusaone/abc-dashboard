/**
 * ResendVerificationUseCase unit tests
 */
import { jest } from '@jest/globals';
import { ResendVerificationUseCase } from '../../../src/application/use-cases/auth/resend-verification-use-case.js';
import { ValidationException } from '../../../src/domain/exceptions/domain.exception.js';

describe('ResendVerificationUseCase', () => {
  let useCase;
  let mockUserRepository;
  let mockTokenService;
  let mockEmailService;

  beforeEach(() => {
    mockUserRepository = { findByEmail: jest.fn() };
    mockTokenService = { generateEmailVerificationToken: jest.fn().mockReturnValue('verify-jwt') };
    mockEmailService = { sendEmailVerification: jest.fn().mockResolvedValue(undefined) };
    useCase = new ResendVerificationUseCase(mockUserRepository, mockTokenService, mockEmailService);
  });

  it('throws ValidationException when email is missing', async () => {
    await expect(useCase.execute({ email: '' })).rejects.toThrow(ValidationException);
  });

  it('returns generic message when user not found', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    const result = await useCase.execute({ email: 'nobody@example.com' });
    expect(result.message).toContain('If an account exists');
    expect(mockEmailService.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('returns generic message when already verified', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      emailVerified: true,
    });
    const result = await useCase.execute({ email: 'a@b.com' });
    expect(result.message).toContain('If an account exists');
    expect(mockEmailService.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('sends verification when user exists and not verified', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      displayName: 'Alice',
      emailVerified: false,
    });
    const result = await useCase.execute({ email: 'A@B.com' });
    expect(result.message).toContain('If an account exists');
    expect(mockTokenService.generateEmailVerificationToken).toHaveBeenCalledWith('u1', 'a@b.com');
    expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
      'a@b.com',
      'Alice',
      'verify-jwt'
    );
  });
});
