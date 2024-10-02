$(document).ready(function() {
    jQuery("time.timeago").timeago();
    jQuery.timeago.settings = {
        refreshMillis: 1000,
        allowPast: true,
        allowFuture: true,
        localeTitle: false,
        cutoff: 0,
        autoDispose: true,
        strings: {
            prefixAgo: null,
            prefixFromNow: null,
            suffixAgo: "ago",
            suffixFromNow: "from now",
            inPast: "any moment",
            seconds: "a moment",
            minute: "1 minute",
            minutes: "%d minutes",
            hour: "1 hour",
            hours: "%d hours",
            day: "1 day",
            days: "%d days",
            month: "1 month",
            months: "%d months",
            year: "1 year",
            years: "%d years",
            wordSeparator: " ",
            numbers: []
        }
    }
});
