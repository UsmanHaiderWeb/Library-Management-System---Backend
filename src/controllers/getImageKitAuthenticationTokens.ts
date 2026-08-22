/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import ImageKit from "imagekit";
import logger from '../helpers/logger';

export const getImageKitAuthenticationTokens = async (_: Request, res: Response): Promise<void> => {
    try {
        // Checked before constructing the client, not after: ImageKit's
        // constructor throws on empty keys, so this guard used to be
        // unreachable and a plainly unconfigured install got the generic
        // "failed to generate" message instead of being told what was wrong.
        // The placeholder from .env.example counts as unset -- it is the state
        // a fresh install is actually in.
        const publicKey = process.env.IMAGE_KIT_PUBLIC_KEY;
        const privateKey = process.env.IMAGE_KIT_PRIVATE_KEY;
        const urlEndpoint = process.env.IMAGE_KIT_URL;

        if (!publicKey || !privateKey || !urlEndpoint || urlEndpoint.includes('your-id')) {
            res.status(503).json({
                message: 'File uploads are not configured on this server. Set IMAGE_KIT_URL, '
                    + 'IMAGE_KIT_PUBLIC_KEY and IMAGE_KIT_PRIVATE_KEY, then restart the API.',
            });
            return;
        }

        const imageKit = new ImageKit({ publicKey, privateKey, urlEndpoint });

        const { token, expire, signature } = imageKit.getAuthenticationParameters();
        res.status(201).json({ token, expire, signature, publicKey });
        return;
    } catch (error: any) {
        logger.error("Error generating ImageKit authentication tokens:", error?.message || error);
        res.status(500).json({ message: "Failed to generate ImageKit authentication tokens." });
        return;
    }
};