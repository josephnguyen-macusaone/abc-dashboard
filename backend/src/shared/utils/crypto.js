import crypto from 'crypto';

// Generate a secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate a secure hash for tokens
const generateTokenHash = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export {
  generateToken,
  generateTokenHash
};
