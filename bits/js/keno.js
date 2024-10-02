var issue_num = 0;
var keno_data = [];
var keno_data_page = 1;
var keno_current = null;
var keno_comments = [];
var keno_comments_page = 1;
var keno_location = sitedata.locs.api + '/repos/' + sitedata.organisation + '/' + pagedata.keno.repository + '/keno?state=' + pagedata.keno.sort.state + '&sort=' + pagedata.keno.sort.by + '&direction=' + pagedata.keno.sort.direction + '&callback=keno';
var keno_labels_location = sitedata.locs.ref + '/' + sitedata.organisation + '/' + pagedata.keno.repository + '/labels/';

// Helpers
Number.prototype.zeropad= function(len) {
    var s = String(this), c = '0';
    len = len || 2;
    while(s.length < len) s = c + s;
    return s;
}

Element.prototype.remove = function() {
    this.parentElement.removeChild(this);
}

NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
    for(var i = this.length - 1; i >= 0; i--) {
        if(this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}

Element.prototype.makechild = function(elemname, idname, classname) {
    var child = document.createElement(elemname);
    child.id = idname;
    child.className = classname;
    this.appendChild(child);
    return child;
}

Array.prototype.extend = function (data) {
    data.forEach(function(v) {
        this.push(v)
    }, this);    
}

function makecookie(name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    document.cookie = name + '=' + escape(value) + '; expires=' + exdate.toUTCString() + '; path=/';
}

function getcookie(name) {
    var cname = name + '=';
    var decoded = decodeURIComponent(document.cookie);
    var ca = decoded.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(cname) == 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return '';
}

function getelem(name) {
    return document.getElementById(name);
}

function mkelem(name) {
    return document.createElement(name);
}

// Showdown
var md_convert = new showdown.Converter({
    omitExtraWLInCodeBlocks: true,
    noHeaderId: true,
    strikethrough: true,
    tables: true,
    ghCodeBlocks: true,
    tasklists: true,
    smoothLivePreview: true,
    simpleLineBreaks: true,
    ghMentions: true,
    openLinksInNewWindow: true,
    emoji: true
});
md_convert.setFlavor('github');

function markdown(data) {
    var str = md_convert.makeHtml(data);
    return str.replace(/<br>|<br\/>|<br \/>/gi, '</p><p>');
}

// OAuth
var user_data = null;
var user_login = null;
var user_cookie = '0';
var user_nologin = false;
//OAuth.initialize('p7dOPzuUbL6qWAyxu73egl5DJYA');
//OAuth.setOAuthdURL('https://hq.kenoau.redeclipse.net:6284');

function user_oauth(setup, src) {
    //user_nologin = true;
    //OAuth.redirect('github', { cache: true }, sitedata.url + pagedata.permalink + "#");
}

function user_failed(err) {
    console.log('login error: ', err);
    makecookie('login', '0', 0);
    user_cookie = '0';
    keno_script(keno_location, 'keno-script', keno_data_page);
}

function user_callback(err, result) {
    user_nologin = true;
    if(err) {
        user_failed(err);
    } else {
        console.log('login result: ', result);
        user_data = result;
        user_data.get('/user')
        .done(function (response) {
            console.log('login user: ', response);
            user_login = response;
            var top = getelem('keno-login');
            if(top) {
                top.innerHTML = user_login.login + ' <img src="' + user_login.avatar_url + '" />';
                top.href = user_login.html_url;
                top.title = 'Logged in as: ' + user_login.name;
                top.onclick = '';
            }
            makecookie('login', '1', 7300);
            user_cookie = '1';
            keno_script(keno_location, 'keno-script', keno_data_page);
        })
        .fail(function (err) {
            user_failed(err);
        });
    }
}
//OAuth.callback('github', { cache: true }, user_callback);

// keno API
var keno_reactions = [ "+1", "-1", "laugh", "hooray", "confused", "heart" ];
var keno_reactmd = [ ":+1:", ":-1:", ":laughing:", ":raised_hands:", ":confused:", ":heart:" ];

function keno_setup()
{
    user_cookie = getcookie('login');
    var url = window.location.hash, idx = url.indexOf('#');
    if(idx >= 0) {
        var str = url.substring(idx + 1);
        //if(str == 'oauthio=cache:github' || str == '&oauthio=cache:github') {
        //    user_nologin = true;
        //    issue_num = 0;
        //    window.location.hash = '';
        //}
        //else {
            var old = issue_num;
            issue_num = parseInt(str);
            if(issue_num != old) {
                keno_comments = [];
                keno_comments_page = 1;
            }
        //}
    }
    else {
        issue_num = 0;
    }
}

function keno_date(data) {
    var d = new Date(data);
    return d.getFullYear() + '-' + d.getMonth().zeropad() + '-' + d.getDate().zeropad() + ' ' + d.getHours() + ':' + d.getMinutes().zeropad() + ':' + d.getSeconds().zeropad();
}

function keno_create(item, iter) {
    var row = mkelem('tr');
    row.id = 'keno-t-row';
    row.className = 'keno-' + (iter%2 ? 'bg1' : 'bg2');
    row.innerHTML += '<td id="keno-t-number" class="keno-center"><a id="keno-t-numurl" href="' + item.html_url + '#show_issue" target="_blank">#' + item.number + '</a></td>';
    var title = mkelem('td');
    title.id = 'keno-t-title';
    title.className = 'keno-left';
    title.innerHTML += '<a id="keno-t-url" class="keno-left" href="#' + item.number + '">' + item.title + '</a>';
    if(item.labels.length > 0) {
        title.innerHTML += '<div id="keno-t-labels" class="keno-labels">';
        for(var j = 0; j < item.labels.length; j++) {
            var label = item.labels[j];
            title.innerHTML += ' <a id="keno-t-label" class="keno-label" style="border-color: #' + label.color + ';" href="' + keno_labels_location + encodeURIComponent(label.name) + '" target="_blank">' + label.name + '</a>';
        }
        title.innerHTML += '</div>';
    }
    row.appendChild(title);
    row.innerHTML += '<td id="keno-t-comments" class="keno-center">' + item.comments + '</td>';
    row.innerHTML += '<td id="keno-t-reactions" class="keno-center hide-small">' + item.reactions.total_count + '</td>';
    row.innerHTML += '<td id="keno-t-author" class="keno-center"><a id="keno-t-author-link" class="keno-center" href="' + item.user.html_url + '" target="_blank">' + item.user.login + '</a></td>';
    row.innerHTML += '<td id="keno-t-created" class="keno-time keno-center hide-small"><time class="timeago" datetime="' + item.created_at + '">' + keno_date(item.created_at) + '</time></td>';
    row.innerHTML += '<td id="keno-t-updated" class="keno-time keno-center"><time class="timeago" datetime="' + item.updated_at + '">' + keno_date(item.updated_at) + '</time></td>';
    return row;
}

function keno_view(item, hbody, hrow) {
    var head = hrow.makechild('th', 'keno-h-comments-info', 'keno-left'),
        span = head.makechild('span', 'keno-h-comments-span', 'keno-left'),
        avat = head.makechild('span', 'keno-h-comments-avatar', 'keno-right');
    span.innerHTML = ' <a href="' + item.html_url + '#show_issue" class="keno-left" target="_blank">#' + item.number + ': ' + item.title + '</a>';
    span.innerHTML += ' created <time class="timeago" datetime="' + item.created_at + '">' + keno_date(item.created_at) + '</time>';
    avat.innerHTML += '<a href="' + item.user.html_url + '" title="' + item.user.login + '" class="keno-left" target="_blank">' + item.user.login + ' <img src="' + item.user.avatar_url + '" class="keno-left" /></a>';
    var xrow = hbody.makechild('tr', 'keno-h-comments-xtra', ''),
        xtra = xrow.makechild('th', 'keno-h-comments-xtra-row', 'keno-left'),
        labels = xtra.makechild('span', 'keno-h-comments-xtra-labels', 'keno-left'),
        reactions = xtra.makechild('span', 'keno-h-comments-xtra-reactions', 'keno-right');
    for(var j = 0; j < item.labels.length; j++) {
        var label = item.labels[j];
        labels.innerHTML += ' <a id="keno-t-label" class="keno-top keno-label" style="border-color: #' + label.color + ';" href="' + keno_labels_location + encodeURIComponent(label.name) + '" target="_blank">' + label.name + '</a>';
    }
    if(item.reactions.total_count > 0) {
        for(var j = 0; j < keno_reactions.length; j++) {
            var react = keno_reactions[j], num = item.reactions[react];
            if(num > 0) {
                reactions.innerHTML += ' ' + markdown(keno_reactmd[j]) + ' ' + num;
            }
        }
    }
    var irow = hbody.makechild('tr', 'keno-t-comments-row', 'keno-left'),
        info = irow.makechild('td', 'keno-t-comments-info', 'keno-left'),
        cont = info.makechild('span', 'keno-t-comments-span', 'keno-left');
    cont.innerHTML = markdown(item.body);
    var vrow = hbody.makechild('tr', 'keno-t-load', 'keno-left'),
        load = vrow.makechild('td', 'keno-t-loading', 'keno-left');
    load.innerHTML = '<span class="fas fa-cog fa-spin"></span> Loading...';
    keno_script(item.comments_url + '?callback=issuecomments', 'keno-script-comment', keno_comments_page);
}

function keno_build() {
    var loading = getelem('keno-h-load');
    if(loading != null) loading.remove();
    if(keno_data == null || keno_data.length <= 0) return;
    var table = getelem('keno-table'),
        head = getelem('keno-header'),
        hbody = getelem('keno-body'),
        hrow = getelem('keno-h-row');
    if(table == null) {
        table = getelem('keno-view');
    }
    if(hrow == null) {
        hrow = mkelem('tr');
        hrow.id = 'keno-h-row';
        hrow.class = 'keno-left';
        head.appendChild(hrow);
    }
    if(issue_num > 0) {
        table.id = 'keno-view';
        hrow.innerHTML = '';
        hbody.innerHTML = '';
        for(var i = 0; i < keno_data.length; i++) {
            if(keno_data[i].number == issue_num) {
                keno_current = keno_data[i];
                keno_view(keno_data[i], hbody, hrow);
                break;
            }
        }
    }
    else {
        table.id = 'keno-table';
        hrow.innerHTML = '<th id="keno-h-number" class="keno-center">ID</th>';
        hrow.innerHTML += '<th id="keno-h-title" class="keno-left">Title</th>';
        hrow.innerHTML += '<th id="keno-h-comments" class="keno-center"><span class="far fa-comment fa-fw" aria-hidden="true"></span></th>';
        hrow.innerHTML += '<th id="keno-h-reactions" class="keno-center hide-small"><span class="far fa-meh fa-fw" aria-hidden="true"></span></th>';
        hrow.innerHTML += '<th id="keno-h-author" class="keno-center">Author</th>';
        hrow.innerHTML += '<th id="keno-h-created" class="keno-center hide-small">Created</th>';
        hrow.innerHTML += '<th id="keno-h-updated" class="keno-center">Updated</th>';
        hbody.innerHTML = "";
        for(var i = 0; i < keno_data.length; i++) {
            keno_current = keno_data[i];
            var row = keno_create(keno_data[i], i);
            hbody.appendChild(row);
        }
        if(keno_data_page > 0) {
            var more = getelem('keno-h-more');
            if(more) {
                var count = keno_data_page*pagedata.keno.perpage;
                if(keno_data.length >= count) {
                    more.style.display = 'table-row';
                }
                else {
                    more.style.display = 'none';
                }
            }
        }
        var view = getelem('keno-morebody');
        if(view) view.innerHTML = '';
    }
    jQuery("time.timeago").timeago();
}

function keno_view_comment(item, comment, hbody) {
    var hrow = hbody.makechild('tr', 'keno-h-comments-row', 'keno-left'),
        head = hrow.makechild('th', 'keno-h-comments-info', 'keno-left'),
        span = head.makechild('span', 'keno-h-comments-span', 'keno-left'),
        avat = head.makechild('span', 'keno-h-comments-avatar', 'keno-right');
    span.innerHTML = ' comment <a href="' + item.html_url + '" class="keno-left" target="_blank">#' + comment + '</a>';
    span.innerHTML += ' updated <time class="timeago" datetime="' + item.updated_at + '">' + keno_date(item.updated_at) + '</time>';
    if(item.reactions.total_count > 0) {
        for(var j = 0; j < keno_reactions.length; j++) {
            var react = keno_reactions[j], num = item.reactions[react];
            if(num > 0) {
                span.innerHTML += ' ' + markdown(keno_reactmd[j]) + ' ' + num;
            }
        }
    }
    avat.innerHTML += '<a href="' + item.user.html_url + '" title="' + item.user.login + '" class="keno-left" target="_blank">' + item.user.login + ' <img src="' + item.user.avatar_url + '" class="keno-left" /></a>';
    var irow = hbody.makechild('tr', 'keno-t-comments-row', 'keno-left'),
        info = irow.makechild('td', 'keno-t-comments-info', 'keno-left'),
        cont = info.makechild('span', 'keno-t-comments-span', 'keno-left');
    cont.innerHTML = markdown(item.body);
}

function keno_build_comments() {
    var loading = getelem('keno-t-load');
    if(loading != null) loading.remove();
    if(issue_num <= 0 || keno_current == null) return;
    if(keno_comments != null && keno_comments.length > 0) {
        var hbody = getelem('keno-body');
        for(var i = Math.max(keno_comments_page-1, 0)*pagedata.keno.perpage; i < keno_comments.length; i++) {
            keno_view_comment(keno_comments[i], i+1, hbody);
        }
        if(keno_comments_page > 0) {
            var more = getelem('keno-h-more');
            if(more) {
                var count = keno_comments_page*pagedata.keno.perpage;
                if(keno_comments.length >= count) {
                    more.style.display = 'table-row';
                }
                else {
                    more.style.display = 'none';
                }
            }
        }
    }
    else {
        var more = getelem('keno-h-more');
        if(more) more.style.display = 'none';
    }
    var view = getelem('keno-morebody');
    if(view) {
        view.innerHTML = '';
        var hrow = view.makechild('tr', 'keno-t-reply-row', 'keno-left'),
            head = hrow.makechild('td', 'keno-t-reply-info', 'keno-center'),
            span = head.makechild('span', 'keno-t-reply-span', 'keno-left');
        span.innerHTML = '<a href="' + keno_current.html_url + '#show_issue" class="keno-left" target="_blank">View on GitHub</a>'
        span.innerHTML += ' | <a href="' + keno_current.html_url + '#issue-comment-box" class="keno-left" target="_blank">Reply on GitHub</a>';
    }
    jQuery("time.timeago").timeago();
}

function keno_script(src, idname, pagenum)
{
    var head = {}, uri = src + '&per_page=' + pagedata.keno.perpage + '&page=' + pagenum;
    if(user_login != null) {
        head = {
            "Authorization": "token "  + user_data.access_token
        }
    }
    console.log('script get: ', idname, uri, head);
    $.ajax({
        method: "GET",
        url: uri,
        headers: head,
        accepts: {
            "*": "application/vnd.github.squirrel-girl-preview+json; charset=utf-8"
        },
        success: function(data) {
            var script = getelem(idname);
            if(script != null) script.remove();
            script = mkelem('script');
            script.id = idname;
            script.innerHTML = data;
            document.getElementsByTagName('head')[0].appendChild(script);
        },
        error: function() {
            console.log('script failure: ', idname, uri);
        }
    });
}

function keno_more() {
    if(issue_num > 0) {
        var count = keno_comments_page*pagedata.keno.perpage;
        if(keno_comments.length >= count) {
            for(var i = 0; i < keno_data.length; i++) {
                if(keno_data[i].number == issue_num) {
                    keno_comments_page++;
                    keno_script(keno_data[i].comments_url + '?callback=issuecomments', 'keno-script-comment', keno_comments_page);
                    break;
                }
            }
        }
    }
    else {
        var count = keno_data_page*pagedata.keno.perpage;
        if(keno_data.length >= count) {
            keno_data_page++;
            keno_script(keno_location, 'keno-script', keno_data_page);
        }
    }
}

function keno_remain(remain, rate) {
    if(remain != null && rate != null) {
        var more = getelem('keno-rate');
        if(more) {
            more.innerHTML = 'Rate limit: ' + remain + '/' + rate;
            //more.title = user_login != null ? 'You have the full authenticated rate limit.' : 'Login with GitHub to increase your rate limit.';
        }
    }
}

function issuecomments(response) {
    console.log('issue comments meta: ', response.meta);
    console.log('issue comments data: ', response.data);
    keno_remain(response.meta['X-RateLimit-Remaining'], response.meta['X-RateLimit-Limit']);

    keno_comments.extend(response.data);
    keno_build_comments();
}

function keno(response) {
    console.log('keno meta: ', response.meta);
    console.log('keno data: ', response.data);
    keno_remain(response.meta['X-RateLimit-Remaining'], response.meta['X-RateLimit-Limit']);
    keno_data.extend(response.data);
    keno_build();
}

$(document).ready(function ($) {
    keno_setup();
    if(user_nologin == false) {
        console.log('cookie: ', user_cookie);
        //if(user_cookie == '1') {
        //    user_oauth(true);
        //}
        //else {
            keno_script(keno_location, 'keno-script', keno_data_page);
        //}
    }
});

$(window).on('hashchange', function() {
    keno_setup();
    keno_build();
});
