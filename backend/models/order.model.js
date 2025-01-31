import mongoose from 'mongoose'


const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true
    },
   helper_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the Helper model
    required: true
    },
    service: [
        {
            service_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Service', // Reference to the Helper model
                required: true
            },
            service_name: {
                type: String,
                required: true
            },
            service_desc: {
                type: String,
                required: true
            },
            service_price: {
                 type: Number,
                 required: true
            },
            service_start_time: {
                type: String,
                required: true
            },
            service_end_time: {
                type: String,
                required: true
            },
            service_date: {
                type: Date,
                required: true
            },
            rating: {
                type: Number,
                min: 0,
                max: 5,
                default: 0
            },
            feedback: {
                type: String,
                default: ''
            }
        }
   ],
  total_amount: {
    type: Number,
    required: true
  },
  payment_status: {
    type: Number,
    enum: [0, 1], // 0 - unpaid, 1 - paid
    default: 0
  },
  payment_id: {
    type: String,
    required: false
  },
  order_status: {
    type: Number,
    enum: [0, 1, 2, 3], // 0 - pending, 1 - in_progress, 2 - completed, 3 - cancelled
    default: 0
  },
  comment: {
    type: String,
    required: false
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location', // Reference to the Location model
    required: true
  },
  gst_charge: {
    type: Number,
    required: false
  },
  delivery_charge: {
    type: Number,
    required: false
  },
  service_amount: {
    type: Number,
    required: true
  },
  address_id: {
    type: mongoose.Schema.Types.ObjectId,
      ref: 'User',  // Reference to User's address array
      required: true
  },
  cancellation_reason: {
    type: String,
    required: false
  },
  deleted_at: {
    type: Date,
    required: false
  },
 
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;
