const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const header = req.headers['authorization'];
    const token = header && header.split(' ')[1];

    if(token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if(error) return res.sendStatus(403);
        req.email = decode.email;
        next();
    });
} 

module.exports = verifyToken;