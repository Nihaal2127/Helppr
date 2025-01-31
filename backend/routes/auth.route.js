import express from "express"
import { login } from "../controllers/auth.controller.js"

const router = express.Router();

router.post("/login",login);
// router.post("/logout", logout);
// router.post("/me", protectRoute, getMe)

export default router;
