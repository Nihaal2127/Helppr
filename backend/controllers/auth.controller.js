import User from "../models/user.model.js";
import bcrypt from "bcryptjs"
import generateToken from "../utils/generateToken.js";

export const login = async (req, res) => {
    
    try {
        
        const { user_id, password } = req.body;
        const user = await User.findOne({ user_id });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "")
        
        if (!user || !isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid User Id or Password" });
        }

        const token = generateToken(user._id, res);
     
        
        res.status(200).json({
                _id: user._id,
                username: user.user_id,
                fullname: user.name,
                email_id: user.email_id,
                profile_photo: user.profile_photo,
            location_id: user.location_id,
                auth_token:token
        })
    } catch (error) {
        console.log(`Error in login controller :${error}`);
        res.status(500).json({error:"Internal server error"})
    }
}