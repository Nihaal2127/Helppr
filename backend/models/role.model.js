import mongoose from "mongoose"

const roleSchema = new mongoose.Schema({
    
    role: {
        type: String,
        required:true,
    },
    is_active: {
        type: Number,
        enum: [0, 1], // 0 = inactive, 1 = active
        default: 1
    }
}, { timestamps: true });

// Define a unique index with collation for case-insensitivity
roleSchema.index({ role: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });


const Role = mongoose.model('Role',roleSchema);
export default Role;