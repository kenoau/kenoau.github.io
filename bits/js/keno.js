var keno_num = -1;
var keno_time = new Date();
var keno_jurisdiction = 'qld';
var keno_data = {};

function keno_proxy(url) {
    return 'https://corsproxy.io/?' + encodeURIComponent(url); 
}

function keno_api() {
    return keno_proxy("https://api-info-" + keno_jurisdiction + ".keno.com.au/v2/games/kds?jurisdiction=" + keno_jurisdiction);
}

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

function keno_setup()
{
    var url = window.location.hash, idx = url.indexOf('#');
    if(idx >= 0) {
        var str = url.substring(idx + 1);
        keno_num = parseInt(str);
    }
    else {
        keno_num = -1;
    }
}

function keno_date(data) {
    var d = new Date(data);
    return d.getFullYear() + '-' + d.getMonth().zeropad() + '-' + d.getDate().zeropad() + ' ' + d.getHours() + ':' + d.getMinutes().zeropad() + ':' + d.getSeconds().zeropad();
}

function keno_build() {
    if(keno_data == null) {
        console.log('keno data not found');
        return;
    }

    var keno_elem = getelem('keno-body');
    if(keno_elem == null) {
        console.log('keno element not found');
    }

    keno_elem.innerHTML = '';

    for(var i = 0; i < 8; i++) {
        keno_elem.innerHTML += '<tr id="keno-r-' + i + '" class="keno-center">';
        for(var j = 1; j < 11; j++) {
            var keno_number  = i * 10 + j;
            keno_elem.innerHTML += '<td id="keno-n-' + keno_number + '" class="keno-center">&nbsp;</td>';
        }
        keno_elem.innerHTML += '</tr>';
    }

    var keno_draw = keno_data.current.draw[0];
    for(var i = 0; i < keno_draw.length; i++) {
        var keno_cur = getelem('keno-n-' + keno_draw[i]);
        if(keno_cur != null) {
            keno_cur.innerHTML = '<b>' + keno_draw[i] + '</b>';
        }
    }
}

function keno_script(uri)
{
    var head = {};
    console.log('script get: ', uri, head);
    $.ajax({
        method: "GET",
        url: uri,
        headers: head,
        accepts: {
            "*": "application/vnd.tabcorp.keno.kds+json; charset=utf-8; encoding=json"
        },
        success: function(data) {
            keno_data = data;
            keno_build();
            console.log('script success: ', uri, data);
        },
        error: function() {
            console.log('script failure: ', uri);
        }
    });
}

$(document).ready(function ($) {
    keno_setup();
    keno_script(keno_api());
});

$(window).on('hashchange', function() {
    keno_setup();
    keno_build();
});
