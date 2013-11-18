var crypto = require('crypto');
var algorithm = 'sha256';
var workFactorDefault = 10;

var results = {
    failed: false,
    passed: true,
    passedNeedsUpdate: "passedNeedsUpdate"
};

module.exports.results = results;

function generateSalt() {
    var saltLength = 8;
    return crypto.randomBytes(Math.ceil(saltLength / 2)).toString('hex').substring(0, saltLength);
}

function generateHash(algorithm, salt, password, workFactor) {
    var iterations = Math.pow(2, workFactor);
    try {
        var hash = password;
        for(var i=0; i<iterations; ++i) {
          hash = crypto.createHmac(algorithm, salt).update(hash).digest('hex');
        }    
    return algorithm + '$' + salt + '$' + workFactor + '$' + hash;
    } catch (e) {
        throw new Error('Invalid message digest algorithm');
    }
}

function makeBackwardCompatible(hashedPassword) {
    var parts = hashedPassword.split('$');
    if(parts.length === 3) {
        parts.splice(2,0,1);
        hashedPassword = parts.join("$");
    }
  
  return hashedPassword;
}

module.exports.generate = function(password) {
    //console.log(typeof password);
    if (typeof password != 'string') 
        throw new Error('Invalid password');
    
    var salt = generateSalt();
    return generateHash(algorithm, salt, password, workFactorDefault);
};

module.exports.verify = function(password, hashedPassword) {
    if (!password || !hashedPassword) 
        return results.failed;
    hashedPassword = makeBackwardCompatible(hashedPassword);
    var parts = hashedPassword.split('$');
    if (parts.length != 4) 
        return results.failed;
    var needsUpdate = parts[2] != workFactorDefault;
    try {
        var passed = generateHash(parts[0], parts[1], password, parts[2]) == hashedPassword;
        if(passed){
            return needsUpdate ? results.passedNeedsUpdate : results.passed;
        } else {
            return results.failed;
        }
    } catch (e) {}
    return results.failed;
};

module.exports.isHashed = function(password) {
    if (!password) return false;
    return password.split('$').length == 4;
};

