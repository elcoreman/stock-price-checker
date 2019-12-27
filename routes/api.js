"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const request = require("request");

const CONNECTION_STRING = process.env.DB;

module.exports = app => {
  const next2 = (col, res, d1, d2) => {
    col.findOne({ symbol: d1.symbol.toLowerCase() }, (err, dbResult) => {
      assert.equal(null, err);
      console.log("err", err);
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
    if(d1 == "Invalid symbol" && d2 == "Invalid symbol") return res.json({ stockData: { likes: 0 } });
    if(d1 == "Invalid symbol" && d2 == "Invalid symbol") return res.json({ stockData: { likes: 0 } });
    
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
    let stock = [];
    typeof req.query.stock == "string"
      ? stock.push(req.query.stock)
      : req.query.stock;
    let like = req.query.like ? req.query.like.toLowerCase() === "true" : false;
    const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
    if (stock == []) return res.json({ stockData: { likes: 0 } });
    request(
      "https://repeated-alpaca.glitch.me/v1/stock/" + stock[0] + "/quote",
      (error, response, body1) => {
        if (!error && response.statusCode == 200) {
          body1 = JSON.parse(body1);
          if (stock[1]) {
            request(
              "https://repeated-alpaca.glitch.me/v1/stock/" +
                stock[1] +
                "/quote",
              (error, response, body2) => {
                if (!error && response.statusCode == 200) {
                  body2 = JSON.parse(body2);
                  next1(res, like, ip, body1, body2);
                }
              }
            );
          } else {
            next1(res, like, ip, body1);
          }
        }
      }
    );
  });
};
