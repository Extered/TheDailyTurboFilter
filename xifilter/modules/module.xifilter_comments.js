XiFilter = window.XiFilter || {};

AirLock.interceptDefinition('class.CommentsTree', function() {
    let unpackedArguments = Array.from(arguments);
    let name = unpackedArguments.shift();
    let dependencies = unpackedArguments.shift();
    let definition = unpackedArguments.shift();

    let newDefinition = function() {
        let actualCtor = definition(...arguments); // Actual constructor
        actualCtor.prototype._assimilateItem = actualCtor.prototype.assimilateItem;
        actualCtor.prototype.assimilateItem = function() {
            let assimilated = this._assimilateItem(...arguments);
            if (window.XiFilter) {
                XiFilter.updateAssimilatedComment(assimilated);
            }
            return assimilated;
        }

        return function() {
            let obj = new actualCtor(...arguments);
            XiFilter.updateComments = obj.render.bind(obj);
            return obj;
        };
    }
    return [name, dependencies, newDefinition];
});

AirLock.confirmInjection('module.xifilter_comments.js');