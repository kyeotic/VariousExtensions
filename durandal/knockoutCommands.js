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
            var canExecuteDelegate = options.canExecute;
            var executeDelegate = options.execute;

            //This is the method that will be accessible by calling the command as a function
            var self = function () {
                if (!self.canExecute())
                    return Q(null);

                self.isExecuting(true);

                return Q.fapply(executeDelegate, arguments).then(function () {
                    self.isExecuting(false);
                });
            };

            self.isExecuting = ko.observable();

            self.canExecute = ko.computed(function () {
                return canExecuteDelegate ? canExecuteDelegate() && !self.isExecuting() : !self.isExecuting();
            });

            //This is the method called from the binding, so it needs to .done() the promise
            //Otherwise it will eat errors
            self.execute = function (arg1, arg2) {
                self(arg1, arg2).done();
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
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var
                    value = valueAccessor(),
                    commands = value.execute ? { click: value } : value,

                    isBindingHandler = function (handler) {
                        return ko.bindingHandlers[handler] !== undefined;
                    },

                    initBindingHandlers = function () {
                        for (var command in commands) {
                            if (!isBindingHandler(command)) {
                                continue;
                            }

                            ko.bindingHandlers[command].init(
                                element,
                                ko.utils.wrapAccessor(commands[command].execute),
                                allBindingsAccessor,
                                viewModel,
                                bindingContext
                            );
                        }
                    },

                    initEventHandlers = function () {
                        var events = {};

                        for (var command in commands) {
                            if (!isBindingHandler(command)) {
                                events[command] = commands[command].execute;
                            }
                        }

                        ko.bindingHandlers.event.init(
                            element,
                            ko.utils.wrapAccessor(events),
                            allBindingsAccessor,
                            viewModel,
                            bindingContext);
                    };

                initBindingHandlers();
                initEventHandlers();
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
