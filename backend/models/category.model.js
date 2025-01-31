import mongoose from "mongoose"

const categorySchema = new mongoose.Schema({
    category_name: {
        type: String,
        required: true,
        unique:true
    },
    category_desc: {
        type: String,
        required:true
    },
    category_image: {
        type: String,
        require:true,
    },
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Location,
        required:true
    },
    is_active: {
    type: Boolean,
    default: true
    },

}, { timestamps: true });

// // Pre-save hook to update `updated_at`
// categorySchema.pre('save', function (next) {
//   this.updated_at = Date.now();
//   next();
// });

const Category = mongoose.model('Category', categorySchema)

export default Category;