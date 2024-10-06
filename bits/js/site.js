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

function toggle_theme() {
    var type = 'dark';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
        type = 'light';

    for (var i = 0; i < document.body.classList.length; i++) {
        if (document.body.classList[i] == 'dark') {
            type = 'dark';
            break;
        } else if (document.body.classList[i] == 'light') {
            type = 'light';
            break;
        }
    }

    if (type == 'dark') {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
    } else if (type == 'light') {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
    }

    console.log('theme: ', type);
}

$(document).ready(function ($) {
    toggle_theme();
});
