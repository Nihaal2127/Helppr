import mongoose from "mongoose"

const paymentModeSchema = new mongoose.Schema({
    
    payment_mode: {
        type: String,
        default:true,
    },
    is_active: {
        type: Number,
        enum: [0, 1], // 0 = inactive, 1 = active
        default: 1
    }
},{ timestamps: true });

const PaymentMode = mongoose.model('PaymentMode',paymentModeSchema);
export default PaymentMode;