const mongoose = require("mongoose");

const rewarditemSchema = new mongoose.Schema({
   title: {
      type: String,
      required: true
   },
   description: {
    type: String,
   },
   points:{
     type: Number
   },
   stock: {
    type: Number,
    default: 1,
   },
   category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    required: true
   },
   image: {
     type: String
   }

});

module.exports = mongoose.model("Rewarditem", rewarditemSchema);

