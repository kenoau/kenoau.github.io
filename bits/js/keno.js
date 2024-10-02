var keno = {
    jurisdiction: "qld",
    poll: 0,
    refresh: null,
    interval: null,
    num: -1,
    proxy: -1,
    proxies: [
        "https://corsproxy.io/?",
        "https://api.allorigins.win/get?url=",
        "https://api.codetabs.com/v1/proxy/?quest=",
    ],
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

function keno_timer(secs = null, cur = null) {
    var d = cur != null ? cur : new Date();

    d.setMilliseconds(0); // stay aligned to milliseconds
    if (secs != null) d.setSeconds(d.getSeconds() + secs);

    console.log("keno timer: ", secs, d.getTime());

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

    if (data != null) {
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
            keno.poll = req.getResponseHeader("KDS-Next-Poll");
            if (keno.poll == null) keno.poll = 10;
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
    var cur = keno_timer();

    if (keno.poll >= 0 && cur >= keno.refresh) keno_fetch();

    var next = (keno.refresh.getTime() - cur.getTime()) / 1000,
        time = getelem("keno-t-timer"),
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
    var d = new Date();
    keno.poll = -1;
    if (keno.interval != null) window.clearInterval(keno.interval);
    window.setTimeout(keno_init, 1000 + (1000 - d.getMilliseconds()));
}

$(document).ready(function ($) {
    keno_start();
});
$(window).on("hashchange", function () {
    keno_start();
});
