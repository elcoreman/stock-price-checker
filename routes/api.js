"use strict";

var MongoClient = require("mongodb");
var assert = require('chai').assert;

const CONNECTION_STRING = process.env.DB;

module.exports = (app)=> {
  app.route("/api/stock-prices").get((req, res)=> {
    let stock = req.query.stock;
    let like = req.query.like.toLowerCase() === "true";
    MongoClient.connect(CONNECTION_STRING, (err, client)=> {
      assert.equal(null, err);
      let col = client.db("test").col(stock);
    });
  });
};
