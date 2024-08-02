export default class Gallery {

    visible = false;
    lastTrack = null;

    constructor() {
        document.getElementById("images-button").addEventListener("click", () => {
            this.visible = !this.visible;
            this.update();
        });
    }

    show(track) {
        this.zoomOut();
        if (this.lastTrack != track || document.getElementById("images").innerHTML == '') {
            document.getElementById("images-button").style.display = "none";
            fetch(track.folder(), response => {
                var list = JSON.parse(response.responseText);
                var images = list
                    .map(item => item.name ? item.name : item)
                    .filter(filename => {
                        const ext = filename.split('.').pop().toLowerCase();
                        return ext == "jpg" || ext == "jpeg";
                    });
                if (images.length > 0) {
                    document.getElementById("images-button").style.display = "inline";
                    images.forEach(filename => {
                        var elem = document.createElement("img");
                        elem.setAttribute("src", track.folder() + "/"+filename);
                        elem.setAttribute("height", "100%");
                        elem.classList.add("image");
                        elem.addEventListener("click", () => this.toggleZoom());
                        document.getElementById("images").appendChild(elem);
                    });
                }
                this.update();
            });
        } else {
            this.update();
        }
        this.lastTrack = track;
    }

    update() {
        if (this.visible && document.getElementById("images").innerHTML != "") {
            document.getElementById("detail-container").classList.add("expand-detail-container");
            document.getElementById("images-button").classList.add("active-button");
        } else {
            document.getElementById("detail-container").classList.remove("expand-detail-container");
            document.getElementById("images-button").classList.remove("active-button");
        }
    }

    zoomOut() {
        document.getElementById("image-viewer").classList.remove("image-viewer-big");
        document.getElementById("image-viewer").classList.add("image-viewer-normal");
    }

    toggleZoom() {
        var big = document.getElementById("image-viewer").classList.contains("image-viewer-normal");
        if (big) {
            document.getElementById("image-viewer").classList.remove("image-viewer-normal");
            document.getElementById("image-viewer").classList.add("image-viewer-big");
        } else {
            this.zoomOut();
        }
    }
}