/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';
import { getImageKit, getTransformedUrl, avatarTransforms } from '../../helpers/imagekit';

/**
 * Upload or update user avatar via ImageKit (server-side upload)
 * Expects multipart/form-data with field name "avatar"
 */
export const uploadAvatarController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.id) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const file = req.file;
        if (!file) {
            res.status(400).json({ message: 'No file provided. Send an image file with field name "avatar".' });
            return;
        }

        // Validate file type
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(file.mimetype)) {
            res.status(400).json({ message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF.' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
            return;
        }

        const imagekit = getImageKit();

        // Upload to ImageKit
        const uploadResult = await imagekit.upload({
            file: file.buffer,
            fileName: `avatar_${user.id}_${Date.now()}`,
            folder: '/avatars',
            tags: ['avatar', user.id],
        });

        // Delete old avatar from ImageKit if it exists
        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { avatarFileId: true }
        });

        if (currentUser?.avatarFileId) {
            try {
                await imagekit.deleteFile(currentUser.avatarFileId);
            } catch {
                // Ignore delete errors for old avatar
            }
        }

        // Update user with new avatar URL
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                avatar: uploadResult.url,
                avatarFileId: uploadResult.fileId,
            },
            select: {
                id: true,
                avatar: true,
            }
        });

        res.status(200).json({
            message: 'Avatar updated successfully',
            avatar: updatedUser.avatar,
            variants: {
                thumbnail: getTransformedUrl(uploadResult.url, avatarTransforms.thumbnail),
                small: getTransformedUrl(uploadResult.url, avatarTransforms.small),
                medium: getTransformedUrl(uploadResult.url, avatarTransforms.medium),
                large: getTransformedUrl(uploadResult.url, avatarTransforms.large),
            }
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ message: 'Server error while uploading avatar' });
    }
};

/**
 * Remove user avatar
 */
export const removeAvatarController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.id) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { avatarFileId: true }
        });

        // Delete from ImageKit
        if (currentUser?.avatarFileId) {
            const imagekit = getImageKit();
            try {
                await imagekit.deleteFile(currentUser.avatarFileId);
            } catch {
                // Ignore delete errors
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { avatar: null, avatarFileId: null }
        });

        res.status(200).json({ message: 'Avatar removed successfully' });
    } catch (error) {
        console.error('Remove avatar error:', error);
        res.status(500).json({ message: 'Server error while removing avatar' });
    }
};
