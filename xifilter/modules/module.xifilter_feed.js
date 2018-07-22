XiFilter = XiFilter || {};

// TODO Optimize invocations -- maybe hook to something related to feeds?
// Maybe module.ajaxify...
AirLock.define('module.xifilter_feed', 'module.feed', function(feed) {
    var self = this;
    self.init = function() {
        XiFilter.filterFeed();
    };

    self.refresh = function() {
        XiFilter.filterFeed();
    };

    self.destroy = function() {
    };
});


AirLock.confirmInjection('module.xifilter_feed.js');