const crypto = require("crypto");
const { User, Coin, Asset, Key } = require("./models");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const encryptPassword = (password) => {
  return crypto.createHash("sha512").update(password).digest("base64");
};

const setAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const [bearer, token] = authorization.split(" ");
  if (bearer !== "Bearer")
    return res.send({ error: "Wrong Authorization" }).status(400);

  let publicKey;
  try {
    publicKey = await jwt.decode(token).publicKey;
  } catch (err) {
    return res.send({ error: "Invalid Token" }).status(400);
  }

  const key = await Key.findOne({ publicKey });
  if (key === null)
    return res
      .send({ error: "Cannot find your key. Please log in again" })
      .status(400);
  const secretKey = key.secretKey;

  try {
    await jwt.verify(token, secretKey);
  } catch (err) {
    if (err.message === "jwt expired") {
      return res.send({ error: "Token Expired" }).status(400);
    } else {
      return res.send({ error: "Invalid Token" }).status(400);
    }
  }

  const user = await User.findOne({ key });
  if (!user) return res.send({ error: "Cannot find user" }).status(400);

  req.user = user;
  return next();
};

const getPrice = async (req, res, next) => {
  const coinId = req.params.coinName;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
  const apiRes = await axios.get(url);
  const coinInfo = apiRes.data[coinId];
  if (!coinInfo)
    return res.send({ error: "Cannot find that coin!" }).status(400);
  const price = coinInfo.usd;
  req.price = price;
  return next();
};

const getOrder = (price, quantity_str) => {
  if (quantity_str === "") {
    throw "Error_null";
  }
  const quantityStr = quantity_str.split(".");
  if (quantityStr.length > 2) {
    throw "Error_decimal";
  }
  const quantityDecimalNum = quantityStr[1];
  if (quantityDecimalNum !== undefined && quantityDecimalNum.length > 4) {
    throw "Error_4decimalpoints";
  }
  const quantity = parseFloat(quantity_str);
  const totalPrice = price * quantity;
  return [quantity, totalPrice];
};

module.exports = {
  encryptPassword,
  setAuth,
  getPrice,
  getOrder
};
