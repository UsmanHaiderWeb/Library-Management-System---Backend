/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import ImageKit from "imagekit";

export const getImageKitAuthenticationTokens = async (_: Request, res: Response): Promise<void> => {
    try {
        const imageKit = new ImageKit({
            publicKey: process.env.IMAGE_KIT_PUBLIC_KEY || '',
            privateKey: process.env.IMAGE_KIT_PRIVATE_KEY || '',
            urlEndpoint: process.env.IMAGE_KIT_URL || '',
        });

        // Check if required environment variables are present
        if (
            !process.env.IMAGE_KIT_PUBLIC_KEY ||
            !process.env.IMAGE_KIT_PRIVATE_KEY ||
            !process.env.IMAGE_KIT_URL
        ) {
            res.status(500).json({ message: "ImageKit environment variables are not properly set." });
            return;
        }

        const { token, expire, signature } = imageKit.getAuthenticationParameters();
        res.status(201).json({ token, expire, signature, publicKey: process.env.IMAGE_KIT_PUBLIC_KEY });
        return;
    } catch (error: any) {
        console.error("Error generating ImageKit authentication tokens:", error?.message || error);
        res.status(500).json({ message: "Failed to generate ImageKit authentication tokens." });
        return;
    }
};