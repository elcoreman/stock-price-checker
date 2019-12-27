"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const get = require("https").get;

const CONNECTION_STRING = process.env.DB;

module.exports = app => {
  const fn = (d1, d2) => {
    console.log(d1, d2);
  };

  app.route("/api/stock-prices").get((req, res) => {
    let stock = [];
    typeof req.query.stock == "string"
      ? stock.push(req.query.stock)
      : req.query.stock;
    let like = req.query.like ? req.query.like.toLowerCase() === "true" : false;
    get(
      "https://repeated-alpaca.glitch.me/v1/stock/" + stock[0] + "/quote",
      res =>
        res.on("data", data1 => {
          if (stock[1]) {
            get(
              "https://repeated-alpaca.glitch.me/v1/stock/" +
                stock[1] +
                "/quote",
              res =>
                res.on("data", data2 => {
                  fn(data1, data2);
                })
            ).on("error", err => {
              console.error(err);
            });
          } else {
            fn(data1);
          }
        })
    ).on("error", err => {
      console.error(err);
    });

    /*MongoClient.connect(CONNECTION_STRING, (err, client) => {
      assert.equal(null, err);
      let col = client.db("test").col("stocksip");
    });*/
  });
};
