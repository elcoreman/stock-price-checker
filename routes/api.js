"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const request = require("request");

const CONNECTION_STRING = process.env.DB;

module.exports = app => {
  const next2 = (col, res, d1, d2) => {
    //console.log(d1);
    col.findOne({ symbol: d1.symbol.toLowerCase() }, (err, dbResult) => {
      assert.equal(null, err);
      //console.log("err", err);
      let likesCount1 = dbResult ? dbResult.ips.length : 0;
      let res1 = {
        stock: d1.symbol,
        price: d1.latestPrice,
        likes: likesCount1
      };
      if (!d2) {
        res.json({
          stockData: res1
        });
      } else {
        col.findOne({ symbol: d2.symbol.toLowerCase() }, (err, dbResult) => {
          assert.equal(null, err);
          let likesCount2 = dbResult ? dbResult.ips.length : 0;
          let res2 = {
            stock: d2.symbol,
            price: d2.latestPrice,
            rel_likes: likesCount2 - likesCount1
          };
          delete res1.likes;
          res2.rel_likes = likesCount1 - likesCount2;
          res.json({
            stockData: [res1, res2]
          });
        });
      }
    });
  };

  const next1 = (res, like, ip, d1, d2) => {
    console.log(d1, d2);
    if (d1 == "Invalid symbol" && d2 == "Invalid symbol")
      return res.json({ stockData: [{ rel_likes: 0 }, { rel_likes: 0 }] });
    else if (d1 == "Invalid symbol" && d2 === null)
      return res.json({ stockData: { likes: 0 } });
    else if (d1 == "Invalid symbol" && d2 === false)
      return res.json({
        stockData: [
          { rel_likes: 0 },
          { error: "external source error", rel_likes: 0 }
        ]
      });
    else if (d1 === false && d2 == "Invalid symbol")
      return res.json({
        stockData: [
          { error: "external source error", rel_likes: 0 },
          { rel_likes: 0 }
        ]
      });
    MongoClient.connect(
      CONNECTION_STRING,
      { useUnifiedTopology: true },
      (err, client) => {
        assert.equal(null, err);
        let col = client.db("test").collection("stocks_ip");
        if (like) {
          let q1 = { symbol: d1.symbol.toLowerCase(), ips: { $nin: [ip] } };
          let q = q1;
          if (d2) {
            let q2 = { symbol: d2.symbol.toLowerCase(), ips: { $nin: [ip] } };
            q = { $or: [q1, q2] };
          }
          col.findAndUpdate(
            q,
            { $push: { ips: ip } },
            { upsert: true },
            (err, resdb) => {
              assert.equal(null, err);
              next2(col, res, d1, d2);
            }
          );
        } else {
          next2(col, res, d1, d2);
        }
      }
    );
  };

  app.route("/api/stock-prices").get((req, res) => {
    let stock = req.query.stock;
    let StockIsUndefined = typeof stock === "undefined";
    let StockIsArray = typeof stock !== "string";
    let stockIsFalsy = !stock;
    if (StockIsUndefined) {
      return res.json({ stockData: { likes: 0 } });
    } else if (stockIsFalsy) {
      return res.json({
        stockData: { error: "external source error", likes: 0 }
      });
    } else if (StockIsArray && stock.every(s => !s)) {
      return res.json({
        stockData: [
          { error: "external source error", rel_likes: 0 },
          { error: "external source error", rel_likes: 0 }
        ]
      });
    }
    if (!StockIsArray) {
      stock = [];
      stock.push(stock);
    }
    let like = req.query.like ? req.query.like.toLowerCase() === "true" : false;
    const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;

    request(
      "https://repeated-alpaca.glitch.me/v1/stock/" + stock[0] + "/quote",
      (err, response, body1) => {
        assert.equal(null, err);
        body1 = response.statusCode == 200 ? JSON.parse(body1) : false;
        return body1;
      }
    );

    request(
      "https://repeated-alpaca.glitch.me/v1/stock/" +
        (stock[1] || "") +
        "/quote",
      (err, response, body2) => {
        assert.equal(null, err);
        body2 = response.statusCode == 200 ? JSON.parse(body2) : false;
        next1(res, like, ip, body1, body2);
      }
    );
    
    
  });
};
