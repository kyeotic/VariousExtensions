define(['durandal/system', 'durandal/app'], function(system, app) {
    
    var install = function (config) {
    	config = config || {};
    	if (config.debugMode)
    		Q.longStackSupport = true;

    	//This changes Durandal's default promise from jQuery to Q
	    system.defer = function (action) {
	        var deferred = Q.defer();
	        action.call(deferred, deferred);
	        var promise = deferred.promise;
	        deferred.promise = function () {
	            return promise;
	        };
	        return deferred;
	    };

	    system.deferred = app.deferred = Q.defer;
	    
	    system.delay = function (ms) {
	      return Q.delay(ms);
	    };

	    app.deferAll = system.deferAll = Q.all;
	    app.defer = system.defer;
	    app.delay = system.delay;
	    app.log = system.log;

	    app.guid = system.guid;
    };

    return {
        install: install
    };
});
