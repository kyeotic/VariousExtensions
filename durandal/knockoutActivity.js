define(['knockout', 'jquery'], function (ko, $) {

    var install = function () {

        var activityStates = {
            idle: 'idle',
            running: 'running',
            success: 'success',
            error: 'error'
        };

        ko.bindingHandlers.activity = {
            states: activityStates,
            init: function (element, valueAccessor, allBindings) {
                var observable = valueAccessor(),
                    state = observable.state !== undefined ? observable.state : observable,
                    iconCss = allBindings.get('iconCss') || '',
                    iconSuccess = allBindings.get('iconSuccess') || 'fa-check',
                    iconErrorCss = allBindings.get('iconErrorCss') || 'fa-warning',
                    iconRunningCss = allBindings.get('iconRunningCss') || 'fa-circle-o-notch',
                    iconSpinCss = allBindings.get('iconSpinCss') || 'fa-spin';

                ko.applyBindingAccessorsToNode(element, {
                    css: function() {
                        var result = {},
                            value = ko.unwrap(state);

                        result[iconCss] = value === ko.bindingHandlers.activity.states.idle;

                        //We need to suppport cases where multiple states have a single icon
                        //Each check should only happen if the previous result is not true
                        //So they they don't undo previous values

                        result[iconSuccess] = result[iconSuccess] ? true : value === ko.bindingHandlers.activity.states.success;
                        result[iconErrorCss] = result[iconErrorCss] ? true : value === ko.bindingHandlers.activity.states.error;
                        result[iconRunningCss] = result[iconRunningCss] ? true : value === ko.bindingHandlers.activity.states.running;
                        result[iconSpinCss] = result[iconSpinCss] ? true : value === ko.bindingHandlers.activity.states.running;

                        return result;
                    }
                });
            }
        };
    };

    return {
        install: install
    };
});
