define(['knockout', 'jquery'], function(ko, $) {

    var install = function() {

        //Depends on SugarJS
        ko.viewmodel = function (viewmodel, map, createUpdateMethod) {
            Object.keys(map, function (key, value) {
                viewmodel[key] = Object.isArray(value) ? ko.observableArray(value) : ko.observable(value);
                if (value.valueOf && value.extend)
                    viewmodel[key] = viewmodel[key].extend(value.extend);
            });
            
            if (createUpdateMethod) {
                viewmodel.update = function(data) {
                    Object.keys(map, function(key, value) {
                        if (data[key])
                            viewmodel[key](value);
                    });
                };
            }
        };

        //=================================================================================
        //Validation
        //=================================================================================

        var defaultMessage = 'Invalid Value',
        defaultValidator = function (value) {
            return value !== undefined && value !== null && (value.length === undefined || value.length > 0);
        };

        var getValidationFunction = function (validator) {

            //Allow Regex validations
            if (validator instanceof RegExp) {
                var validationRegex = validator;
                validator = function (value) {
                    return value !== undefined && value !== null && validationRegex.test(value);
                };
                return validator;
            }

            if (typeof validator === 'object') {
                var validation = validator;
                validator = function (value) {
                    var passed = true,
                        valueFloat = parseFloat(value, 10);

                    //If we require numbers, we use a parsed value, any isNaN is a failure
                    if (validation.min && (valueFloat < ko.unwrap(validation.min) || isNaN(valueFloat)))
                        passed = false;
                    if (validation.max && (valueFloat > ko.unwrap(validation.max) || isNaN(valueFloat)))
                        passed = false;

                    if (validation.minLength && value.length < ko.unwrap(validation.minLength))
                        passed = false;
                    if (validation.maxLength && value.length > ko.unwrap(validation.maxLength))
                        passed = false;
                        
                    var options = ko.unwrap(validation.options);
		            if (options && options instanceof Array && options.indexOf(value) === -1)
		                passed = false;

                    return passed;
                };
            }

            //If validator isn't regex or function, provide default validation
            return typeof validator === 'function' ? validator : defaultValidator;
        };

        var getValidation = function (validator) {
            var message = defaultMessage,
                handler;

            if (typeof validator === 'object') {
                if (validator.message)
                    message = validator.message;
                handler = getValidationFunction(validator.validate);
            } else {
                handler = getValidationFunction(validator);
            }

            return {
                validate: handler,
                message: message
            };
        };

        ko.extenders.isValid = function (target, validator) {
            //Use for tracking whether validation should be used
            //The validate binding will init this on blur, and clear it on focus
            //So that editing the field immediately clears errors
            target.isModified = ko.observable(false);

            var validations = [];

            if (validator instanceof Array) {
                validator.forEach(function (v) {
                    validations.push(getValidation(v));
                });
            } else {
                validations.push(getValidation(validator));
            }

            //We need to track both failure and the message in one step
            //Having one set the other feels odd, and having both run through
            //All the validation methods is inefficient.
            var error = ko.computed(function () {
                var value = target();
                //We want just the first failing validation, but we want to run
                //All the functions to establish an closed-over dependencies that might exist
                //in each function. We are trading performance for additional flexiblity here.
                var result = validations.filter(function (validation) {
                    return !validation.validate(value);
                });

                return result.length > 0 ? result[0] : undefined;
            });

            target.isValid = ko.computed(function () {
                return error() === undefined;
            });

            target.errorMessage = ko.computed(function () {
                return error() !== undefined ? ko.unwrap(error().message) : '';
            });

            //Just a convienient wrapper to bind against for error displays
            //Will only show errors if validation is active AND invalid
            target.showError = ko.computed(function () {
                var active = target.isModified(),
                    isValid = target.isValid();
                return active && !isValid;
            });

            return target;
        };

        //Just activate whatever observable is given to us on first blur
        ko.bindingHandlers.validate = {
            init: function (element, valueAccessor) {
                if (!ko.isObservable(valueAccessor()))
                    throw new Error("The validate binding cannot be used with non-observables.");

                ko.bindingHandlers.value.init.apply(this, arguments); //Wrap value init

                //Starting the input with validation errors is bad
                //We will activate the validation after the user has done something
                //Select's get change raised when OPTIONS are bound, which is very common
                //We don't want that to activate validation
                if (element.nodeName.toLowerCase() === "select") {
                    valueAccessor().__selectInit = false;
                }

                //Active will remain false until we have left the field
                ko.utils.registerEventHandler(element, 'blur', function () {
                    valueAccessor().isModified(true);
                });
            },
            update: function (element, valueAccessor) {
                //Input's get activated on blur, not update
                if (element.nodeName.toLowerCase() === "select") {
                    //The update handler runs on INIT, so we need a way to skip the 1st time only
                    if (!valueAccessor().__selectInit)
                        valueAccessor().__selectInit = true;
                    else
                        valueAccessor().isModified(true);
                }
                ko.bindingHandlers.value.update.apply(this, arguments); //just wrap the update binding handler
            }
        };

        //=================================================================================
        //Binding Handlers
        //=================================================================================

        ko.bindingHandlers.slideVisible = {
            update: function(element, valueAccessor, allBindings) {
                var value = valueAccessor();
                var valueUnwrapped = ko.unwrap(value);
                var duration = ko.unwrap(allBindings().slideDuration) || 400;
         
                if (valueUnwrapped === true)
                    $(element).slideDown(duration); // Make the element visible
                else
                    $(element).slideUp(duration);   // Make the element invisible
            }
        };

        ko.bindingHandlers.enterKey = {
            init: function(element, valueAccessor, allBindings, data) {
                var handler = function(data, event) {
                    if (event.keyCode === 13) {
                        valueAccessor().call(data, data, event);
                    }
                };
                var newValueAccessor = function() {
                    return { keyup: handler };
                };
                ko.bindingHandlers.event.init(element, newValueAccessor, allBindings, data);
            }
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

        ko.subscribable.fn.subscribeChanged = function(callback) {
            var previousValue;
            this.subscribe(function(_previousValue) {
                previousValue = _previousValue;
            }, undefined, 'beforeChange');
            this.subscribe(function(latestValue) {
                callback(latestValue, previousValue );
            });
        };

        ko.observableArray.fn.subscribeArrayChanged = function(addCallback, deleteCallback) {
            var previousValue;
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
                                deleteCallback(editScript[i].value, i);
                            break;
                        case "added":
                            if (addCallback)
                                addCallback(editScript[i].value, i);
                            break;
                    }
                }
                previousValue = undefined;
            });
        };

        ko.extenders.numeric = function(target, options) {
            //create a writeable computed observable to intercept writes to our observable
            var result = ko.computed({
                read: target,  //always return the original observables value
                write: function(newValue) {
                    var current = target(),
                        roundingMultiplier = Math.pow(10, ko.unwrap(options.precision) || 0),
                        newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                        valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

                    if (ko.unwrap(options.positive)){
                        valueToWrite = Math.abs(valueToWrite);
                    }
                    if (ko.unwrap(options.min) !== undefined) {
                        valueToWrite = Math.max(ko.unwrap(options.min), valueToWrite);
                    }
                    if (ko.unwrap(options.max) !== undefined) {
                        valueToWrite = Math.min(ko.unwrap(options.max), valueToWrite);
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

            //Subscribe to any observables options
            [options.precision, options.positive, options.min, options.max].forEach(function(prop) {
                if (ko.isObservable(prop)) {
                    prop.subscribe(function() {
                        result(result());
                    });
                }
            });
         
            //return the new computed observable
            //Without notify, the notifySubscribers will fail on 2-N attempts, due to stale value persistence
            return result.extend({ notify: 'always' });
        };
    };

    

    return {
        install: install
    };
});
