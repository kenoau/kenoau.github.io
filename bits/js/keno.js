var keno = {
    config: {
        length: 160000,
        calls: {
            length: 60000,
            delay: 3000,
        },
        numbers: 80,
        split: 40,
        draws: 20,
        uprate: 100,
        proxies: ["https://corsproxy.io/?"],
        jurisdictions: ["qld", "nsw", "act", "vic", "tas", "sa", "nt", "wa"],
    },
    data: {
        last: {
            call: -1,
            game: -1,
            state: -1,
            bonus: null,
        },
        closed: null,
        interval: null,
        jurisdiction: null,
        poll: [0, 0],
        proxy: -1,
        refresh: null,
        sound: null,
        sndbf: [],
        allow: false,
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

function keno_fetch(next = 0) {
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
            keno.data.poll[1] = parseInt(
                req.getResponseHeader("KDS-Next-Poll")
            );
            keno.data.poll[0] = Math.max(
                3,
                Math.max(next, keno.data.poll[1] || 10)
            );
            if (next > 0 && keno.data.poll[0] < next) keno.data.poll[0] = next;

            keno.data.refresh = keno_timer(keno.data.poll[0]);
            keno.json = data;

            console.log("success: ", keno.data.poll[0], uri, status, data);
        },
        error: function (hdrs, status, err) {
            keno.data.poll = [10, -1]; // delay the timer
            keno.data.refresh = keno_timer(keno.data.poll[0]);
            console.log("failure: ", keno.data.poll[0], uri, status, err);
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

function keno_stopsnd() {
    if (keno.data.sound != null) {
        keno.data.sound.stop();
        keno.data.sound = null;
    }
}

function keno_sound(snd, nobuf) {
    if (keno.data.allow != true) return;

    if (nobuf != true && keno.data.sound != null) {
        keno.data.sndbf.push(snd);
        return;
    }

    console.log("play: ", snd);

    keno_stopsnd();

    keno.data.sound = new Howl({
        src: ["/bits/mp3/" + snd + ".mp3"],
        onend: keno_sndbuf,
        onplayerror: keno_sndbuf,
    });

    if (keno.data.sound != null) keno.data.sound.play();
}

function keno_sndbuf() {
    keno_stopsnd();

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
        keno.json.current != null &&
        keno.json.current.closed != null
    ) {
        keno.data.closed = new Date(Date.parse(keno.json.current.closed));

        since = cur.getTime() - keno.data.closed.getTime();
        if (since < 0) since = keno.config.length;

        next = Math.floor((keno.config.length - since) / 1000);
        if (next < 0) next = 0;
    } else keno.data.closed = null;

    if (keno.data.poll[0] >= 0 && cur >= keno.data.refresh)
        keno_fetch(
            keno.data.closed != null &&
                keno.json.current != null &&
                keno.json.current.variants != null &&
                keno.json.current.variants.draw != null
                ? next
                : 1
        );

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
        keno.data.last.bonus = null;
        keno.data.last.state = -1;
        keno.data.last.call = -1;

        return;
    }

    var draws = 0,
        finished = false;

    var delay = keno.config.calls.length + keno.config.calls.delay * 2;

    if (since <= delay) {
        draws = Math.floor(since / keno.config.calls.delay) - 1;
    } else {
        draws = keno.config.draws;
        finished = true;
    }

    var game = keno.json.current["game-number"];
    if (keno.data.last.game != game) {
        finished = true;
        keno.data.last.bonus = null;
        keno.data.last.state = -1;
        keno.data.last.call = -1;
    }

    getelem("keno-draws-value").innerHTML = draws >= 0 ? draws : "..";
    getelem("keno-timer-value").innerHTML = maketime(next);
    getelem("keno-game-value").innerHTML = game.zeropad(3);

    var heads = 0,
        tails = 0,
        last = -1,
        call = -1;

    if (keno.json.current.draw != null && draws >= 0) {
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

    var bonus = null;
    if (keno.json.current.variants != null) {
        bonus = keno.json.current.variants.bonus;
        if (bonus == "reg") bonus = "x1";

        if (bonus != keno.data.last.bonus) {
            keno_sound("bonus" + bonus);
            keno.data.last.bonus = bonus;
        }
    }

    getelem("keno-heads-value").innerHTML = heads;
    getelem("keno-tails-value").innerHTML = tails;
    getelem("keno-bonus-value").innerHTML = bonus != null ? bonus : "&nbsp;";
    getelem("keno-llast-value").innerHTML = last >= 0 ? last : "&nbsp;";

    if (finished || call < 0 || call != keno.data.last.call)
        keno_call(
            "&nbsp;",
            getelem("keno-t-draws").getBoundingClientRect(),
            true
        );

    var state = 0;
    if (finished) {
        if (draws == keno.config.draws) state = 1;
    } else if (call >= 0 && call != keno.data.last.call) state = 2;

    console.log(
        "state:",
        state,
        keno.data.last.state,
        call,
        keno.data.last.call
    );

    if (state != keno.data.last.state) {
        switch (state) {
            case 1:
                keno_sound(
                    heads > tails ? "heads" : heads < tails ? "tails" : "evens"
                );
                break;
            case 2:
                keno_call(
                    call,
                    getelem("keno-n-" + call).getBoundingClientRect(),
                    false
                );
                keno_sound(call.zeropad(3));
                break;
        }
    }

    keno.data.last.state = state;
    keno.data.last.call = call;
    keno.data.last.game = game;
}

function keno_toggle(start = false) {
    keno.data.allow = start ? false : !keno.data.allow;

    var snd = getelem("keno-sound"),
        tog = keno.data.allow ? "Disable" : "Enable";

    snd.innerHTML =
        '[ <a id="keno-sound-toggle" class="keno-center" title="' +
        tog +
        ' Sound" onclick="keno_toggle();">' +
        tog +
        " Sound</a> ]";

    if (keno.data.sound != null) keno.data.sound.stop();
    keno.data.sound = null;
    keno.data.sndbuf = [];

    if (keno.data.allow) keno_sound("start");

    console.log("sound:", keno.data.allow ? "enabled" : "disabled");
}

function keno_init() {
    if (keno.data.interval != null) window.clearInterval(keno.data.interval);

    var url = window.location.hash,
        idx = url.indexOf("#"),
        str = null;

    if (idx >= 0) str = url.substring(idx + 1);

    var elem = getelem("keno-juris");

    elem.innerHTML = "";

    for (var i = 0; i < keno.config.jurisdictions.length; i++) {
        if (str == keno.config.jurisdictions[i]) {
            keno.data.jurisdiction = str;
            elem.innerHTML +=
                ' [ <b><a href="#' +
                keno.config.jurisdictions[i] +
                '">' +
                keno.config.jurisdictions[i].toUpperCase() +
                "</a></b> ] ";
        } else {
            elem.innerHTML +=
                ' [ <a href="#' +
                keno.config.jurisdictions[i] +
                '">' +
                keno.config.jurisdictions[i].toUpperCase() +
                "</a> ] ";
        }
    }

    if (keno.data.jurisdiction == null)
        keno.data.jurisdiction = keno.config.jurisdictions[0];

    keno.data.poll = [0, 0];
    keno.data.refresh = keno_timer();
    keno.data.interval = window.setInterval(keno_update, keno.config.uprate);

    keno_toggle(true);

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
