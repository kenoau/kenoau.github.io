var keno = {
    jurisdiction: "qld",
    poll: 0,
    refresh: null,
    interval: null,
    num: -1,
    proxy: -1,
    proxies: ["https://corsproxy.io/?"],
};

function keno_proxy(url) {
    keno.proxy += 1;
    if (keno.proxy >= keno.proxies.length) keno.proxy = 0;
    return keno.proxies[keno.proxy] + encodeURIComponent(url);
}

function keno_api() {
    return keno_proxy(
        "https://api-info-" +
            keno.jurisdiction +
            ".keno.com.au/v2/games/kds?jurisdiction=" +
            keno.jurisdiction
    );
}

// Helpers
Number.prototype.zeropad = function (len) {
    var s = String(this),
        c = "0";
    len = len || 2;
    while (s.length < len) s = c + s;
    return s;
};

Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
};

NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
};

Element.prototype.makechild = function (elemname, idname, classname) {
    var child = document.createElement(elemname);
    child.id = idname;
    child.className = classname;
    this.appendChild(child);
    return child;
};

Array.prototype.extend = function (data) {
    data.forEach(function (v) {
        this.push(v);
    }, this);
};

function makecookie(name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    document.cookie =
        name +
        "=" +
        escape(value) +
        "; expires=" +
        exdate.toUTCString() +
        "; path=/";
}

function getcookie(name) {
    var cname = name + "=";
    var decoded = decodeURIComponent(document.cookie);
    var ca = decoded.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(cname) == 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}

function getelem(name) {
    return document.getElementById(name);
}

function mkelem(name) {
    return document.createElement(name);
}

function getrand(max) {
    return Math.floor(Math.random() * max);
}

function keno_timer(secs = 0) {
    var d = new Date(),
        q = d,
        r = d.getTime();

    r -= r % 1000;
    r += secs * 1000;

    d = new Date(r);

    console.log("keno timer: ", secs, d.getTime(), q.getTime());

    return d;
}

function keno_date(data) {
    var d = new Date(data);
    return (
        d.getFullYear() +
        "-" +
        d.getMonth().zeropad() +
        "-" +
        d.getDate().zeropad() +
        " " +
        d.getHours() +
        ":" +
        d.getMinutes().zeropad() +
        ":" +
        d.getSeconds().zeropad()
    );
}

function keno_build(data) {
    for (var i = 1; i <= 80; i++) {
        var elem = getelem("keno-n-" + i);
        if (elem != null) elem.innerHTML = "&nbsp;";
    }

    if (data != null && data.current != null) {
        var draw = data.current.draw;

        if (draw != null) {
            for (var i = 0; i < draw.length; i++) {
                var cur = getelem("keno-n-" + draw[i]);
                if (cur != null) cur.innerHTML = "<b>" + draw[i] + "</b>";
            }
        }
    }
}

function keno_fetch() {
    keno.poll = -1; // pause refreshes

    var head = {},
        uri = keno_api();

    console.log("script get: ", uri, head);

    $.ajax({
        method: "GET",
        url: uri,
        headers: head,
        cache: false,
        accepts: {
            "*": "application/vnd.tabcorp.keno.kds+json; charset=utf-8; encoding=json",
        },
        success: function (data, status, req) {
            console.log("script success: ", uri, status, data);
            
            var next = req.getResponseHeader("KDS-Next-Poll");
            if (next == null) keno.poll = 10;
            else keno.poll = parseInt(keno.poll) + 1;
            
            keno.refresh = keno_timer(keno.poll);
            
            keno_build(data);
        },
        error: function (hdrs, status, err) {
            console.log("script failure: ", uri, status, err);
            
            keno.poll = 10; // delay the timer
            keno.refresh = keno_timer(keno.poll);
        },
    });
}

function keno_update() {
    var cur = new Date();

    if (keno.poll >= 0 && cur >= keno.refresh) keno_fetch();

    var next = Math.floor((keno.refresh.getTime() - cur.getTime()) / 1000);

    if (next < 0) next = 0;

    var time = getelem("keno-t-timer"),
        game = getelem("keno-t-ngame");

    time.innerHTML = next;
    game.innerHTML = keno.poll;

    console.log(
        "keno update: ",
        keno.refresh.getTime(),
        cur.getTime(),
        next,
        keno.poll
    );
}

function keno_init() {
    if (keno.interval != null) window.clearInterval(keno.interval);

    var url = window.location.hash,
        idx = url.indexOf("#");

    if (idx >= 0) {
        var str = url.substring(idx + 1);
        keno.num = parseInt(str);
    } else {
        keno.num = -1;
    }

    keno.poll = 0;
    keno.refresh = keno_timer();
    keno.interval = window.setInterval(keno_update, 1000);

    console.log(
        "keno init: ",
        keno.num,
        keno.refresh.getTime(),
        new Date().getTime()
    );
}

function keno_start() {
    if (keno.interval != null) window.clearInterval(keno.interval);

    keno.poll = -1;
    keno.proxy = getrand(keno.proxies.length);
    window.setTimeout(keno_init, 1000 + (1000 - new Date().getMilliseconds()));
}

$(document).ready(function ($) {
    keno_start();
});
$(window).on("hashchange", function () {
    keno_start();
});
