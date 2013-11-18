var fs = require('fs');

module.exports = function(app){
    //Index
    app.get('/', function(req, res){        
        res.render('index');
    });
    
    //Load all other routes in DIR
    fs.readdirSync(__dirname).forEach(function(file) {
        //Skip this file
        if (file == "index.js") 
            return;
        require(__dirname + '/' + file)(app);
    });
};
