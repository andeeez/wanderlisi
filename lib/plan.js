import Profile from "./profile.js";
import Route from "./route.js";
import Train from "./train.js";

export default class Plan {

    callback = null;
    trackList = null;
    route = new Route();
    train = new Train();
    profile = new Profile();

    constructor(trackList, callback) {
        this.callback = callback;
        this.trackList = trackList;
        document.getElementById("close-button").addEventListener("click", () => this.close());
    }

    list(listCallback) {
        fetchUrl("data/plans", response => {
            JSON.parse(response.responseText).forEach(entry => {
                var name = entry.name || entry;
                if (name.endsWith(".md")) {
                    name = name.replace(/\.md$/, "")
                    this.load(name, title => listCallback(name, title));
                }
            });
        }, true);
    }

    load(name, loadCallback) {
        var url = "data/plans/" + name + ".md";
        fetchUrl(url, response => {
            var title = response.responseText.split('\n')
                .filter(line => /^#\s*.*/.test(line))
                .map(line => line.split("#")[1])
                .filter(line => line.length > 0)
                .map(line => line.trim())[0];

            loadCallback(title, response.responseText);
        });
    }

    show(name, sliding) {
        if(sliding) {
            document.getElementById("plan-container").classList.add("plan-container-sliding");
        }
        this.load(name, (title, content) => {
            document.getElementById("plan-container").classList.add("plan-container-open");
            this.callback(name, title);
            var rendered = marked.parse(content);
            document.getElementById("plan").innerHTML = rendered;

            const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;
            const match = title.match(datePattern);
            const date = match ? moment(match[0], "DD.MM.YYYY") : moment();

            var steps = [];
            steps = this.createSteps(date, content, () => {
                setTimeout(() =>
                    document.getElementById("plan").innerHTML = "<pre>"+JSON.stringify(steps, null, 2)+"</pre>", 1);
            });

            setTimeout(() => document.getElementById("plan-container").classList.add("plan-container-sliding"), 1);
        })
    }

    createSteps(date, content, callback) {
        var ignore = false;
        const allLines = content.split("\n");
        const lines = [];
        allLines.forEach(line =>{
            if(line.indexOf("<!--") != "-1") {
                ignore = true;
            }
            if(!ignore) {
                lines.push(line);
            }
            if (line.indexOf("-->") != "-1") {
                ignore = false;
            }
        })

        const steps = lines
            .filter(line => /^\s*-\s.*$/.test(line))
            .map(line => line.replace(/^\s*-\s*/, ""))
            .map(line => this.parseStep(line));

        this.calculateSteps(date, steps, callback);

        return steps;
    }

    calculateSteps(date, steps, callback) {
        var previous = null;
        var queue = steps.length - 1;
        var day = date.clone();
        steps.forEach(current => {
            if (previous) {
                var newDay = this.calculateStep(day, previous, current, () => {
                    if(--queue == 0) {
                        if(!this.complete(steps)) {
                            this.calculateSteps(date, steps, callback);
                        } else {
                            callback();
                        }
                    }
                });
                if(newDay) {
                    day.add(1, "day");
                }
            }
            previous = current;
        });
        previous.end.time = previous.end.time || "19:00";
    }

    getEndLocation(step, callback) {
        callback(step.text);
    }

    calculateStep(date, previous, current, callback) {
        var newDay = false;
        Object.entries(current.activities).forEach(entry => {
            var activity = entry[1];
            switch(entry[0]) {
                case "walk":
                    if (activity.duration == null) {
                        const track = this.trackList.getByName(current.text);
                        if(track) {
                            const profile = this.profile.calculate(track);
                            activity.duration = profile.totalMinutes;
                            current.distance = (Math.round(profile.distance / 100.0) / 10);
                            current.start = { coordinates: profile.start };
                            Object.assign(current.end, { coordinates: profile.end });
                        }
                    }
                    this.calculatePreviousEndTime(previous, current);
                    callback(current);
                    break;
                case "train":
                    if (activity.duration == null && current.end.time) {
                        this.getEndLocation(previous, start =>
                            this.train.calculate(start, current.text, date.format("YYYY-MM-DD"), current.end.time,
                                result => {
                                    activity.duration = result.duration;
                                    current.start = result.start;
                                    current.end = result.end;
                                    this.calculatePreviousEndTime(previous, current);
                                    callback(current);
                                }));
                    } else {
                        this.calculatePreviousEndTime(previous, current);
                        callback(current);
                    }
                    break;
                case "car":
                    if(activity.duration == null) {
                        this.route.calculate(previous.endLocation || previous.text, current.text, result => {
                            activity.duration = result.duration;
                            current.distance = result.distance;
                            current.start = result.start;
                            Object.assign(current.end, result.end);
                            this.calculatePreviousEndTime(previous, current);
                            callback(current);
                        });
                    } else {
                        this.calculatePreviousEndTime(previous, current);
                        callback(current);
                    }
                    break;
                case "home":
                    activity.duration = 0;
                    this.calculatePreviousEndTime(previous, current);
                    callback(current);
                    break;
                case "eat":
                    if (activity.duration == null) {
                        activity.duration = 45;
                    }
                    this.calculatePreviousEndTime(previous, current);
                    break;
                case "sleep":
                    activity.duration = 0;
                    if(!previous.end.time) {
                        previous.end.time = "17:00";
                    }
                    callback(current);
                    newDay = true;
                    break;
            }
        });
        return newDay;
    }

    calculatePreviousEndTime(previous, current) {
        if (current.end.time) {
            var complete = Object.values(current.activities).map(activity => activity.duration).indexOf(undefined) == -1;
            if (complete) {
                var totalDuration = Object.values(current.activities).map(activity => activity.duration).reduce((a, b) => a + b, 0);
                var newPreviousEndTime = this.substract(current.end.time, totalDuration);
                if(!previous.end.time || newPreviousEndTime < previous.end.time) {
                    previous.end.time = newPreviousEndTime;
                }
            }
        }
    }

    substract(time, duration) {
        const segments = time.split(":");
        var totalMinutes = new Number(segments[0])*60 + new Number(segments[1]);
        totalMinutes -= duration;
        return String(Math.floor(totalMinutes/60)).padStart(2, '0')+":"+String(totalMinutes%60).padStart(2, '0');
    }

    complete(steps) {
        var complete = true;
        steps.forEach(step => complete = complete && !!step.end.time);
        return complete;
    }

    parseStep(line) {
        const types = {
            "👟": "walk",
            "🚆": "train",
            "🚘": "car",
            "🏠": "home",
            "🍽️": "eat",
            "🛏️": "sleep"
        }
        var result = {
            text: line,
            activities: {}
        }
        Object.keys(types).forEach(symbol => {
            result.end = {};
            if(result.text.indexOf(symbol) != -1) {
                result.text = result.text.replace(new RegExp("\\s*"+symbol+"\\s*"), "");
                result.activities[types[symbol]] = {};
            }
            var timePattern = /\d\d:\d\d/;
            var timePos = result.text.search(timePattern);
            if ( timePos != -1) {
                result.end.time = result.text.substring(timePos, timePos+5);
                result.text = result.text.replace(timePattern, "");
            }
        })
        result.text = result.text.trim();
        return result;
    }

    close() {
        document.getElementById("plan-container").classList.remove("plan-container-open");
        this.callback();
    }

}