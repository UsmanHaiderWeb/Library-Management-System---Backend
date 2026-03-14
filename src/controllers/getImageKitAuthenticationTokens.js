"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageKitAuthenticationTokens = void 0;
const imagekit_1 = __importDefault(require("imagekit"));
const getImageKitAuthenticationTokens = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const imageKit = new imagekit_1.default({
            publicKey: process.env.IMAGE_KIT_PUBLIC_KEY || '',
            privateKey: process.env.IMAGE_KIT_PRIVATE_KEY || '',
            urlEndpoint: process.env.IMAGE_KIT_URL || '',
        });
        // Check if required environment variables are present
        if (!process.env.IMAGE_KIT_PUBLIC_KEY ||
            !process.env.IMAGE_KIT_PRIVATE_KEY ||
            !process.env.IMAGE_KIT_URL) {
            res.status(500).json({ message: "ImageKit environment variables are not properly set." });
            return;
        }
        const { token, expire, signature } = imageKit.getAuthenticationParameters();
        res.status(201).json({ token, expire, signature, publicKey: process.env.IMAGE_KIT_PUBLIC_KEY });
        return;
    }
    catch (error) {
        console.error("Error generating ImageKit authentication tokens:", (error === null || error === void 0 ? void 0 : error.message) || error);
        res.status(500).json({ message: "Failed to generate ImageKit authentication tokens." });
        return;
    }
});
exports.getImageKitAuthenticationTokens = getImageKitAuthenticationTokens;
