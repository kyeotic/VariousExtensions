var hasher = require("./hasher");

var generateUserToken = function(user) {
    var token = {
        username: user.username,
        role: user.role,
        issuedAt: Date.create(),
        expiresAt: Date.create("tomorrow")
    };
    signToken(token);
    return token;
};

var getTokenSignature = function(token) {
    return JSON.stringify({
        username: token.username,
        role: token.role,
        issuedAt: token.issuedAt,
        expiresAt: token.expiresAt,
        secret: "#MUTHAFUCKINGHASHTAGSUPINTHISBITCH"
    });
};

var signToken = function(token) {
    token.signature = hasher.generate(getTokenSignature(token));
};

var verifyToken = function(token) {
    return hasher.verify(getTokenSignature(token), token.signature) == hasher.results.passed;
};

var requireToken = function(req, res, next) {    
    var token = getToken(req);
    //console.log(token);
    
    var fail = function() {
        res.send(401, "Security token missing.");
        res.end();
    };
    
    try {
        token = JSON.parse(decodeURI(token));
        if (verifyToken(token)) {
            req.token = token;
            next();
        } else {
            fail();
        }
    } catch (e){
        fail();
    }
};

var getToken = function(req) {
    return req.headers['x-auth-token'];
};

module.exports = {
    generateUserToken: generateUserToken,
    signToken: signToken,
    verifyToken: verifyToken,
    requireToken: requireToken,
    getToken: getToken
};
