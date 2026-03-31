# Backend Interface Contract Conventions

## Goal

Keep dependency contracts explicit in backend use-cases without changing runtime behavior.

## Current Architecture

- Repository contracts live in `backend/src/domain/repositories/interfaces`.
- Application service contracts live in `backend/src/application/interfaces`.
- Concrete implementations are wired by DI in `backend/src/shared/kernel/container.js`.

## Constructor Typing Standard (Use Cases)

For every use-case file:

1. Add local typedef imports near top of file:

```js
/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-auth-service.js').IAuthService} IAuthService */
```

2. Add constructor param contracts:

```js
/**
 * @param {IUserRepository} userRepository
 * @param {IAuthService} authService
 */
constructor(userRepository, authService) {
  this.userRepository = userRepository;
  this.authService = authService;
}
```

3. Use nullable optional style consistently when needed:

```js
/**
 * @param {IEmailService | null} [emailService=null]
 */
```

## Service Implementation Standard

Concrete service classes should extend their interface class:

- `AuthService extends IAuthService`
- `TokenService extends ITokenService`
- `EmailService extends IEmailService`
- `LicenseLifecycleService extends ILicenseLifecycleService`
- `ExternalLicenseApiService extends IExternalLicenseApiService`
- `LicenseService extends ILicenseService`

This is for contract clarity only; no polymorphic runtime wiring changes are required.

## Naming Rules

- Interface files: `i-<domain>-service.js` (application) or `i-<entity>-repository.js` (domain).
- Interface class names: `I<Auth|Token|Email|...>Service`, `I<User|License|...>Repository`.
- Use-case typedef aliases should match interface class names exactly.

## When Adding New Use Cases

Checklist:

- Identify injected dependencies (repositories/services).
- Add typedef imports for each dependency interface.
- Add constructor `@param` annotations.
- Keep DTO/input/output docs unchanged unless behavior changes.

## Non-Goals

- Do not duplicate repository interfaces in application layer.
- Do not modify DI resolution semantics for interface-only changes.
- Do not mix business behavior changes with contract-typing commits.
