define(['knockout'], function(ko) {

    var install = function () {

        //Depends on SugarJS
        ko.viewmodel = function (viewmodel, map) {
            Object.keys(map, function(key, value) {
                viewmodel[key] = Object.isArray(value) ? ko.observableArray(value) : ko.observable(value);
            });
            
            //TODO: consider creating an 'udpate' method on the viewmodel that merges in changes
        };

        ko.observableArray.fn.map = function(data, constructor) {
            this(ko.utils.arrayMap(data, function(i) {
                return new constructor(i);
            }));
        };

        ko.observableArray.fn.pushAll = function(items){
            if(!(items instanceof Array)) return this.peek().length;
            this.valueWillMutate();
            ko.utils.arrayPushAll(this.peek(), items);
            this.valueHasMutated();
            return this.peek().length;
        };

        ko.observableArray.fn.subscribeArrayChanged = function(addCallback, deleteCallback) {
            var previousValue = undefined;
            this.subscribe(function(_previousValue) {
                previousValue = _previousValue.slice(0);
            }, undefined, 'beforeChange');
            this.subscribe(function(latestValue) {
                var editScript = ko.utils.compareArrays(previousValue, latestValue);
                for (var i = 0, j = editScript.length; i < j; i++) {
                    switch (editScript[i].status) {
                        case "retained":
                            break;
                        case "deleted":
                            if (deleteCallback)
                                deleteCallback(editScript[i].value);
                            break;
                        case "added":
                            if (addCallback)
                                addCallback(editScript[i].value);
                            break;
                    }
                }
                previousValue = undefined;
            });
        };

        ko.bindingHandlers.hidden = {
            update: function (element, valueAccessor) {
                var value = ko.utils.unwrapObservable(valueAccessor());
                ko.bindingHandlers.visible.update(element, function () { return !value; });
            }
        };

        ko.extenders.isValid = function (target, validator) {
            //Use for tracking whether validation should be used
            //The validate binding will init this on blur, and clear it on focus
            //So that editing the field immediately clears errors
            target.isActive = ko.observable(false);

            if (typeof validator !== 'function') {
                validator = function(value) {
                    return value !== undefined && value !== null && value.length > 0;
                };
            }

            target.isValid = ko.computed(function () {
            return validator(target());
            });

            //Just a convienient wrapper to bind against for error displays
            //Will only show errors if validation is active AND invalid
            target.showError = ko.computed(function () {
                //This intentionally DOES NOT short circuit, to establish dependency on isActive AND isValid
                return target.isActive() & !target.isValid();
            });

        return target;
        };

        //Just activate whatever observable is given to us on first blur
        ko.bindingHandlers.validate = {
        init: function (element, valueAccessor) {
            
            //Active will remain false until we have left the field
            //Starting the input with validation errors is bad
            ko.utils.registerEventHandler(element, 'blur', function() {
                valueAccessor().isActive(true);
            });
            //Validation should turn off while we are in the field
            ko.utils.registerEventHandler(element, 'focus', function() {
                valueAccessor().isActive(false);
            });
            
            //Wrap value init
            ko.bindingHandlers.value.init.apply(this, arguments);
        },
        //just wrap the update binding handler
        update: ko.bindingHandlers.value.update
        };

        ko.extenders.numeric = function(target, options) {
            //create a writeable computed observable to intercept writes to our observable
            var result = ko.computed({
                read: target,  //always return the original observables value
                write: function(newValue) {
                    var current = target(),
                        roundingMultiplier = Math.pow(10, options.precision || 0),
                        newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                        valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;
                    if (options.positive){
                        valueToWrite = Math.abs(valueToWrite);
                    }
                    //only write if it changed
                    if (valueToWrite !== current) {
                        target(valueToWrite);
                    } else {
                        //if the rounded value is the same, but a different value was written, force a notification for the current field
                        if (newValue !== current) {
                            target.notifySubscribers(valueToWrite);
                        }
                    }
                }
            });
         
            //initialize with current value to make sure it is rounded appropriately
            result(target());
         
            //return the new computed observable
            return result;
        };
    };  

    return {
        install: install
    };
});
