const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  assets: [{ type: Schema.Types.ObjectId, ref: "Asset" }],
  keys: [{ type: Schema.Types.ObjectId, ref: "Key" }]
});

const User = mongoose.model("User", userSchema);

module.exports = User;
