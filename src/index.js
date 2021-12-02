const express = require("express");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const { encryptPassword, setAuth, getPrice, getOrder } = require("./utils");

const { User, Coin, Asset, Key } = require("./models");
const app = express();

const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//회원가입
app.post(
  "/register",
  body("email").isEmail(),
  body("email").isLength({ max: 99 }),
  body("name").isLength({ min: 4, max: 12 }).isAlphanumeric(),
  body("password").isLength({ min: 8, max: 16 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArr = errors.array()[0];
      return res
        .status(400)
        .json({ error: `Your ${errorArr.param} is wrong. Try Again` });
    }

    const { name, email, password } = req.body;
    const encryptedPassword = encryptPassword(password);
    let user = null;
    try {
      user = new User({
        name: name,
        email: email,
        password: encryptedPassword
      });
      await user.save();
    } catch (err) {
      return res.send({ error: "email is duplicated" }).status(400);
    }

    const usdAsset = new Asset({ name: "USD", balance: 10000, user });
    await usdAsset.save();

    const coins = await Coin.find({ isActive: true });
    for (const coin of coins) {
      const asset = new Asset({ name: coin.name, balance: 0, user });
      await asset.save();
    }

    const assets = await Asset.find({ user });
    for (const asset of assets) user.assets.push(asset);
    await user.save();

    res.send("Register Complete").status(200);
  }
);

//로그인
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const encryptedPassword = encryptPassword(password);
  const user = await User.findOne({ email, password: encryptedPassword });
  if (user === null)
    return res.send({ error: "Cannot find a user" }).status(400);

  const publicKey = crypto.randomBytes(20).toString("base64");
  const secretKey = crypto.randomBytes(20).toString("base64");
  const key = await new Key({ publicKey, secretKey, user });
  await key.save();

  user.keys.push(key);
  await user.save();

  res.send({ publicKey, secretKey }).status(200);
});

//코인 목록
app.get("/coins", async (req, res) => {
  const coins = await Coin.find({ isActive: true });
  const coinList = coins.map((_coin) => _coin.name);
  res.send(coinList).status(200);
});

//자산확인
app.get("/balance", setAuth, async (req, res) => {
  const user = req.user;
  const assets = await Asset.find({ user });
  const assetsList = {};
  for (const asset of assets) {
    if (asset.balance !== 0) assetsList[asset.name] = asset.balance;
  }

  res.send(assetsList).status(200);
});

//코인 가격
app.get("/coins/:coinName/", getPrice, async (req, res) => {
  const price = req.price;
  res.send({ price }).status(200);
});

//코인 구매(전량구매 구현)
app.post("/coins/:coinName/buy", setAuth, getPrice, async (req, res) => {
  const user = req.user;
  const price = req.price;
  const coin_name = req.params.coinName;
  const buyAll = req.body.all;
  const asset_coin = await Asset.findOne({ name: coin_name, user });
  const asset_usd = await Asset.findOne({ name: "USD", user });

  if (buyAll === "true") {
    const balance = asset_usd.balance;
    const quantity = Math.floor((balance / price) * 10000) / 10000;

    if (balance === 0) {
      return res.send({ error: `No USD balance` }).status(400);
    } else if (quantity === 0) {
      return res.send({ error: `Not enough USD balance` }).status(400);
    }

    asset_coin.balance += quantity;
    await asset_coin.save();
    asset_usd.balance -= price * quantity;
    await asset_usd.save();

    return res.send({ price, quantity }).status(200);
  }

  const { quantity: quantity_str } = req.body;

  let quantity, totalPrice;
  try {
    [quantity, totalPrice] = getOrder(price, quantity_str);
  } catch (err) {
    if (err === "Error_null") {
      return res.send({ error: "Write quantity" }).status(400);
    } else if (err === "Error_decimal") {
      return res.send({ error: "Invalid quantity" });
    } else {
      return res.send({
        error: "The quantity should be up to 4 decimal points"
      });
    }
  }

  if (totalPrice > asset_usd.balance) {
    return res.send({ error: `Not enough USD balance` }).status(400);
  }

  asset_coin.balance += quantity;
  await asset_coin.save();
  asset_usd.balance -= totalPrice;
  await asset_usd.save();

  res.send({ price, quantity }).status(200);
});

//코인 판매(전량판매 구현)
app.post("/coins/:coinName/sell", setAuth, getPrice, async (req, res) => {
  const user = req.user;
  const price = req.price;
  const coin_name = req.params.coinName;
  const sellAll = req.body.all;
  const asset_coin = await Asset.findOne({ name: coin_name, user });
  const asset_usd = await Asset.findOne({ name: "USD", user });

  if (sellAll === "true") {
    const quantity = asset_coin.balance;
    if (quantity === 0) {
      return res.send({ error: `No ${coin_name} balance` }).status(400);
    }
    asset_coin.balance = 0;
    await asset_coin.save();
    asset_usd.balance += price * quantity;
    await asset_usd.save();

    return res.send({ price, quantity }).status(200);
  }

  const { quantity: quantity_str } = req.body;
  let quantity, totalPrice;
  try {
    [quantity, totalPrice] = getOrder(price, quantity_str);
  } catch (err) {
    if (err === "Error_null") {
      return res.send({ error: "Write quantity" }).status(400);
    } else if (err === "Error_decimal") {
      return res.send({ error: "Invalid quantity" });
    } else {
      return res.send({
        error: "The quantity should be up to 4 decimal points"
      });
    }
  }

  if (quantity > asset_coin.balance) {
    return res.send({ error: `Not enough ${coin_name} balance` }).status(400);
  }
  asset_coin.balance -= quantity;
  await asset_coin.save();

  asset_usd.balance += totalPrice;
  await asset_usd.save();

  res.send({ price, quantity }).status(200);
});

app.listen(port, () => {
  console.log(`listening at port: ${port}...`);
});
