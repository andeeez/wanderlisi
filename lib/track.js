import tracksJsonList from '../data/tracks/' with { type: 'json' };

export class Track {
    folderName = null;
    name = null;
    end = null;

    constructor(folderName) {
        this.folderName = folderName;
    }

    featureUrl() {
        return 'data/tracks/' + this.folderName + "/" + this.folderName + ".gpx"
    }

    folder() {
        return 'data/tracks/' + this.folderName
    }

    update(record) {
        Object.assign(this, record);
    }
}

export class TrackList {

    tracks = {};
    callback = null;

    constructor(callback) {
        tracksJsonList.forEach(folderName => {
            if (folderName.name) {
                folderName = folderName.name
            }
            if (folderName.indexOf(".") != -1) {
                return;
            }
            const track = new Track(folderName);
            this.tracks[track.featureUrl()] = track;
        });
        this.callback = callback;
    }

    forEach(callback) {
        Object.values(this.tracks).forEach(callback);
    }

    get(featureUrl) {
        return this.tracks[featureUrl];
    }

    simplify(s) {
        return s.toLowerCase().replace(/[^a-z]/g, "-")
    }

    getByName(name) {
        const result = Object.values(this.tracks)
        .filter(track => track.name)
        .filter(track => this.simplify(track.name) == this.simplify(name));
        if(result.length > 0) {
            return result[0];
        }
    }

    update(featureUrl, record) {
        const track = this.tracks[featureUrl];
        track.update(record);
        if(Object.values(this.tracks).filter(track => track.name === null).length == 0) {
            this.callback();
        }
    }

    size() {
        return Object.values(this.tracks).length;
    }
}