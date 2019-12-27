"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const https = require("https");

const CONNECTION_STRING = process.env.DB;

const getStock = stockName => {
  https
    .request(
      {
        hostname:
          "https://repeated-alpaca.glitch.me/v1/stock/" + stockName + "/quote",
        method: "GET"
      },
      res => res.on("data", d => d)
    )
    .on("error", error => {
      console.error(error);
    })
    .end();
};
module.exports = app => {
  app.route("/api/stock-prices").get((req, res) => {
    let stock = req.query.stock;
    let like = req.query.like.toLowerCase() === "true";
    
    console.log(getStock("goog"));
    
    /*MongoClient.connect(CONNECTION_STRING, (err, client) => {
      assert.equal(null, err);
      let col = client.db("test").col("stocksip");
    });*/
    
  });
};
