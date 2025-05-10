import dotenv from "dotenv"

dotenv.config();

export const configVariables = Object.freeze({
    port: process.env.PORT && 3000,
})