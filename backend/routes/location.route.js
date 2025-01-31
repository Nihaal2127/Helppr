import express from "express"
import { addLocation } from "../controllers/location.controller.js";

const router = express.Router();

router.post("/", addLocation);

 export default router;