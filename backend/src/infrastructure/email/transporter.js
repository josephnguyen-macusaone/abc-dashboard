import nodemailer from 'nodemailer';
import { config as appConfig } from '../config/config.js';
import logger from '../config/logger.js';

function coerceBoolean(value) {
  if (value === true || value === false) {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}

function coerceNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export function normalizeEmailConfig(env = appConfig) {
  const service = env.EMAIL_SERVICE;
  const host =
    env.EMAIL_HOST ||
    (service === 'mailhog'
      ? 'localhost'
      : service === 'mailjet'
        ? 'in-v3.mailjet.com'
        : 'smtp.gmail.com');
  const port =
    coerceNumber(env.EMAIL_PORT) ??
    (service === 'mailhog'
      ? 1025
      : env.EMAIL_SECURE === true || env.EMAIL_SECURE === 'true'
        ? 465
        : 587);
  const secure = coerceBoolean(env.EMAIL_SECURE) || port === 465;

  return {
    service,
    host,
    port,
    secure,
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME || 'ABC Dashboard',
  };
}

export function createEmailTransporter(env = appConfig, meta = {}) {
  const resolved = normalizeEmailConfig(env);
  const { service, host, port, secure } = resolved;

  let transporterConfig;

  if (service === 'mailhog') {
    logger.info('Using MailHog for email service', { ...meta, host, port });
    transporterConfig = {
      host,
      port,
      secure: false,
      tls: { rejectUnauthorized: false },
    };
  } else if (service === 'google-workspace') {
    if (!resolved.user || !resolved.pass) {
      throw new Error('Google Workspace SMTP requires EMAIL_USER and EMAIL_PASS (App Password)');
    }
    if (!resolved.from) {
      throw new Error('Google Workspace SMTP requires EMAIL_FROM address');
    }

    logger.info('Using Google Workspace SMTP for email service', { ...meta, host, port });
    transporterConfig = {
      host,
      port,
      secure: false,
      auth: { user: resolved.user, pass: resolved.pass },
      tls: { ciphers: 'SSLv3', rejectUnauthorized: false },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 30000,
      greetingTimeout: 10000,
      socketTimeout: 60000,
    };
  } else if (service === 'mailjet') {
    if (!resolved.user || !resolved.pass) {
      throw new Error('Mailjet requires EMAIL_USER (API Key) and EMAIL_PASS (Secret Key)');
    }

    logger.info('Using Mailjet SMTP for email service', { ...meta, host, port, secure });
    transporterConfig = {
      host,
      port,
      secure,
      auth: { user: resolved.user, pass: resolved.pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    };
  } else if (service === 'gmail') {
    logger.warn('Using legacy Gmail configuration', { ...meta });
    transporterConfig = {
      service: 'gmail',
      auth: { user: resolved.user, pass: resolved.pass },
    };
  } else {
    logger.info('Using generic SMTP configuration', { ...meta, host, port, secure });
    transporterConfig = {
      host,
      port,
      secure,
      auth:
        resolved.user && resolved.pass
          ? {
              user: resolved.user,
              pass: resolved.pass,
            }
          : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 30000,
    };
  }

  return nodemailer.createTransport(transporterConfig);
}
