XiFilter = window.XiFilter || {};

XiFilter.userLinkIdRegex = /(?:\/u\/)([0-9]+)-/;
XiFilter.hiddenStyleName = 'xi_hidden';
XiFilter.filters = {
    comments: {},
    articles: {},
    authors: {}
};
XiFilter.users = {};

window.addEventListener("message", function(event) {
    if (event.source == window &&
        event.data.direction &&
        event.data.direction == "from-content-script" && event.data.message.xiData) {
            let xiData = event.data.message.xiData;
        XiFilter.filters = xiData.filters || XiFilter.filters
        XiFilter.users = xiData.users || XiFilter.users;
    }
});

// Storage interaction code
XiFilter.loadFilters = function() {
    document.dispatchEvent(new CustomEvent('loadXiData'));
}

XiFilter.saveFilters = function() {
    document.dispatchEvent(new CustomEvent('saveXiData', {
        detail: {
            filters: XiFilter.filters,
            users: XiFilter.users
        }
    }))
}


// TODO Every check should save usernames. Or not.
// Check if smth is hidden
XiFilter.commentsHidden = function(userID, userName) {
    userID = Number.parseInt(userID);
    return XiFilter.filters.comments[userID];
}

// TODO Regex matching
XiFilter.articleHidden = function(articleID, title, userID, userName) {
    articleID = Number.parseInt(articleID);
    let result = XiFilter.filters.articles[articleID];
    if (!result) {
        result = XiFilter.articleAuthorHidden(userID, userName);
    }
    return result;
}

XiFilter.articleAuthorHidden = function(userID, userName) {
    userID = Number.parseInt(userID);
    return XiFilter.filters.authors[userID];
}


// Set hidden state
XiFilter.hideCommentsFrom = function(userID, userName, hide) {
    userID = Number.parseInt(userID);
    if (hide) {
        if (XiFilter.filters.comments[userID]) {
            return false;
        } else {
            // Save username (for configuration window)
            XiFilter.users[userID] = userName;
            // Hide!
            XiFilter.filters.comments[userID] = true;
        }
    } else {
        delete XiFilter.filters.comments[userID];
    }
    XiFilter.saveFilters();
    XiFilter.updateComments();
    return true;
}

XiFilter.hideArticlesFrom = function(userID, userName, hide) {
    userID = Number.parseInt(userID);
    if (hide) {
        if (XiFilter.filters.authors[userID]) {
            return true;
        } else {
            // Save username (for configuration window)
            XiFilter.users[userID] = userName;
            // Hide!
            XiFilter.filters.authors[userID] = true;
        }
    } else {
        delete XiFilter.filters.authors[userID];
    }
    XiFilter.saveFilters();
    XiFilter.filterFeed(true);
    return true;
}

// TODO Article titles should be shown in admin menu too
XiFilter.hideArticle = function(articleID, hide) {
    if (hide) {
        if (XiFilter.filters.articles[articleID]) {
            return true;
        } else {
            XiFilter.filters.articles[articleID] = true;
        }
    } else {
        delete XiFilter.filters.articles[articleID];
    }
    XiFilter.saveFilters();
    XiFilter.filterFeed(true);
    return true;
}


// Actual filtering code
XiFilter.filterFeed = function(force) {
    let feedItems = Array.from(document.querySelectorAll('.feed__item'))
    feedItems.map((item) => {
        if (item.getAttribute('xifilter_flag') === '1' && !force) {
            return;
        }

        let described = XiFilter.utils.describeArticle(item.querySelector('.entry_wrapper'));
        let id = described.id;
        let title = described.title;
        let userID = described.userID;
        let userName = described.userName;

        if (XiFilter.articleHidden(id, title, userID, userName)) {
            item.classList.add(XiFilter.hiddenStyleName);
        } else if (item.classList.contains(XiFilter.hiddenStyleName)) {
            item.classList.remove(XiFilter.hiddenStyleName);
        }
        item.setAttribute('xifilter_flag', '1')
        XiFilter.updateArticleControlsState(item);
    });
}

