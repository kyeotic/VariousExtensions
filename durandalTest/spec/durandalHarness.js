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
        qPatch: true,
        envPatch: true
    });
    app.start().then(function () {
        app.config = {
            tokenName: 'oat',
            tokenHeaderName: 'x-oat'
        };
        runTests(window.specFiles);
    });
});