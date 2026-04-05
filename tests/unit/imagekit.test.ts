import { getTransformedUrl, avatarTransforms, bookCoverTransforms } from '../../src/helpers/imagekit';

describe('ImageKit Utilities', () => {
  describe('getTransformedUrl', () => {
    it('should append transforms as query parameter', () => {
      const url = 'https://ik.imagekit.io/abc/image.jpg';
      const result = getTransformedUrl(url, 'w-200,h-200');
      expect(result).toBe('https://ik.imagekit.io/abc/image.jpg?tr=w-200,h-200');
    });

    it('should use & separator when URL already has query params', () => {
      const url = 'https://ik.imagekit.io/abc/image.jpg?v=1';
      const result = getTransformedUrl(url, 'w-200,h-200');
      expect(result).toBe('https://ik.imagekit.io/abc/image.jpg?v=1&tr=w-200,h-200');
    });

    it('should return empty string for empty url', () => {
      const result = getTransformedUrl('', 'w-200');
      expect(result).toBe('');
    });

    it('should handle complex transform strings', () => {
      const url = 'https://ik.imagekit.io/abc/avatar.png';
      const result = getTransformedUrl(url, 'w-400,h-400,fo-face,q-90');
      expect(result).toBe('https://ik.imagekit.io/abc/avatar.png?tr=w-400,h-400,fo-face,q-90');
    });
  });

  describe('avatarTransforms', () => {
    it('should have thumbnail preset', () => {
      expect(avatarTransforms.thumbnail).toBe('w-40,h-40,fo-face,q-60');
    });

    it('should have small preset', () => {
      expect(avatarTransforms.small).toBe('w-80,h-80,fo-face,q-70');
    });

    it('should have medium preset', () => {
      expect(avatarTransforms.medium).toBe('w-200,h-200,fo-face,q-80');
    });

    it('should have large preset', () => {
      expect(avatarTransforms.large).toBe('w-400,h-400,fo-face,q-90');
    });

    it('should include face focus in all presets', () => {
      Object.values(avatarTransforms).forEach((transform) => {
        expect(transform).toContain('fo-face');
      });
    });
  });

  describe('bookCoverTransforms', () => {
    it('should have thumbnail preset', () => {
      expect(bookCoverTransforms.thumbnail).toBe('w-55,h-76,q-60');
    });

    it('should have small preset', () => {
      expect(bookCoverTransforms.small).toBe('w-114,h-169,q-70');
    });

    it('should have medium preset', () => {
      expect(bookCoverTransforms.medium).toBe('w-174,h-239,q-80');
    });

    it('should have large preset', () => {
      expect(bookCoverTransforms.large).toBe('w-296,h-404,q-90');
    });

    it('should not include face focus in any preset', () => {
      Object.values(bookCoverTransforms).forEach((transform) => {
        expect(transform).not.toContain('fo-face');
      });
    });
  });
});
