var keno = {
    config: {
        length: 160000,
        calls: {
            length: 50000,
            delay: 2500,
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
        sound: null,
        sndbf: [],
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

    console.log("fetch: ", uri, head);

    $.ajax({
        method: "GET",
        url: uri,
        headers: head,
        cache: false,
        accepts: {
            "*": "application/vnd.tabcorp.keno.kds+json; charset=utf-8; encoding=json",
        },
        success: function (data, status, req) {
            console.log("success: ", uri, status, data);

            keno.data.poll[1] = parseInt(
                req.getResponseHeader("KDS-Next-Poll")
            );
            keno.data.poll[0] = keno.data.poll[1] >= 1 ? keno.data.poll[1] : 1;
            keno.data.refresh = keno_timer(keno.data.poll[0]);
            keno.json = data;
        },
        error: function (hdrs, status, err) {
            console.log("failure: ", uri, status, err);

            keno.data.poll = [10, -1]; // delay the timer
            keno.data.refresh = keno_timer(keno.data.poll[0]);
        },
    });
}

function keno_call(call, rect, hide) {
    var c = getelem("keno-call");

    c.style.transition = hide ? "none" : "all 1s";
    c.style.backgroundColor = hide ? "transparent" : "rgb(0, 0, 0)";
    c.style.color = hide ? "transparent" : "rgb(255, 255, 255)";
    c.style.border = hide ? "none" : "2px solid rgb(255, 255, 255)";

    c.style.left = rect.left + "px";
    c.style.top = rect.top + "px";
    c.style.width = rect.width - 4 + "px";
    c.style.height = rect.height - 4 + "px";

    c.innerHTML = call;
}

function keno_sound(snd, nobuf) {
    if (nobuf != true && keno.data.sound != null) {
        keno.data.sndbf.push(snd);
        return;
    }

    keno.data.sound = null;

    if (typeof snd == "string") {
        keno.data.sound = new Howl({
            src: ["/bits/mp3/" + snd + ".mp3"],
            onend: keno_sndbuf,
        });
    } else if (snd > 20) {
        var mod = snd % 10,
            par = snd - mod;
        keno.data.sound = new Howl({
            src: ["/bits/mp3/" + par.zeropad(3) + ".mp3"],
            onend: keno_sndbuf,
        });
        if (mod > 0) keno.data.sndbf.push(mod);
    } else {
        keno.data.sound = new Howl({
            src: ["/bits/mp3/" + snd.zeropad(3) + ".mp3"],
            onend: keno_sndbuf,
        });
    }

    if (keno.data.sound != null) keno.data.sound.play();
}

function keno_sndbuf() {
    if (keno.data.sndbf.length > 0) {
        var snd = keno.data.sndbf.shift();
        keno_sound(snd, true);
    }
}

function keno_update() {
    var cur = new Date(),
        since = 0,
        next = 0;

    if (
        keno.json != null &&
        keno.json.current != -null &&
        keno.json.current.closed != null
    ) {
        keno.data.closed = new Date(Date.parse(keno.json.current.closed));

        since = cur.getTime() - keno.data.closed.getTime();
        if (since < 0) since = keno.config.length;

        next = Math.floor((keno.config.length - since) / 1000);
        if (next < 0) next = 0;
    } else keno.data.closed = null;

    if (
        keno.data.poll[0] >= 0 &&
        cur >= keno.data.refresh &&
        (next == 0 || keno.json.draws == null || keno.json.draws.length == 0)
    )
        keno_fetch();

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

    var draws = 0,
        finished = false;

    if (since <= keno.config.calls.length + keno.config.calls.delay) {
        draws =
            since >= keno.config.calls.delay
                ? Math.floor(since / keno.config.calls.delay)
                : 0;
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
                if (finished || i < draws - 1) {
                    getelem("keno-n-" + num).innerHTML = num;
                    if (i == keno.config.draws - 1) last = num;
                }

                if (num <= keno.config.split) heads += 1;
                else tails += 1;

                if (i == draws - 1) call = num;
            }
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

    if (finished || call < 0 || call != keno.data.call)
        keno_call(
            "&nbsp;",
            getelem("keno-t-draws").getBoundingClientRect(),
            true
        );

    if (finished != true && call >= 0 && call != keno.data.call) {
        keno_call(
            call,
            getelem("keno-n-" + call).getBoundingClientRect(),
            false
        );
        keno_sound(call);
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
