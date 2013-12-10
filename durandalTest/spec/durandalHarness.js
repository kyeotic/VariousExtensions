define(['durandal/system', 'durandal/app', 'knockout'], function (system, app, ko) {
    app.configurePlugins({
        //Durandal plugins
        router: true,
        dialog: true,
        //App plugins
        widget: {
            kinds: ['grid']
        },
        knockoutExtensions: true,
        knockoutCommands: true,
        qPatch: true
    });
    app.start().then(function () {
        runTests(window.specFiles);
    });
});
