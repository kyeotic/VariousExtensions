/*
    Taken from KoLite
    Copyright © 2012 Hans Fjällemark & John Papa

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    Promise Command by Tim Moran
*/

define(['knockout', 'jquery', 'Q', 'durandal/system'], function (ko, $, Q, system) {

    var install = function () {
        //Command objects
        ko.command = function (options) {
            var
                self = function () {
                    return self.execute.apply(this, arguments);
                },
                canExecuteDelegate = options.canExecute,
                executeDelegate = options.execute;

            self.canExecute = ko.computed(function () {
                return canExecuteDelegate ? canExecuteDelegate() : true;
            });

            self.execute = function (arg1, arg2) {
                // Needed for anchors since they don't support the disabled state
                if (!self.canExecute())
                    return;

                return executeDelegate.apply(this, [arg1, arg2]);
            };

            return self;
        };

        ko.promiseCommand = function (options) {
            var canExecuteDelegate = options.canExecute,
                executeDelegate = options.execute;

            //This is the method that will be accessible by calling the command as a function
            var self = function () {
                if (!self.canExecute())
                    return Q(null);

                self.isExecuting(true);
                self.clearError();

                //Attaching a fail handler here would result in chained promises being unable to handle
                //Failure cases
                return Q.fapply(executeDelegate, arguments).finally(function () {
                    self.finished(true);
                    self.isExecuting(false);
                });
            };

            self.finished = ko.observable(false);
            self.isErrored = ko.observable(false);
            self.errorText = ko.observable('');
            self.isExecuting = ko.observable(false);

            self.errorText.subscribe(function(newValue) {
                self.isErrored(newValue !== undefined && newValue !== null && newValue !== '');
            });

            self.autoResetSuccess = options.autoResetSuccess !== undefined ? options.autoResetSuccess : true;
            self.autoResetError = options.autoResetError !== undefined ? options.autoResetError : false;
            self.autoResetTime = options.autoResetTime || 4000;

            self.finished.subscribe(function (newValue) {
                if (self.autoResetSuccess && newValue)
                    setTimeout(function () {
                        self.finished(false);
                    }, self.autoResetTime);
            });
            self.isErrored.subscribe(function (newValue) {
                if (self.autoResetError && newValue)
                    setTimeout(function () {
                        self.isErrored(false);
                    }, self.autoResetTime);
            });

            self.clearError = function() {
                self.isErrored(false);
                self.finished(false);
                self.errorText('');
            };

            self.state = ko.computed(function() {
                if (self.isExecuting())
                    return ko.bindingHandlers.activity.states.running;
                else if (self.isErrored())
                    return ko.bindingHandlers.activity.states.error;
                else if (self.finished())
                    return ko.bindingHandlers.activity.states.success;
                else
                    return ko.bindingHandlers.activity.states.idle;
            });

            self.canExecute = ko.computed(function () {
                return canExecuteDelegate ? canExecuteDelegate() && !self.isExecuting() : !self.isExecuting();
            });

            //This is the method called from the binding, so it needs to .done() the promise
            //Otherwise it will eat errors
            self.execute = function (arg1, arg2) {
                self(arg1, arg2)
                    .fail(function(error) {
                        system.error('An unhandled error occurred in a promise command', error);
                        self.isErrored(true);
                    })
                    .finally(function() {
                        self.finished(true);
                    }).done();
            };

            return self;
        };

        //Command Bindings
        ko.utils.wrapAccessor = function (accessor) {
            return function () {
                return accessor;
            };
        };

        ko.bindingHandlers.command = {
            init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var
                    value = valueAccessor(),
                    commands = value.execute ? { click: value } : value,
                    btnCss = allBindings.get('btnCss') || 'btn-primary',
                    btnSuccessCss = allBindings.get('btnSuccessCss') || btnCss,
                    btnErrorCss = allBindings.get('btnErrorCss') || 'btn-danger',
                    btnRunningCss = allBindings.get('btnRunningCss') || 'btn-default',

                    isBindingHandler = function (handler) {
                        return ko.bindingHandlers[handler] !== undefined;
                    },

                    initBindingHandlers = function () {
                        for (var command in commands) {
                            if (!isBindingHandler(command)) {
                                continue;
                            }

                            ko.bindingHandlers[command].init(element, ko.utils.wrapAccessor(commands[command].execute), allBindings, viewModel, bindingContext);
                        }
                    },

                    initEventHandlers = function () {
                        var events = {};

                        for (var command in commands) {
                            if (!isBindingHandler(command)) {
                                events[command] = commands[command].execute;
                            }
                        }

                        ko.bindingHandlers.event.init(element, ko.utils.wrapAccessor(events), allBindings, viewModel, bindingContext);
                    };

                initBindingHandlers();
                initEventHandlers();

                //State will only exist on promiseCommands
                //This binding should work with normal functions, just without the async behavior
                if (value.state !== undefined) {
                    ko.applyBindingAccessorsToNode(element, {
                        css: function() {
                            switch (ko.unwrap(value.state)) {
                            case ko.bindingHandlers.activity.states.idle:
                                return btnCss;
                            case ko.bindingHandlers.activity.states.success:
                                return btnSuccessCss;
                            case ko.bindingHandlers.activity.states.error:
                                return btnErrorCss;
                            case ko.bindingHandlers.activity.states.running:
                                return btnRunningCss;
                            default:
                                return btnCss;
                            }
                        }
                    });
                } else {
                    //Apply the idle class for all non-sync cases
                    ko.utils.toggleDomNodeCssClass(element, btnCss, true);
                }
            },

            update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
                var commands = valueAccessor();
                var canExecute = commands.canExecute;

                if (!canExecute) {
                    for (var command in commands) {
                        if (commands[command].canExecute) {
                            canExecute = commands[command].canExecute;
                            break;
                        }
                    }
                }

                if (!canExecute) {
                    return;
                }

                ko.bindingHandlers.enable.update(element, canExecute, allBindingsAccessor, viewModel);
            }
        };
    };

    return {
        install: install
    };
});
