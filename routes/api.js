"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const request = require("request-promise-native");

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

  app.route("/api/stock-prices").get((req, res) => {
    let stock = req.query.stock;
    if (typeof stock === "undefined") {
      stock = [undefined, undefined];
    } else if (typeof stock === "string") {
      stock = [];
      stock.push(req.query.stock);
      stock.push(undefined);
    } else {
      if (!stock[0]) stock[0] = null;
      if (!stock[1]) stock[1] = null;
    }
    let like = req.query.like ? req.query.like.toLowerCase() === "true" : false;
    const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
    Promise.all([
      !stock[0]
        ? stock[0]
        : request({
            methode: "GET",
            uri:
              "https://repeated-alpaca.glitch.me/v1/stock/" +
              stock[0] +
              "/quote",
            resolveWithFullResponse: true
          })
            .then(response =>
              response.statusCode == 200 ? JSON.parse(response.body) : false
            )
            .catch(err => console.log("err:", err)),
      !stock[1]
        ? stock[1]
        : request({
            methode: "GET",
            uri:
              "https://repeated-alpaca.glitch.me/v1/stock/" +
              stock[1] +
              "/quote",
            resolveWithFullResponse: true
          })
            .then(response =>
              response.statusCode == 200 ? JSON.parse(response.body) : false
            )
            .catch(err => console.log("err:", err))
    ]).then(values => {
      MongoClient.connect(
        CONNECTION_STRING,
        { useUnifiedTopology: true },
        (err, client) => {
          assert.equal(null, err);
          let col = client.db("test").collection("stocks_ip");
          if (!like) {
            next2(col, res, values[0], values[1]);
          } else {
            let q1 = {
              symbol: values[0].symbol.toLowerCase(),
              ips: { $nin: [ip] }
            };
            let q = q1;
            if (values[1]) {
              let q2 = {
                symbol: values[1].symbol.toLowerCase(),
                ips: { $nin: [ip] }
              };
              q = { $or: [q1, q2] };
            }
            col.findAndUpdate(
              q,
              { $push: { ips: ip } },
              { upsert: true },
              (err, resdb) => {
                assert.equal(null, err);
                next2(col, res, values[0], values[1]);
              }
            );
          }
        }
      );
    });
  });
};
