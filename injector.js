if (chrome) {
    browser = chrome;
}

function injectScript(name) {
    var s = document.createElement('script');
    s.src = browser.extension.getURL(name);
    s.onload = function() {
        this.remove();
    };
    document.documentElement.appendChild(s);
}

function injectStyle(name) {
    var s = document.createElement('link');
    s.rel = 'stylesheet';
    s.href = browser.extension.getURL(name);
    document.documentElement.appendChild(s);
}

document.addEventListener('inject', (e) => {
    if (e.detail && e.detail.fileName) {
        let fileName = e.detail.fileName;
        if (fileName.endsWith('.js')) {
            injectScript(fileName);
        } else if (fileName.endsWith('.css')) {
            injectStyle(fileName);
        }
    }
});

let value = 42;


document.addEventListener('loadXiData', (e) => {
    browser.storage.local.get(['filters', 'users'], function(result) {
        try {
            var event = new CustomEvent('xiData', {
                detail: result
            });
            document.dispatchEvent(event);
        } catch (e) {
            console.error('Unable to load filters', e);
        }
    });
});

document.addEventListener('saveXiData', (e) => {
    browser.storage.local.set(e.detail, function() {
        console.log('Filters saved');
    });
});

injectScript('airlock.js');