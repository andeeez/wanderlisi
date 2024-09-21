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
        console.log(this)
    }
}

export class TrackList {

    tracks = {};

    constructor() {
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
    }

    forEach(callback) {
        Object.values(this.tracks).forEach(callback);
    }

    get(featureUrl) {
        return this.tracks[featureUrl];
    }

    getByName(name) {
        const result = Object.values(this.tracks).filter(track => track.name == name);
        if(result.length > 0) {
            return result[0];
        }
    }

    update(featureUrl, record) {
        const track = this.tracks[featureUrl];
        track.update(record);
    }

    size() {
        return Object.values(this.tracks).length;
    }
}