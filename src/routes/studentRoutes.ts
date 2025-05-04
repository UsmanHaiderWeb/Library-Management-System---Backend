import express from 'express';

export const studentRouter = express.Router();

studentRouter.get('/login', (req, res) => {
    res.json("Hello");
});