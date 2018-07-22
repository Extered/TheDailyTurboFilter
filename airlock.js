window.AirLock = window.AirLock || {};

window.AirLock.inject = function (name, ignore) {
    window.AirLock.injections = window.AirLock.injections || {};
    var event = new CustomEvent('inject', {
        detail: {
            fileName: name
        }
    });
    document.dispatchEvent(event);
    if (!ignore) {
        let fileName = name.split('/');
        fileName = fileName.pop();
        window.AirLock.injections[fileName] = true;
    }
}

window.AirLock.confirmInjection = function(name) {
    if (window.AirLock.injections[name]) {
        delete window.AirLock.injections[name];
    }

    console.log(name, 'injection confirmed');

    // If everything that is required by AirLock was defined,
    // it's okay to define Air modules and start Air
    if (Object.keys(window.AirLock.injections).length === 0) {
        window.AirLock.injections = null;

        window.AirLock.AirDefinitions.map((value) => value());
        if (window.AirLock.onStartCallback) {
            window.AirLock.onStartCallback();
        }
    }
}

window.AirLock.onConfig = function() {

}

window.AirLock.onStart = function (callback) {
    window.AirLock.onStartCallback = callback;
}

window.AirLock.onAirDefined = function() {
    window.AirLock.inject('xifilter/xifilter.js');
}

window.AirLock.AirDefinitions = [];

// Defines Air module via DOM
window.AirLock.define = function () {
    let unpackedArgs = Array.from(arguments);
    let moduleName = unpackedArgs.shift();

    var x = document.createElement('air');
    x.setAttribute('module', moduleName);
    document.head.appendChild(x);
    window.Air._define(moduleName, ...unpackedArgs);
}

window.AirLock.interceptDefinition = function(name, callback) {
    window.AirLock.interceptedDefinitions = window.AirLock.interceptedDefinitions || {};
    window.AirLock.interceptedDefinitions[name] = callback;
}

// Intercept Air object, inject our calls
Object.defineProperty(window, 'Air', {
    get: function () {
        return window._Air;
    },
    set: function (value) {
        value._config = value.config;
        value.config = function() {
            window.AirLock.onConfig();
            return value._config(...arguments);
        }

        // Intercept start() call so that all AirLock modules could load properly
        value._start = value.start;
        value.start = function() {
            if (window.AirLock.injections !== null) {
                // Postpone start if some AirLock module wasn't defined yet
                window.AirLock.onStart(() => value._start(...arguments))
            } else {
                // Call Air start method if everything was already defined
                value._start(...arguments);
            }
        }

        // Override define* methods of Air to control loading order
        Object.keys(value).map((key) => {
            if (key.indexOf('define') !== -1) {
                value['_' + key] = value[key];
                value[key] = function() {
                    window.AirLock.AirDefinitions.push(() => {
                        if (window.AirLock.interceptedDefinitions[arguments[0]]) {
                            let result = window.AirLock.interceptedDefinitions[arguments[0]](...arguments);
                            return value['_' + key](...result);
                        }
                        return value['_' + key](...arguments);
                    });
                }
            }
        })
        window._Air = value;
        window.AirLock.onAirDefined();
    }
});
console.log('Airlock loaded');