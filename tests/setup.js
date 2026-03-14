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
Object.defineProperty(exports, "__esModule", { value: true });
const prismaDb_1 = require("../src/helpers/prismaDb");
const redisClient_1 = require("../src/helpers/redisClient");
beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // Setup logic if needed
}));
afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prismaDb_1.prisma.$disconnect();
    yield redisClient_1.redisClient.quit();
}));
