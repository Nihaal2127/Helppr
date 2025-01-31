import express from "express"
import { addUser } from "../controllers/user.controller.js";
import multer from "multer";

// Use memory storage for temporary handling
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
});

const router = express.Router();

router.post("/create",upload.single('profile_photo'), addUser);

export default router;