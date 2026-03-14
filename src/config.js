"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configVariables = exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().transform(Number).default(3000),
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(10),
    Session_Secret: zod_1.z.string().min(10),
    REDIS_URL: zod_1.z.string().url().optional().default('redis://localhost:6379'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    EMAIL_HOST: zod_1.z.string().default('smtp.gmail.com'),
    EMAIL_PORT: zod_1.z.string().default('587'),
    EMAIL_USER: zod_1.z.string().optional(),
    EMAIL_PASS: zod_1.z.string().optional(),
    // ImageKit
    IMAGE_KIT_PUBLIC_KEY: zod_1.z.string().optional(),
    IMAGE_KIT_PRIVATE_KEY: zod_1.z.string().optional(),
    IMAGE_KIT_URL: zod_1.z.string().url().optional(),
});
const envVars = envSchema.safeParse(process.env);
if (!envVars.success) {
    console.error('❌ Invalid environment variables:', envVars.error.format());
    process.exit(1);
}
exports.config = envVars.data;
// For backward compatibility with existing code using configVariables
exports.configVariables = {
    port: exports.config.PORT,
};
