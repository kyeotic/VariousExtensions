define(['knockout', 'jquery', 'plugins/dialog', 'bootstrap'], function (ko, $, dialog) {

    var install = function () {

        //
        //Create new context for bootstrap dialogs
        dialog.addContext('bootstrap', {
            addHost: function (theDialog) {
                var body = $('body');
                $('<div class="modal fade" id="bootstrapModal"><div class="modal-dialog"><div class="modal-content" id="modalHost"></div></div></div>').appendTo(body);
                theDialog.host = $('#modalHost').get(0);
            },
            removeHost: function (theDialog) {
                //This was originally in a timeout, though I don't know why
                //If you encouter problems with closing later, put the timeout back in for 10ms
                $('#bootstrapModal').modal('hide');
                $('body').removeClass('modal-open');
                $('.modal-backdrop').remove();
            },
            compositionComplete: function (child, parent, context) {
                var theDialog = dialog.getDialog(context.model),
                    $child = $(child);
                $('#bootstrapModal').modal({ backdrop: 'static', keyboard: false, show: true });

                //Setting a short timeout is need in IE8, otherwise we could do this straight away
                setTimeout(function () {
                    $child.find('.autofocus').first().focus();
                }, 1);

                if ($child.hasClass('autoclose') || context.model.autoclose) {
                    $(theDialog.blockout).click(function () {
                        theDialog.close();
                    });
                }
            },
            attached: null
        });

        //rebind dialog.show to default to a new context
        var oldShow = dialog.show;
        dialog.show = function(obj, data, context) {
            return oldShow.call(dialog, obj, data, context || 'bootstrap');
        };

        /*
            This binding taken from knockout-bootstrap: https://github.com/billpull/knockout-bootstrap
        */
        // Tooltip
        ko.bindingHandlers.tooltip = {
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var $element, options, tooltip;
                options = ko.utils.unwrapObservable(valueAccessor());
                $element = $(element);

                // If the title is an observable, make it auto-updating.
                if (ko.isObservable(options.title)) {
                    var isToolTipVisible = false;

                    $element.on('show.bs.tooltip', function () {
                        isToolTipVisible = true;
                    });
                    $element.on('hide.bs.tooltip', function () {
                        isToolTipVisible = false;
                    });

                    // "true" is the bootstrap default.
                    var origAnimation = options.animation || true;
                    options.title.subscribe(function () {
                        if (isToolTipVisible) {
                            $element.data('bs.tooltip').options.animation = false; // temporarily disable animation to avoid flickering of the tooltip
                            $element.tooltip('fixTitle') // call this method to update the title
                                    .tooltip('show');
                            $element.data('bs.tooltip').options.animation = origAnimation;
                        }
                    });
                }

                tooltip = $element.data('bs.tooltip');
                if (tooltip) {
                    $.extend(tooltip.options, options);
                } else {
                    $element.tooltip(options);
                }

                //handle disposal (if KO removes by the template binding)
                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    $(element).tooltip("destroy");
                });
            }
        };

        ko.bindingHandlers.popover = {
            init: function (element, valueAccessor) {
                var options = valueAccessor(),
                    isShowing = options.show,
                    $element = $(element),
                    initialized = false,
                    popover;

                if (!ko.isObservable(isShowing))
                    throw new Error("Popover binding requires the 'show' property to be observable");

                var initPopover = function() {
                    if (initialized)
                        $element.popover('destroy');

                    $element.popover({
                        content: ko.unwrap(options.body),
                        title: ko.unwrap(options.title),
                        trigger: ko.unwrap(options.trigger) || 'manual',
                        placement: ko.unwrap(options.placement) || 'left',
                    });
                    $element.popover('show');
                    initialized = true;

                    if (options.useCloseButton) {
                        //This is the actual popover element
                        popover = $element.data()['bs.popover'].$tip;
                        popover.on('click', function() {
                            isShowing(false);
                        });
                    }
                };

                //Create the popover if ready
                if (ko.unwrap(isShowing))
                    initPopover();

                //Wire up the isShowing observable
                var showingSubscription = isShowing.subscribe(function (show) {
                    if (show)
                        initPopover();
                    else if (initialized)
                        $element.popover('destroy');
                });
                $element.on('show.bs.popover', function() {
                     isShowing(true);
                });
                $element.on('hide.bs.popover', function() {
                     isShowing(false);
                });

                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    //Remove the isShowing subscriptions
                    if (showingSubscription && showingSubscription.dispose)
                        showingSubscription.dispose();
                    //Cleanup popover event handlers and DOM nodes
                    $element.popover('destroy');
                    $element.off('show.bs.popover');
                    $element.off('hide.bs.popover');
                    if (popover)
                        popover.off('click');
                    //Clean any hanging jQuery data
                    ko.utils.domNodeDisposal.cleanExternalData(element);
                });
            }
        };
    };

    return {
        install: install
    };
});
