function envEnabled(value: string | undefined, defaultValue = true): boolean {
  if (value == null || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

export const FEATURE_FLAGS = {
  agentModule: envEnabled(process.env.NEXT_PUBLIC_FEATURE_AGENT_MODULE, true),
  techModule: envEnabled(process.env.NEXT_PUBLIC_FEATURE_TECH_MODULE, true),
  accountantModule: envEnabled(process.env.NEXT_PUBLIC_FEATURE_ACCOUNTANT_MODULE, true),
};
