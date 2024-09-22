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

    formatDuration(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return hours + "h" + String(minutes).padStart(2, '0');
    }

    updateStep(step) {
        if(this.durationComplete(step) && this.duration(step) > 0) {
            $(`#step-${step.id} .duration`)
                .text(this.formatDuration(this.duration(step)));
        }
        if(step.end.time) {
            const next = $(`#step-${step.id + 1} .start-time`)
            if(next.text().trim() == "") {
                next.text(step.end.time).append("<br>");
            }
        }
    }

    show(name, sliding) {
        if(sliding) {
            document.getElementById("plan-container").classList.add("plan-container-sliding");
        }
        this.load(name, (title, content) => {
            document.getElementById("plan-container").classList.add("plan-container-open");
            this.callback(name, title);

            var id = 0;
            const renderer = new marked.Renderer();
            renderer.listitem = (text) => {
                return `<li id="step-${id++}">
                        <span class="placeholder start-time">
                        </span>${text}
                        <span class="placeholder duration"></span>
                    </li>`;
            };
            var rendered = marked.parse(content, { renderer });
            document.getElementById("plan").innerHTML = rendered;

            const datePattern = /(\d{2})\.(\d{2})\.(\d{4})/;
            const match = title.match(datePattern);
            const date = match ? moment(match[0], "DD.MM.YYYY") : moment();

            var steps = [];
            steps = this.createSteps(date, content, step => {
                this.updateStep(step)
            }, () => setTimeout(() => console.log(JSON.stringify(steps, null, 2))));

            setTimeout(() => document.getElementById("plan-container").classList.add("plan-container-sliding"), 1);
        })
    }

    createSteps(date, content, stepCallback, callback) {
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

        var id = 0;
        const steps = lines
            .filter(line => /^\s*-\s.*$/.test(line))
            .map(line => line.replace(/^\s*-\s*/, ""))
            .map(line => this.parseStep(line))
            .map(step => (step.id = id++, step));

        this.calculateSteps(date, steps, stepCallback, callback);

        return steps;
    }

    calculateSteps(date, steps, stepCallback, callback) {
        var previous = null;
        var queue = steps.length - 1;
        var day = date.clone();
        steps.forEach(current => {
            if (previous) {
                var newDay = this.calculateStep(day, previous, current, step => {
                    stepCallback(step);
                    if(--queue == 0) {
                        if(!this.complete(steps)) {
                            this.calculateSteps(date, steps, stepCallback, callback);
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
        if (!previous.end.time) {
            previous.end.time = "19:00";
            stepCallback(previous);
        }
    }

    getEndLocation(step, callback) {
        if(step.end.coordinates) {
            fetchUrl(`https://transport.opendata.ch/v1/locations?x=${step.end.coordinates[0]}&y=${step.end.coordinates[1]}`, response =>
                callback(JSON.parse(response.responseText).stations.filter(station => station.id)[0].id));
        } else {
            callback(step.text);
        }
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
                    this.calculatePreviousEndTime(previous, current, callback);
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
                                    this.calculatePreviousEndTime(previous, current, callback);
                                    callback(current);
                                }));
                    } else {
                        this.calculatePreviousEndTime(previous, current, callback);
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
                            this.calculatePreviousEndTime(previous, current, callback);
                            callback(current);
                        });
                    } else {
                        this.calculatePreviousEndTime(previous, current, callback);
                        callback(current);
                    }
                    break;
                case "home":
                    activity.duration = 0;
                    this.calculatePreviousEndTime(previous, current, callback);
                    callback(current);
                    break;
                case "eat":
                    if (activity.duration == null) {
                        activity.duration = 45;
                    }
                    this.calculatePreviousEndTime(previous, current, callback);
                    break;
                case "sleep":
                    activity.duration = 0;
                    if(!previous.end.time) {
                        previous.end.time = "17:00";
                        callback(previous)
                    }
                    if (!current.end.coordinates && previous.end.coordinates) {
                        current.end.coordinates = previous.end.coordinates;
                    }
                    callback(current);
                    newDay = true;
                    break;
            }
        });
        return newDay;
    }

    durationComplete(step) {
        return Object.values(step.activities).map(activity => activity.duration).indexOf(undefined) == -1;
    }

    duration(step) {
        return Object.values(step.activities).map(activity => activity.duration).reduce((a, b) => a + b, 0);
    }

    calculatePreviousEndTime(previous, current, callback) {
        if (current.end.time) {
            if (this.durationComplete(current)) {
                var newPreviousEndTime = this.substract(current.end.time, this.duration(current));
                if(!previous.end.time || newPreviousEndTime < previous.end.time) {
                    previous.end.time = newPreviousEndTime;
                    callback(previous);
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