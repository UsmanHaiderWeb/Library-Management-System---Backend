/**
 * The dev verification bypass must be impossible to enable by accident.
 * NODE_ENV defaults to 'development', so gating on that alone would arm a
 * backdoor on any install that simply forgot to set it.
 */
describe('devOtpCode gate', () => {
    const load = (env: Record<string, string | undefined>) => {
        jest.resetModules();
        const previous = { ...process.env };
        // Assigning undefined to process.env stores the string "undefined",
        // which then fails the schema instead of reading as unset
        for (const [key, value] of Object.entries(env)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
        // Required by the schema regardless of what we are testing
        process.env.DATABASE_URL ??= 'mysql://root:test@localhost:3306/lmstest';
        process.env.JWT_SECRET ??= 'test-jwt-secret-not-a-real-one';
        process.env.Session_Secret ??= 'test-session-secret-not-a-real-one';
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../../src/config');
        const value = mod.devOtpCode();
        process.env = previous;
        return value;
    };

    it('is off when nothing is configured', () => {
        expect(load({ NODE_ENV: 'development', DEV_OTP_CODE: undefined })).toBeNull();
    });

    it('is off in production even when a code is set', () => {
        expect(load({ NODE_ENV: 'production', DEV_OTP_CODE: '000000' })).toBeNull();
    });

    it('is off in test even when a code is set', () => {
        expect(load({ NODE_ENV: 'test', DEV_OTP_CODE: '000000' })).toBeNull();
    });

    it('is on only with both switches deliberately set', () => {
        expect(load({ NODE_ENV: 'development', DEV_OTP_CODE: '000000' })).toBe('000000');
    });
});
