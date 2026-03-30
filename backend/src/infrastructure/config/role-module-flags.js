function envEnabled(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase() === 'true';
}

export const roleModuleFlags = {
  agent: envEnabled(process.env.FEATURE_AGENT_MODULE, true),
  tech: envEnabled(process.env.FEATURE_TECH_MODULE, true),
  accountant: envEnabled(process.env.FEATURE_ACCOUNTANT_MODULE, true),
};

export function isRoleModuleEnabled(role) {
  if (role === 'agent') {
    return roleModuleFlags.agent;
  }
  if (role === 'tech') {
    return roleModuleFlags.tech;
  }
  if (role === 'accountant') {
    return roleModuleFlags.accountant;
  }
  return true;
}
