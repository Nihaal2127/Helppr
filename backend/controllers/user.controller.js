import User from "../models/user.model.js";
import { extractNumber } from "../utils/helperFunction.js";
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path";
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const addUser = async (req, res) => {
    try {

        
        const { user_id, username, email_id, password, contact_no, address, city, state, profile_photo, start_date, is_active, role,location_id } = req.body;
        const existingEmail = await User.findOne({ email_id: email_id })
        const existingcontactNumber = await User.findOne({ contact_no: contact_no })
        if (existingEmail) {
             
             return res.status(400).json({ error: "Email Already Exist" }) 
        }

        if (existingcontactNumber) {
            return res.status(400).json({error : "Contact Number Already Exist"})
        }
   

        if (!password || password.trim() === '') {
            return res.status(400).json({ error: "Passoword is required" })
            
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Passoword must have atleast 6 character." })
            
        }

     const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!email_id || !emailRegex.test(email_id)) {
            return res.status(400).json({error : "Invalid Email!"})
        }
         
        if (username.trim() === '') {
             return res.status(400).json({error : "Username is Required"})
        }
        if (address.trim() === '') {
             return res.status(400).json({error : "Address is Required"})
        }
        if (city.trim() === '') {
             return res.status(400).json({error : "City is Required"})
    }
    if (state.trim() === '') {
             return res.status(400).json({error : "State is Required"})
        }
       
        if (start_date.trim() === '') {
             return res.status(400).json({error : "start_date is Required"})
        }
        if (!req.file) {
            return res.status(400).json({error : "profile_photo is Required"})
        }
         // If validation passes, save the file manually
        const fileBuffer = req.file.buffer; // File buffer
        const allowedTypes = /jpeg|jpg|png/; // Allow only these file types
        const extname = allowedTypes.test(path.extname(req.file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(req.file.mimetype);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = uniqueSuffix + path.extname(req.file.originalname);
            if (extname && mimetype) {
             
                try {
            
                    fs.writeFileSync(path.join(__dirname,'..','uploads',fileName), fileBuffer)
                    
                } catch (error) {
                    return res.status(400).json({error : "Profile Photo not uploaded"})
                }
            } else {
                
                return res.status(400).json({error : "Only images are allowed (jpeg, jpg, png)"})
            }
        

         //hashing the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const lastRecord = await User.findOne().sort({ _id: -1 });
        let newRegistrationId;
        if (lastRecord) {
            const registration_id = lastRecord.registration_id;
            const result = extractNumber(registration_id);
            const incId = result + 1;

            newRegistrationId = 'R' + incId;
          
        } else {
           
            newRegistrationId = 'R1001';
            console.log(newRegistrationId)
        }



        const newUser = new User({
            registration_id: newRegistrationId,
            user_id,
            username,
            email_id,
            password:hashedPassword,
            contact_no,
            addresses: {
                contact_name:username,
                contact_no,
                address,
                city,
                state,
            },
            profile_photo:fileName,
            start_date,
            is_active,
            role,
            location_id
        });

        if (newUser) {
             await newUser.save();
             return  res.status(200).json(newUser)
        } else {
            return res.status(400).json({error: "Invalid user data!"})
        }
       
        
    } catch (error) {
        console.log(`Error in add user controller :${error}`);
        res.status(500).json({error:"Internal server error"})
    }
}