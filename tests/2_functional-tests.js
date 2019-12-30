var chaiHttp = require("chai-http");
var chai = require("chai");
var assert = chai.assert;
var server = require("../server");

chai.use(chaiHttp);

let likes;

suite("Functional Tests", function() {
  suite("GET /api/stock-prices => stockData object", function() {
    test("1 stock", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "goog" })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.property(res.body, "stockData");
          assert.isObject(res.body.stockData);
          assert.property(res.body.stockData, "stock");
          assert.property(res.body.stockData, "price");
          assert.property(res.body.stockData, "likes");
          assert.isString(res.body.stockData.stock);
          assert.isNumber(res.body.stockData.price);
          assert.isNumber(res.body.stockData.likes);
          done();
        });
    });

    test("1 stock with like", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "goog" })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.property(res.body, "stockData");
          assert.isObject(res.body.stockData);
          assert.property(res.body.stockData, "stock");
          assert.property(res.body.stockData, "price");
          assert.property(res.body.stockData, "likes");
          assert.isString(res.body.stockData.stock);
          assert.isNumber(res.body.stockData.price);
          assert.isNumber(res.body.stockData.likes);
          likes = res.body.stockData.likes;
          done();
        });
    });

    test("1 stock with like again (ensure likes arent double counted)", function(done) {});

    test("2 stocks", function(done) {});

    test("2 stocks with like", function(done) {});
  });
});