XiFilter.updateCommentDOM = function(node, hidden) {
    let hasStyle = node.classList.contains(XiFilter.hiddenStyleName);
    if (hidden && !hasStyle) {
        node.classList.add(XiFilter.hiddenStyleName);
    } else if (!hidden && hasStyle) {
        node.classList.remove(XiFilter.hiddenStyleName);
    }
    XiFilter.updateCommentControlsState(node);
}

XiFilter.updateAssimilatedComment = function(data) {
    let contentNode = data.dom.self;
    let authorNameNode = contentNode.querySelector('span.user_name');
    if (authorNameNode === null) { // Caught that for removed comments
        return;
    }
    let authorName = authorNameNode.innerText;
    let hidden = XiFilter.commentsHidden(data.user_id, authorName);
    XiFilter.updateCommentDOM(contentNode, hidden);
}

XiFilter.updateCommentControlsState = function(node) {
    let userId = node.getAttribute('data-user-id');
    let name = node.parentElement.querySelector('.comments__item__user__name').innerText;
    node.setAttribute('data-xi_hide_user-state', XiFilter.commentsHidden(userId, name) ? 1 : 0);
}

XiFilter.updateArticleControlsState = function(node) {
    let described = XiFilter.utils.describeArticle(node);
    let articleHidden = XiFilter.articleHidden(described.id, described.title);
    let articleAuthorHidden = XiFilter.articleAuthorHidden(described.userID, described.userName);

    let controlNode = node.querySelector('.etc_control');

    controlNode.setAttribute('data-xi_hide_article-state', articleHidden ? 1 : 0);
    controlNode.setAttribute('data-xi_hide_author-state', articleAuthorHidden ? 1 : 0);
}

XiFilter.injectPermissions = function() {
    let comments = Array.from(document.querySelectorAll('.etc_control[data-comment-id]'));
    comments.map((node) => {
        if (node.getAttribute('xi_permissions_injected') === '1') {
            return;
        }
        // Update permissions
        let perms = node.getAttribute('data-permissions');
        let newPerms = perms + (perms ? '&' : '') + 'xi_hide_comments=1';
        node.setAttribute('data-permissions', newPerms);
        node.setAttribute('xi_permissions_injected', '1');

        // Set state for blocked flag
        XiFilter.updateCommentControlsState(node);
    });

    let articles = Array.from(document.querySelectorAll('.etc_control[data-parent-selector=".feed__item"]'));
    articles.map((node) => {
        if (node.getAttribute('xi_permissions_injected') === '1') {
            return;
        }
        let entry = node.parentElement.parentElement;

        // Update permissions
        let perms = node.getAttribute('data-permissions');
        let newPerms = perms + (perms ? '&' : '') + 'xi_hide_article=1&xi_hide_author=1';
        node.setAttribute('data-permissions', newPerms);
        node.setAttribute('xi_permissions_injected', '1');

        // Set block states
        XiFilter.updateArticleControlsState(entry);
    });
}

// TODO Separate utils
XiFilter.utils = {}
// Extracts data from article dom node
XiFilter.utils.describeArticle = function(entryDom) {
    let controlNode = entryDom.querySelector('.etc_control');
    let id = controlNode.getAttribute('data-content-id');

    let title = entryDom.querySelector('.b-article > h2');
    if (!title) {
        title = entryDom.querySelector('.entry_header > h1');
    };
    title = title.innerText;

    let userLink = entryDom.querySelector('.entry_header__subsite__author');
    let userName = userLink.innerText;
    let userID = XiFilter.userLinkIdRegex.exec(userLink.href)[1];
    return {
        id, title, userName, userID
    };
}

XiFilter.loadFilters();
// Inject everything else
AirLock.inject('xifilter/xifilter.css', true);
window.AirLock.inject('xifilter/modules/module.xifilter_feed.js');
window.AirLock.inject('xifilter/modules/module.xifilter_comments.js');
window.AirLock.inject('xifilter/modules/module.xifilter_controls.js');

AirLock.confirmInjection('xifilter.js');