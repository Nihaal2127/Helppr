import mongoose from "mongoose"


const serviceSchema = new mongoose.Schema({
  service_name: {
    type: String,
    required: true
  },
  service_desc: {
    type: String,
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Assuming you have a Category model
    required: true
  },
  service_price: {
    type: Number,
    required: true
  },
  location_id: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location' // References the Location model
    }
  ],
  is_active: {
    type: Number,
    enum: [0, 1], // 0 = inactive, 1 = active
    default: 1
  },
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
