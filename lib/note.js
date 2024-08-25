export default class Note {

    editLink = "";

    constructor() {
        document.getElementById("notes-button").addEventListener("click", () => this.toggle());
        document.getElementById("edit-button").addEventListener("click", () => {
            window.open(this.editLink);
        });
    }

    load(track, callback) {
        var folder = track.folder();
        fetchUrl(folder + "/notes.md", response => {
            var record = {};
            record.note = marked.parse(response.responseText);
            var values = response.responseText.split('\n')
                .filter(line => /^\s*-/.test(line))
                .filter(line => line.indexOf(":") > 0)
                .map(line => line.split(":")[1])
                .filter(line => line.length > 0)
                .map(line => line.trim()[0])
                .map(line => line.toLowerCase())
            if (values.length >= 2) {
                record.done = (values[0] != "n") * 1 + (values[1] != "n") * 2;
            }
            callback(record);
        }, true);
    }

    show(track) {
        document.getElementById("notes").innerHTML = track.note;
        this.editLink = track.metadata.notes;
    }

    hide() {
        document.getElementById("notes-container").style.display = "none";
        document.getElementById("track-data").style.display = "block";
        document.getElementById("notes-button").classList.remove("active-button");
    }

    toggle() {
        if (document.getElementById("notes-container").style.display == "none") {
            document.getElementById("notes-container").style.display = "block";
            document.getElementById("track-data").style.display = "none";
            document.getElementById("notes-button").classList.add("active-button");
        } else {
            this.hide();
        }
    }
}