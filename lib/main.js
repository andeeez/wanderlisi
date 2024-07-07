import Map from "./map.js";
import tracks from '../data/tracks/' with { type: 'json' };

const params = window.location.hash.match(/:t:([^:]*)/)
const selectedTrack = params!=null && params.length > 1 ? decodeURIComponent(params[1]) : null;

const onSelect = console.log;

const map = new Map({selectedTrack, onSelect});

tracks.forEach(track => {
    if (track.name) {
        track = track.name
    }
    if (track.indexOf(".") != -1) {
        return;
    }
    map.addTrack('data/tracks/' + track + "/" + track + ".gpx");
});