import jwt from "jsonwebtoken"
 const generateToken = (userId, res) => {
    
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn:"15d"
    })
     return token;
    // return res.json({ token });
}

export default generateToken;