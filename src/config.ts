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

// For backward compatibility with existing code using configVariables
export const configVariables = {
    port: config.PORT,
};
