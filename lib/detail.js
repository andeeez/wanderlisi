import Profile from "./profile.js";

export default class DetailPane {

    lastTrack = null;
    profile = new Profile();

    showTrack(track) {
        if(track) {
            document.getElementById("detail-container").classList.add("show-detail-container");
            document.getElementById("track-name").firstChild.innerText = track.name;
            document.getElementById("gpx").href = track.featureUrl();
            if (track != this.lastTrack) {
                document.getElementById("images").innerHTML = '';
            }
            this.profile.showProfile(track);
            this.lastTrack = track;

        } else {
            document.getElementById("detail-container").classList.remove("show-detail-container");
            document.getElementById("detail-container").classList.remove("expand-detail-container");
            document.getElementById("images-button").classList.remove("active-button");
            // TODO: hide image viewer
        }
    }
}