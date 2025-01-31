import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import connectDB from "./db/connectDB.js";
import roleRoute from "./routes/role.route.js"
import authRoute from "./routes/auth.route.js"
import locationRoute from "./routes/location.route.js"
import userRoute from "./routes/user.route.js"
import multer from "multer";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json())
app.use(cors({
    origin: "http://localhost:3000",
    credentials:true,
}))
app.use(express.urlencoded({
    extended:true
}))

// Error handling for multer
app.use((err, req, res, next) => {
  
  if (err instanceof multer.MulterError) {
    // Multer-specific error (like file size limit exceeded)
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).send('File size is too large. Maximum allowed size is 2MB.');
    } else {
      res.status(400).send(err.message);
    }
  } else{
    // Other errors
    res.status(400).send(err.message);
    }
    
});

app.use("/api/roles", roleRoute);
app.use("/api/auth", authRoute);
app.use("/api/locations", locationRoute);
app.use("/api/users", userRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
    connectDB();
})