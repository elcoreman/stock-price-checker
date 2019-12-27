"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const request = require("request");

const CONNECTION_STRING = process.env.DB;

module.exports = app => {
  const stocks = (res, result, d1, d2) => {
    MongoClient.connect(CONNECTION_STRING, (err, client) => {
      assert.equal(null, err);
      let col = client.db("test").col("stocks_ip");
      
    });
  };

  app.route("/api/stock-prices").get((req, res) => {
    let stock = [];
    typeof req.query.stock == "string"
      ? stock.push(req.query.stock)
      : req.query.stock;
    let like = req.query.like ? req.query.like.toLowerCase() === "true" : false;
    let result = { stockData: { likes: 0 } };
    if (stock == []) return res.json(result);
    request(
      "https://repeated-alpaca.glitch.me/v1/stock/" + stock[0] + "/quote",
      (error, response, body1) => {
        if (!error && response.statusCode == 200) {
          if (stock[1]) {
            request(
              "https://repeated-alpaca.glitch.me/v1/stock/" +
                stock[1] +
                "/quote",
              (error, response, body2) => {
                if (!error && response.statusCode == 200) {
                  stocks(res, result, body1, body2);
                }
              }
            );
          } else {
            stocks(res, result, body1);
          }
        }
      }
    );
  });
};
