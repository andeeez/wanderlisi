export default class Filter {

    filter = null
    trackList = null;
    callback = null;

    constructor(active, trackList, callback) {
        this.trackList = trackList;
        this.callback = callback;
        const savedFilter = active && localStorage.getItem('filter');

        this.filter = savedFilter ? JSON.parse(savedFilter) : {
            active: false,
            done: false,
            user: 2
        }
        const controls = document.getElementsByClassName("control");
        const len = controls !== null ? controls.length : 0;
        for (var i = 0; i < len; i++) {
            const id = controls[i].id;
            controls[i].addEventListener("click", () => this.controlClicked(id));
        }

        this.updateControls();
    }

    updateControls() {
        if (this.filter.active) {
            this.setVisible("status", true);
            this.setActive("filter", true);
            this.setIcon("status", this.filter.done ? "check" : "heart");
            this.setVisible("user", true);
            this.setIcon("user", ["👧", "👨", "👤"][this.filter.user])
            this.setActive("user", this.filter.user < 2);
        } else {
            this.setActive("filter", false);
            this.setVisible("status", false);
            this.setVisible("user", false);
        }
    }

    controlClicked(control) {
        switch (control) {
            case 'filter':
                this.filter.active = !this.filter.active;
                break;
            case 'status':
                this.filter.done = !this.filter.done;
                break;
            case 'user':
                this.filter.user = (this.filter.user + 1) % 3;
                break;
        }
        this.trackList.forEach(track => this.apply(track));
        this.updateControls();
        localStorage.setItem('filter', JSON.stringify(this.filter));
    }

    apply(track) {
        const selection = ((this.filter.user + 1) ^ (!this.filter.done * 3));
        this.callback(track, !(this.filter.active && track.done != selection));
    }

    setVisible(control, value) {
        document.getElementById(control).style.display = (value ? "block" : "none");
    }

    setActive(control, value) {
        if (value) {
            document.getElementById(control).classList.add("active");
        } else {
            document.getElementById(control).classList.remove("active");
        }
    }

    setIcon(control, value) {
        const element = document.getElementById(control);
        if (element.firstChild.localName == "i") {
            element.firstChild.classList = "icon fa fa-" + value;
        } else {
            element.firstChild.innerHTML = value;
        }
    }
}