const { User, Coin, Asset, Key } = require("./models");
const coins = [
  "bitcoin",
  "ripple",
  "ethereum",
  "dogecoin",
  "binancecoin",
  "cardano"
];

const init = async () => {
  await User.deleteMany();
  await Asset.deleteMany();
  await Coin.deleteMany();
  await Key.deleteMany();
  for (const _coin of coins) {
    const coin = new Coin({ name: _coin, isActive: true });
    await coin.save();
  }

  console.log("completed");
};
init();
