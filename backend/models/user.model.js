import mongoose from "mongoose"


const userSchema = new mongoose.Schema({
  registration_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  auth_token: {
    type: String,
    default: null
  },
  device_token: {
    type: String,
    default: null
  },
  registration_type: {
    type: Number,
    enum: [0, 1, 2, 3], // 0 = normal, 1 = Facebook, 2 = Google, 3 = Twitter
    default: 0
  },
  platform_type: {
    type: String,
    enum: ['web', 'ios', 'android'],
    default: 'web'
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  
  },
  username: {
    type: String,
    required: true
  },
  contact_no: {
    type: Number,
    required: true,
    unique: true
  },
  email_id: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    default: ''
  },
  addresses: [
    {
        contact_name: {
        type: String,
        required: true
        },
        contact_no: {
        type: Number,
        default: ""
        },
        address: {
              type: String,
              required:true
        },
      area: {
        type: String,
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      pin_code: {
        type: String,
        default:''
      },
      landmark: {
        type: String,
        default: ''
      },
      is_primary: {
        type: Number,
        enum: [0, 1], 
        default: 0
      }
    }
  ],
  profile_photo: {
    type: String,
    default: ''
  },
  is_active: {
      type: Number,
        enum: [0, 1], // 0 = inactive, 1 = active
        default: 1
  },
  otp: {
    type: String,
    default: null
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required:true
  },
  start_date: {
    type: Date,
  },
  added_by: {
    type: String,
    default:''
  },
  isDeleted: {
    type: Boolean,
    default: false, // Indicates the document is active by default
  },
  deletedAt: {
    type: Date,
    default: null, // Stores the timestamp when the document is soft-deleted
  },
},{ timestamps: true });

userSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

userSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const User = mongoose.model('User', userSchema);


export default User;

