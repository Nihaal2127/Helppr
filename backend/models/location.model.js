import mongoose from "mongoose"

const locationSchema = new mongoose.Schema({
    
    location: {
        type: String,
        required:true,
    },
    is_active: {
        type: Number,
        enum: [0, 1], // 0 = inactive, 1 = active
        default: 1
    }
},{ timestamps: true });

// Define a unique index with collation for case-insensitivity
locationSchema.index({ location: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });


const Location = mongoose.model('location',locationSchema);
export default Location;