export default class Filter {

    filter = null
    trackList = null;
    callback = null;
    // 0: not done, 1: done, 2: all
    STATUS = { NOT_DONE: 0, DONE: 1, ALL: 2 };

    constructor(active, trackList, callback) {
        this.trackList = trackList;
        this.callback = callback;
        const savedFilter = active && localStorage.getItem('filter');

        this.filter = savedFilter ? JSON.parse(savedFilter) : {
            active: false,
            status: 0, // 0: not done, 1: done, 2: all
            user: 2
        }
        const controls = document.getElementsByClassName("filter-control");
        const len = controls !== null ? controls.length : 0;
        for (var i = 0; i < len; i++) {
            const id = controls[i].id;
            controls[i].addEventListener("click", () => this.controlClicked(id));
        }

        this.updateControls();
    }

    show() {
        const controls = document.getElementsByClassName("filter-control");
        const len = controls !== null ? controls.length : 0;
        for (var i = 0; i < len; i++) {
            controls[i].classList.remove("hidden");
        }
    }

    updateControls() {
        if (this.filter.active) {
            this.setVisible("status", true);
            this.setActive("filter", true);
            // status: 0 = not done (heart), 1 = done (check), 2 = all (eye)
            const statusIcons = ["heart", "check", "eye"];
            this.setIcon("status", statusIcons[this.filter.status]);
            this.setVisible("user", this.filter.status === this.STATUS.ALL ? false : true);
            this.setIcon("user", ["👧", "👨", "👤"][this.filter.user])
            this.setActive("user", this.filter.user < 2 && this.filter.status !== this.STATUS.ALL);
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
                this.filter.status = (this.filter.status + 1) % 3;
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
        if (!this.filter.active) {
            this.callback(track, true);
            return;
        }
        const color = track.done ? '#0bba8bc2' : '#bb11bba0';
        if (this.filter.status === this.STATUS.ALL) {
            // Show all tracks, color by done status
            // Magenta with transparency for not done, bright green with transparency for done            
            this.callback(track, true, color);
        } else {
            const selection = ((this.filter.user + 1) ^ ((this.filter.status === this.STATUS.DONE ? 0 : 1) * 3));
            var isVisible = !(this.filter.active && track.done != selection);
            this.callback(track, isVisible, isVisible ? color : null);
        }
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
            element.firstChild.className = "icon fa fa-" + value;
        } else {
            element.firstChild.innerHTML = value;
        }
    }
}