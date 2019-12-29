"use strict";

var MongoClient = require("mongodb");
var assert = require("chai").assert;
const request = require("request-promise-native");

const CONNECTION_STRING = process.env.DB;

module.exports = app => {
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
    const ip =
      (
        req.headers["X-Forwarded-For"] ||
        req.headers["x-forwarded-for"] ||
        ""
      ).split(",")[0] || req.client.remoteAddress;
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
          Promise.all([
            (!like&&!values[0])
              ? like
              : col
                  .findOne({ symbol: values[0].symbol.toLowerCase() })
                  .then(dbresult => {
                    col.findOneAndUpdate(
                      {
                        symbol: values[0].symbol.toLowerCase(),
                        ips: { $nin: [ip] }
                      },
                      { $push: { ips: ip } },
                      dbresult ? {} : { upsert: true },
                      (err, dbresult) => {
                        assert.equal(null, err);
                        return like;
                      }
                    );
                  })
                  .catch(err => console.log("err:", err)),
            !like
              ? like
              : col
                  .findOne({ symbol: values[1].symbol.toLowerCase() })
                  .then(dbresult => {
                    col.findOneAndUpdate(
                      {
                        symbol: values[1].symbol.toLowerCase(),
                        ips: { $nin: [ip] }
                      },
                      { $push: { ips: ip } },
                      dbresult ? {} : { upsert: true },
                      (err, dbresult) => {
                        assert.equal(null, err);
                        return like;
                      }
                    );
                  })
                  .catch(err => console.log("err:", err))
          ]).then(like => {
            Promise.all([
              !values[0]
                ? values[0]
                : col
                    .findOne({ symbol: values[0].symbol.toLowerCase() })
                    .then(dbResult => {
                      return {
                        stock: values[0].symbol,
                        price: values[0].latestPrice,
                        likes: dbResult ? dbResult.ips.length : 0
                      };
                    })
                    .catch(err => console.log("err:", err)),
              !values[1]
                ? values[1]
                : col
                    .findOne({ symbol: values[1].symbol.toLowerCase() })
                    .then(dbResult => {
                      return {
                        stock: values[1].symbol,
                        price: values[1].latestPrice,
                        likes: dbResult ? dbResult.ips.length : 0
                      };
                    })
                    .catch(err => console.log("err:", err))
            ]).then(values => {
              let result = [];
              if (values[0] == undefined && values[1] == undefined)
                result = { likes: 0 };
              else if (values[0] !== undefined && values[1] !== undefined) {
                // both exist
                if (values[0] === null)
                  result[0] = { error: "external source error", rel_likes: 0 };
                else if (values[0] === false) result[0] = { rel_likes: 0 };
                else {
                  values[0].rel_likes = values[0].likes - values[1].likes;
                  result[0] = values[0];
                }
                if (values[1] === null)
                  result[1] = { error: "external source error", rel_likes: 0 };
                else if (values[1] === false) result[1] = { rel_likes: 0 };
                else {
                  values[1].rel_likes = values[1].likes - values[0].likes;
                  result[1] = values[1];
                }
                delete values[0].likes, values[1].likes;
                result = [result[0], result[1]];
              } else {
                // only one
                if (values[0] === null)
                  result[0] = { error: "external source error", likes: 0 };
                else if (values[1] === null)
                  result[1] = { error: "external source error", likes: 0 };
                else if (values[0] === false) result[0] = { likes: 0 };
                else if (values[1] === false) result[1] = { likes: 0 };
                else if (values[0] !== undefined) result[0] = values[0];
                else if (values[1] !== undefined) result[1] = values[1];
                result = result[0] || result[1];
              }
              res.json({ stockData: result });
            });
          });
        }
      );
    });
  });
};
