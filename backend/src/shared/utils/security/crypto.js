import crypto from 'crypto';

const generateTemporaryPassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one uppercase, lowercase, number, and special char
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[crypto.randomInt(26)]; // lowercase
  password += '0123456789'[crypto.randomInt(10)]; // number
  password += '!@#$%^&*'[crypto.randomInt(8)]; // special char

  // Fill remaining length with random chars
  for (let i = password.length; i < length; i++) {
    password += chars[crypto.randomInt(chars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(2) - 1)
    .join('');
};

export { generateTemporaryPassword };
