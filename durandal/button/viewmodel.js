define(['durandal/app', 'jquery', 'knockout'], function (app, $, ko) {
    return function ButtonWidget() {
        var self = this;

        self.isShowingError = ko.observable(false);
        self.hideError = function() {
            self.isShowingError(false);
        };

        self.activate = function (config) {
            var options = config || {};

            self.id = options.id;
            //Don't unwrap, if it's an observable we want to bind it directly
            self.text = options.text;

            self.command = ko.promiseCommand({
                canExecute: options.command.canExecute,
                autoResetSuccess: options.command.update ,
                autoResetError: options.command.autoResetError,
                autoResetTime: options.command.autoResetTime,
                execute: function (context, event) {
                    var parentContext = ko.contextFor(event.currentTarget).$parent;

                    //Bare functions will return promises
                    //Wrapping in a deferred ensures the result is safe regardless
                    return app.defer(function (defer) {
                        //The context redirection ensures that commands inside a foreach (or with)
                        //Still get the correct context, as if this was NOT a widget, but a real button
                            defer.resolve(options.command(parentContext, event));
                        }).promise()
                        //Commands that are in a shared context, like a foreach
                        //Need to individualize their errors
                        //When this INSTANCE of the command completes, we will capture it's error state
                        //Error text automaticaly sets the isErroredState
                        .finally(function () {
                            if (options.command.errorText)
                                self.command.errorText(options.command.errorText());
                        });
                }
            });

            self.isSubmit = options.isSubmit;

            self.btnCss = options.btnCss;
            self.btnSuccessCss = options.btnSuccessCss;
            self.btnErrorCss = options.btnErrorCss;
            self.btnRunningCss = options.btnRunningCss;

            self.iconCss = options.iconCss;
            self.successIcon = options.successIcon;
            self.errorIcon = options.errorIcon;
            self.runningIcon = options.runningIcon;
            self.spinIconClass = options.spinIconClass;

            self.tooltip = options.tooltip;

            self.btnStaticCss = options.btnStaticCss;
            self.iconStaticCss = options.iconStaticCss;
        };

        self.attached = function (view) {

            var btn = $(view).find('button').get(0),
                icon = $(view).find('i').get(0);

            if (self.isSubmit)
                btn.setAttribute('type', 'submit');

            //Add optional classes
            if (self.btnStaticCss)
                $(btn).addClass(self.btnStaticCss);
            if (self.iconStaticCss)
                $(icon).addClass(self.iconStaticCss);

            //Attach id if we got one
            //This can't be in the HTML as a binding because its optional, and a null id binding will cause errors
            if (self.id) {
                ko.applyBindingsToNode(btn, { attr: { id: self.id } });
            }

            //Attach tooltip if we got one
            //This can't be in the HTML as a binding because its optional, and a null tooltip binding will cause errors
            if (self.tooltip)
                ko.applyBindingsToNode(view, { tooltip: self.tooltip });
            
            //State will only exist on promiseCommands
            //This widget should work with normal functions, just without the async behavior
            if (self.command.state) {
                //Subscribe to state changes for error handling
                self.command.state.subscribe(function(newState) {
                    if (newState === ko.bindingHandlers.activity.states.error) {
                        self.isShowingError(true);
                    } else {
                        self.isShowingError(false);
                    }
                });
                self.isShowingError.subscribe(function(show) {
                    if (self.command.state() === ko.bindingHandlers.activity.states.error && !show)
                        self.command.clearError();
                });
            } else {
                //Apply the idle icon for all non-sync cases
                ko.utils.toggleDomNodeCssClass($(view).find('i').get(0), self.iconCss, true);
            }
        };
    };
});
