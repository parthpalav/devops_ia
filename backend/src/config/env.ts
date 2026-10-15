import { z } from 'zod';

/** Fault-injection modes. `none` is the only safe/default value; see README "Fault injection". */
export const FAULT_MODES = ['none', 'drop_ticket_write'] as const;
export type FaultMode = (typeof FAULT_MODES)[number];

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGIN: z.string().default('http://localhost:8080,http://localhost:5173'),
  // Test-only endpoints are OFF unless explicitly enabled.
  ENABLE_TEST_ENDPOINTS: booleanFlag,
  // Fault injection is OFF unless explicitly set to a known mode.
  FAULT_INJECTION_MODE: z.enum(FAULT_MODES).default('none'),
});

export type AppConfig = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  enableTestEndpoints: boolean;
  faultInjectionMode: FaultMode;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Report which variables are wrong without echoing their (possibly secret) values.
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid backend configuration:\n  - ${problems.join('\n  - ')}`);
  }
  const value = parsed.data;
  return {
    port: value.PORT,
    databaseUrl: value.DATABASE_URL,
    jwtSecret: value.JWT_SECRET,
    jwtExpiresIn: value.JWT_EXPIRES_IN,
    corsOrigins: value.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    enableTestEndpoints: value.ENABLE_TEST_ENDPOINTS,
    faultInjectionMode: value.FAULT_INJECTION_MODE,
  };
}
