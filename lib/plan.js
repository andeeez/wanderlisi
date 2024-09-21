import Profile from "./profile.js";
import Route from "./route.js";

export default class Plan {

    callback = null;
    trackList = null;
    route = new Route();
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

            var steps = [];
            steps = this.createSteps(content, () => {
                setTimeout(() =>
                    document.getElementById("plan").innerHTML = "<pre>"+JSON.stringify(steps, null, 2)+"</pre>", 1);
            });

            setTimeout(() => document.getElementById("plan-container").classList.add("plan-container-sliding"), 1);
        })
    }

    createSteps(content, callback) {
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

        this.calculateSteps(steps, callback);

        return steps;
    }

    calculateSteps(steps, callback) {
        var previous = null;
        var queue = steps.length - 1;
        steps.forEach(current => {
            if (previous) {
                this.calculateStep(previous, current, () => {
                    if(--queue == 0) {
                        if(!this.complete(steps)) {
                            this.calculateSteps(steps, callback);
                        } else {
                            callback();
                        }
                    }
                });
            }
            previous = current;
        });
        previous.endTime = previous.endTime || "19:00";
    }

    calculateStep(previous, current, callback) {
        Object.entries(current.activities).forEach(entry => {
            var activity = entry[1];
            switch(entry[0]) {
                case "walk":
                    if (activity.duration == null) {
                        const track = this.trackList.getByName(current.text);
                        if(track) {
                            const profile = this.profile.calculate(track);
                            activity.duration = profile.totalMinutes;
                            activity.distance = (Math.round(profile.distance / 100.0) / 10);
                        }
                    }
                    this.calculatePreviousEndTime(previous, current);
                    callback(current);
                    break;
                case "train":
                    if (activity.duration == null) {
                        if(current.endTime) {
                            activity.duration = 60;
                        }
                    }
                    this.calculatePreviousEndTime(previous, current);
                    callback(current);
                    break;
                case "car":
                    if(activity.duration == null) {
                        this.route.calculate(previous.endLocation || previous.text, current.text, result => {
                            Object.assign(activity, result);
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
                    if(!previous.endTime) {
                        previous.endTime = "17:00";
                    }
                    current.endTime = "08:00";
                    this.calculatePreviousEndTime(previous, current);
                    callback(current);
                    break;
            }
        });
    }

    calculatePreviousEndTime(previous, current) {
        if(!previous.endTime) {
            if (current.endTime) {
                var complete = Object.values(current.activities).map(activity => activity.duration).indexOf(undefined) == -1;
                if(complete) {
                    var totalDuration = Object.values(current.activities).map(activity => activity.duration).reduce((a, b) => a + b, 0);
                    previous.endTime = this.substract(current.endTime, totalDuration);
                }
            }
        }
    }

    substract(time, duration) {
        const segments = time.split(":");
        var totalMinutes = new Number(segments[0])*60 + new Number(segments[1]);
        totalMinutes -= duration;
        return Math.floor(totalMinutes/60)+":"+(totalMinutes%60);
    }

    complete(steps) {
        var complete = true;
        steps.forEach(step => complete = complete && !!step.endTime);
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
            if(result.text.indexOf(symbol) != -1) {
                result.text = result.text.replace(new RegExp("\\s*"+symbol+"\\s*"), "");
                result.activities[types[symbol]] = {};
            }
            var timePattern = /\d\d:\d\d/;
            var timePos = result.text.search(timePattern);
            if ( timePos != -1) {
                result.endTime = result.text.substring(timePos, timePos+5);
                result.text = result.text.replace(timePattern, "");
            }
        })
        return result;
    }

    close() {
        document.getElementById("plan-container").classList.remove("plan-container-open");
        this.callback();
    }

}