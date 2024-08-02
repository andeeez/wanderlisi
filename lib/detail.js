import Profile from "./profile.js";

export default class DetailPane {

    lastTrack = null;
    profile = new Profile();

    constructor(note) {
        this.note = note;
    }

    show(track) {
        if(track) {
            this.note.hide();
            document.getElementById("detail-container").classList.add("show-detail-container");
            document.getElementById("track-name").firstChild.innerText = track.name;
            document.getElementById("track-name").firstChild.href = track.metadata.folder;
            document.getElementById("gpx").href = track.featureUrl();
            if (track != this.lastTrack) {
                document.getElementById("images").innerHTML = '';
            }
            document.getElementById("maps").href = "https://www.google.com/maps/dir/?api=1&destination=" + track.start[1] + "," + track.start[0];
            this.profile.show(track);
            this.note.show(track);
            this.lastTrack = track;
        } else {
            document.getElementById("detail-container").classList.remove("show-detail-container");
            document.getElementById("detail-container").classList.remove("expand-detail-container");
            document.getElementById("images-button").classList.remove("active-button");
            // TODO: hide image viewer
        }
    }
}