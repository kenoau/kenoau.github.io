var keno = {
    config: {
        length: 160000,
        calls: {
            length: 60000,
            delay: 3000,
            trans: 1000,
        },
        numbers: 80,
        split: 40,
        draws: 20,
        uprate: 100,
        proxies: ["https://corsproxy.io/?"],
    },
    data: {
        call: -1,
        closed: null,
        game: -1,
        interval: null,
        jurisdiction: "qld",
        num: -1,
        poll: [0, 0],
        proxy: -1,
        refresh: null,
    },
    json: null,
};

function keno_proxy(url) {
    keno.data.proxy += 1;
    if (keno.data.proxy >= keno.config.proxies.length) keno.data.proxy = 0;
    return keno.config.proxies[keno.data.proxy] + encodeURIComponent(url);
}

function keno_api() {
    return keno_proxy(
        "https://api-info-" +
            keno.data.jurisdiction +
            ".keno.com.au/v2/games/kds?jurisdiction=" +
            keno.data.jurisdiction
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

function maketime(secs) {
    var r = secs % 60;
    return Math.floor(secs / 60) + ":" + r.zeropad();
}

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

function keno_fetch() {
    keno.data.poll = [-1, 0]; // pause refreshes

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

            keno.data.poll[1] = parseInt(
                req.getResponseHeader("KDS-Next-Poll")
            );
            keno.data.poll[0] = keno.data.poll[1] + 1;
            keno.data.refresh = keno_timer(keno.data.poll[0]);
            keno.data.call = -1;

            keno.json = data;
        },
        error: function (hdrs, status, err) {
            console.log("script failure: ", uri, status, err);

            keno.data.poll = [10, -1]; // delay the timer
            keno.data.refresh = keno_timer(keno.data.poll[0]);

            keno.json = null;
        },
    });
}

/*
DOMRect {
    x: 51.91667175292969,
    y: 9.283340454101562,
    width: 825.1666259765625,
    height: 324,
    top: 9.283340454101562,
    right: 877.0832977294922,
    bottom: 333.28334045410156,
    left: 51.91667175292969
}
DOMRect {
    x: 218.5500030517578,
    y: 226.28334045410156,
    width: 80.31666564941406,
    height: 33,
    top: 226.28334045410156,
    right: 298.8666687011719,
    bottom: 259.28334045410156,
    left: 218.5500030517578
}
*/
function keno_call(call, rect, hide) {
    var c = getelem("keno-call");
    if (c.hidden == hide) return;

    c.style.left = rect.left + "px";
    c.style.right = rect.right + "px";
    c.style.width = rect.width + "px";
    c.style.bottom = rect.height + "px";

    c.hidden = hide;
    c.innerHTML = call;

    console.log("keno call: ", call, hide, rect);
}

function keno_update() {
    var cur = new Date();

    if (keno.data.poll[0] >= 0 && cur >= keno.data.refresh) keno_fetch();

    for (var i = 0; i < keno.config.numbers; i++) {
        var num = i + 1;
        getelem("keno-n-" + num).innerHTML = "&nbsp;";
    }

    if (keno.json == null || keno.json.current == null) {
        getelem("keno-draws-value").innerHTML = "&nbsp;";
        getelem("keno-heads-value").innerHTML = "&nbsp;";
        getelem("keno-tails-value").innerHTML = "&nbsp;";
        getelem("keno-bonus-value").innerHTML = "&nbsp;";
        getelem("keno-llast-value").innerHTML = "&nbsp;";
        getelem("keno-timer-value").innerHTML = "&nbsp;";
        getelem("keno-game-value").innerHTML = "&nbsp;";

        keno_call("&nbsp;", getelem("keno-body").getBoundingClientRect(), true);

        console.log("keno update: ", "no JSON data");

        return;
    }

    var since = 0,
        next = 0,
        draws = 0;

    if (keno.json.current.closed != null) {
        keno.data.closed = new Date(Date.parse(keno.json.current.closed));

        since = cur.getTime() - keno.data.closed.getTime();
        if (since < 0) since = keno.config.length;

        next = Math.floor((keno.config.length - since) / 1000);
        if (next < 0) next = 0;
    } else keno.data.closed = null;

    var finished = false;

    if (since <= keno.config.calls.length) {
        draws = Math.floor(since / keno.config.calls.delay);
    } else {
        draws = keno.config.draws;
        finished = true;
    }

    var game = keno.json.current["game-number"];
    if (keno.data.game != game) finished = true;

    getelem("keno-draws-value").innerHTML = draws;
    getelem("keno-timer-value").innerHTML = maketime(next);
    getelem("keno-game-value").innerHTML = game.zeropad(3);

    var heads = 0,
        tails = 0,
        last = -1,
        call = -1;

    if (keno.json.current.draw != null) {
        for (var i = 0; i < keno.json.current.draw.length; i++) {
            var num = keno.json.current.draw[i];

            if (i < draws) {
                getelem("keno-n-" + num).innerHTML = num;

                if (num <= keno.config.split) heads += 1;
                else tails += 1;

                if (i == draws - 1) call = num;
            }

            if (i == keno.config.draws - 1) last = num;
        }
    }

    var bonus = "&nbsp;";
    if (keno.json.current.variants != null) {
        bonus = keno.json.current.variants.bonus || "&nbsp;";
        if (bonus == "reg") bonus = "x1";
    }
    getelem("keno-heads-value").innerHTML = heads;
    getelem("keno-tails-value").innerHTML = tails;
    getelem("keno-bonus-value").innerHTML = bonus;
    getelem("keno-llast-value").innerHTML = last >= 0 ? last : "&nbsp;";

    if (finished || call < 0) {
        keno_call("&nbsp;", getelem("keno-body").getBoundingClientRect(), true);
    } else if (call != keno.data.call) {
        keno_call(call, getelem("keno-body").getBoundingClientRect(), false);
    } else {
        keno_call(
            call,
            getelem("keno-n-" + call).getBoundingClientRect(),
            false
        );
    }

    keno.data.call = call;
    keno.data.game = game;
}

function keno_init() {
    if (keno.data.interval != null) window.clearInterval(keno.data.interval);

    var url = window.location.hash,
        idx = url.indexOf("#");

    if (idx >= 0) {
        var str = url.substring(idx + 1);
        keno.data.num = parseInt(str);
    } else {
        keno.data.num = -1;
    }

    keno.data.poll = [0, 0];
    keno.data.refresh = keno_timer();
    keno.data.interval = window.setInterval(keno_update, keno.config.uprate);

    console.log(
        "keno init: ",
        keno.data.num,
        keno.data.refresh.getTime(),
        new Date().getTime()
    );
}

function keno_start() {
    if (keno.data.interval != null) window.clearInterval(keno.data.interval);

    keno.data.poll = [-1, -1];
    keno.data.proxy = getrand(keno.config.proxies.length);
    keno.json = null;
    window.setTimeout(keno_init, 1000 - new Date().getMilliseconds());
}

$(document).ready(function ($) {
    keno_start();
});
$(window).on("hashchange", function () {
    keno_start();
});
