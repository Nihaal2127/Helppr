
// import User from "../models/user.model.js";
// // Middleware to validate form data

// export const validateUserFormData =  (req, res, next) => {
//    const {  username, email_id, password, contact_no, address, city, state, profile_photo, start_date } = req.body;


//  const existingEmail = await User.findOne({ email_id: email_id })
//         const existingcontactNumber = await User.findOne({ contact_no: contact_no })
//          if (existingEmail) {
//             return res.status(400).json({error : "Email Already Exist"})
//         }

//         if (existingcontactNumber) {
//             return res.status(400).json({error : "Contact Number Already Exist"})
//     }
//     console.log(password)

//         if (!password || password.trim() === '') {
//             return res.status(400).json({ error: "Passoword is required" })
            
//         }
//         if (password.length < 6) {
//             return res.status(400).json({ error: "Passoword must have atleast 6 character." })
            
//         }

//      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//         if (!email_id || !emailRegex.test(email_id)) {
//             return res.status(400).json({error : "Invalid Email!"})
//         }
         
//         if (username.trim() === '') {
//              return res.status(400).json({error : "Username is Required"})
//         }
//         if (address.trim() === '') {
//              return res.status(400).json({error : "Address is Required"})
//         }
//         if (city.trim() === '') {
//              return res.status(400).json({error : "City is Required"})
//     }
//     if (state.trim() === '') {
//              return res.status(400).json({error : "State is Required"})
//         }
//         if (profile_photo.trim() === '') {
//              return res.status(400).json({error : "profile_photo is Required"})
//         }
//         if (start_date.trim() === '') {
//              return res.status(400).json({error : "start_date is Required"})
//         }
//   next(); // Proceed to file upload if validation passes
// };