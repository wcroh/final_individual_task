const mongoose = require("mongoose");

const User = require("./User");
const Coin = require("./Coin");
const Asset = require("./Asset");
const Key = require("./Key");

const mongoURL =
  "mongodb+srv://roh:1q2w3e4r!!@testmongo.svjf0.mongodb.net/coinServer?retryWrites=true&w=majority";
mongoose.connect(mongoURL);

module.exports = {
  User,
  Coin,
  Asset,
  Key
};
