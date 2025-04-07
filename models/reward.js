const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
   rewardItem:{
         type: mongoose.Schema.Types.ObjectId,
         ref: "Rewarditem",
         required: true
   },
   costomer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
   }

}, {timestamps: true});

module.exports = mongoose.model("Reward", rewardSchema);