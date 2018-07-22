// Catch Fabric created by etc_controls and override update()
AirLock.interceptDefinition('class.Fabric', function() {
    let unpackedArguments = Array.from(arguments);
    let name = unpackedArguments.shift();
    let dependencies = unpackedArguments.shift();
    let FabricDef = unpackedArguments.shift();

    let newFabricDef = function() {
        let actualCtor = FabricDef(...arguments); // Actual fabric constructor
        return function(params) {
            let result;
            if (params.module_name && params.module_name === 'module.etc_controls') {
                // Inject permissions before Fabric initialization
                XiFilter.injectPermissions();

                // Instantiate actual fabric
                result = new actualCtor(params);

                // Override method
                result._update = result.update;
                result.update = function() {
                    XiFilter.injectPermissions();
                    return this._update();
                }
            } else {
                result = new actualCtor(params);
            }
            // This function is treated as a constructor so return original Fabric instance
            return result
        }
    }
    return [name, dependencies, newFabricDef];
});

// Module defines actual controls
AirLock.define('module.xifilter_controls', 'module.etc_controls, module.xifilter_controls_ajaxify', function(etc_controls, xiajaxify) {
    var self = this;
    self.init = function() {
        etc_controls.defineControl({
            name: 'xi_hide_comments',
            use: 'toggle',
            labels: ['Скрыть комменты', 'Показать комменты'],
            action: function(main_element, current_state, callback) {
                let userID = main_element.getAttribute('data-user-id');
                let userName = main_element.parentElement.querySelector('.comments__item__user__name').innerText;
                let hide = !current_state && true;
                callback(XiFilter.hideCommentsFrom(userID, userName, hide));
            },
            msg: {
                // TODO Random messages via proxies?
                success: ['Был пацан &ndash; и нет пацана', 'Комментарии этого пользователя снова отображаются'],
                error: ['Кажется, вы уже блокировали этого пользователя', 'Кажется, пользователь уже разблокирован']
            }
        });

        etc_controls.defineControl({
            name: 'xi_hide_article',
            use: 'toggle',
            labels: ['Скрыть статью', 'Не скрывать статью'],
            action: function(main_element, current_state, callback) {
                let articleID = main_element.getAttribute('data-content-id');
                let hide = !current_state && true;
                callback(XiFilter.hideArticle(articleID, hide))
            },
            msg: {
                success: ['Статья скрыта', 'Статья снова отображается'],
                error: ['Кажется, статья уже была скрыта', 'Кажется, статья не была скрыта']
            }
        });

        etc_controls.defineControl({
            name: 'xi_hide_author',
            use: 'toggle',
            labels: ['Скрыть автора', 'Не скрывать автора'],
            action: function(main_element, current_state, callback) {
                let userID = main_element.getAttribute('data-user-id');
                let userName = main_element.parentElement.querySelector('.entry_header__subsite__author').innerText;
                let hide = !current_state && true;
                callback(XiFilter.hideArticlesFrom(userID, userName, hide));
            },
            msg: {
                success: ['Посты этого автора скрыты', 'Посты этого автора снова отображаются'],
                error: ['Кажется, вы уже блокировали посты этого автора', 'Кажется, посты этого автора уже разблокированы']
            }
        });


        // TODO Make template from article
    };

    self.refresh = function() {
    };

    self.destroy = function() {

    };

    // TODO Do this on every navigation/html update
});


AirLock.confirmInjection('module.xifilter_controls.js');