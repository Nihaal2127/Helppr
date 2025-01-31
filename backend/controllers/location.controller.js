import Location from "../models/location.model.js";

export const addLocation = async (req, res) => {
    
    try {
    
        const { location } = req.body;

        const locationExist = await Location.findOne({ location: location }).collation({ locale: 'en', strength: 2 });
        if (locationExist) {
           return res.status(400).json({ error: "Location Already Exists!" });
        }

        if (location.trim()!=='') {
            const newLocation = new Location({
            location: location,
        })

        if (newLocation) {
            
            await newLocation.save();
           return res.status(200).json({
                _id: newLocation._id,
                location:newLocation.location
            })
        } else {
            
            return res.status(400).json({error: "Invalid location data!"})
        }


        } else {
            return res.status(400).json({error: "Location is required!"})
        }

    } catch (error) {
        res.status(500).json({ error: "Internal server error" })
        console.log(`Error in add location controller : ${error}`)
}
}