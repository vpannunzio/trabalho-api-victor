const jwt = require("jsonwebtoken");
const database = require("../config/database");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token de acesso requerido",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Token inválido ou expirado",
      });
    }

    // Ve se o usuário ainda existe
    const user = database.findUserById(decoded.userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    req.user = user;
    next();
  });
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "24h" });
};

module.exports = {
  authenticateToken,
  generateToken,
};
