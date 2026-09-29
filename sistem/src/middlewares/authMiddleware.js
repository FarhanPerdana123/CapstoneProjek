
const jwt = require("jsonwebtoken");
const config = require("../config");
const ApiResponse = require("../utils/apiResponse");

function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return ApiResponse.error(res, {
      message: "Silakan login terlebih dahulu untuk mengakses data ini.",
      statusCode: 401
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return ApiResponse.error(res, {
      message: "Sesi login telah berakhir atau token tidak valid. Silakan login kembali.",
      statusCode: 401,
      error: err.message
    });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}

module.exports = { requireAuth, optionalAuth };
