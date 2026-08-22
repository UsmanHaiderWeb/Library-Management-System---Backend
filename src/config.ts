import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().transform(Number).default(3000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(10),
    Session_Secret: z.string().min(10),
    REDIS_URL: z.string().url().optional().default('redis://localhost:6379'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    // Comma-separated list of browser origins allowed to call this API.
    // Set this per college install to the portals' real addresses.
    CORS_ORIGINS: z.string().optional(),

    // A fixed code that verifies any email, so development and demos do not
    // need working SMTP. Deliberately opt-in rather than derived from
    // NODE_ENV: that defaults to 'development', so an install which simply
    // forgot to set it would otherwise ship a working backdoor. It takes both
    // this variable AND NODE_ENV=development to enable.
    DEV_OTP_CODE: z.string().length(6).optional(),

    EMAIL_HOST: z.string().default('smtp.gmail.com'),
    EMAIL_PORT: z.string().default('587'),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),

    // ImageKit
    IMAGE_KIT_PUBLIC_KEY: z.string().optional(),
    IMAGE_KIT_PRIVATE_KEY: z.string().optional(),
    IMAGE_KIT_URL: z.string().url().optional(),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
    console.error('❌ Invalid environment variables:', envVars.error.format());
    process.exit(1);
}

export const config = envVars.data;

/**
 * Browser origins permitted by CORS.
 *
 * Defaults cover both portals in dev (5173/5174) and in `vite preview`
 * (4173/4174). A real deployment sets CORS_ORIGINS to the portals' actual
 * addresses — anything not listed here is rejected by the browser.
 */
export const corsOrigins: string[] = Array.from(new Set(
    (config.CORS_ORIGINS
        ? config.CORS_ORIGINS.split(',')
        : [
            'http://localhost:3000',
            'http://localhost:5173', // Admin dev
            'http://localhost:5174', // Student dev
            'http://localhost:4173', // Admin  vite preview
            'http://localhost:4174', // Student vite preview
            config.FRONTEND_URL,
        ]
    ).map((origin) => origin.trim()).filter(Boolean)
));

// For backward compatibility with existing code using configVariables
export const configVariables = {
    port: config.PORT,
};

/**
 * True only when a fixed verification code is explicitly configured *and* the
 * server is running in development. Two independent switches, both of which
 * must be deliberate, because the failure mode is anyone verifying any email.
 */
export const devOtpCode = (): string | null =>
    config.NODE_ENV === 'development' && config.DEV_OTP_CODE ? config.DEV_OTP_CODE : null;
