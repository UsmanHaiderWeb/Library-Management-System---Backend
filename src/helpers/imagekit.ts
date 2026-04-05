import ImageKit from 'imagekit';

let imagekitInstance: ImageKit | null = null;

export function getImageKit(): ImageKit {
    if (!imagekitInstance) {
        imagekitInstance = new ImageKit({
            publicKey: process.env.IMAGE_KIT_PUBLIC_KEY || '',
            privateKey: process.env.IMAGE_KIT_PRIVATE_KEY || '',
            urlEndpoint: process.env.IMAGE_KIT_URL || '',
        });
    }
    return imagekitInstance;
}

/**
 * Generate an ImageKit URL with transformations.
 * @param url - The original ImageKit URL
 * @param transforms - ImageKit transformation string (e.g., "w-200,h-200,fo-face")
 */
export function getTransformedUrl(url: string, transforms: string): string {
    if (!url) return url;
    // ImageKit URLs support tr query param
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tr=${transforms}`;
}

/** Standard avatar size presets */
export const avatarTransforms = {
    thumbnail: 'w-40,h-40,fo-face,q-60',
    small: 'w-80,h-80,fo-face,q-70',
    medium: 'w-200,h-200,fo-face,q-80',
    large: 'w-400,h-400,fo-face,q-90',
} as const;

/** Standard book cover size presets */
export const bookCoverTransforms = {
    thumbnail: 'w-55,h-76,q-60',
    small: 'w-114,h-169,q-70',
    medium: 'w-174,h-239,q-80',
    large: 'w-296,h-404,q-90',
} as const;
