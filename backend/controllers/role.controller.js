
import Role from "../models/role.model.js";
export const addRole =async (req,res) => {
    
    try {
    
        const { role } = req.body;

        const checkRole = await Role.findOne({ role: role }).collation({ locale: 'en', strength: 2 });
        if (checkRole) {
           return res.status(400).json({ error: "Role Already Exists!" });
        }

        if (role.trim()!=='') {
            const newRole = new Role({
            role: role,
        })

        if (newRole) {
            
            await newRole.save();
           return res.status(200).json({
                _id: newRole._id,
                role:newRole.role
            })
        } else {
            
            return res.status(400).json({error: "Invalid Role data!"})
        }


        } else {
            return res.status(400).json({error: "Role is required!"})
        }
        
    } catch (error) {
        console.log(`Error in add role controller :${error}`);
        return res.status(500).json({error:"Internal server error"})
    }
}

export default addRole;