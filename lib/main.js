import Map from "./map.js";
import DetailPane from "./detail.js";
import Note from "./note.js";
import { TrackList } from "./track.js";
import Metadata from "./metadata.js";

const params = window.location.hash.match(/:t:([^:]*)/)
const selectedTrack = params!=null && params.length > 1 ? decodeURIComponent(params[1]) : null;

const trackList = new TrackList()
const note = new Note();
const metadata = new Metadata();

const detailPane = new DetailPane(note);

const onSelect = (featureUrl =>  {
    if(featureUrl) {
        var track = trackList.get(featureUrl);
        detailPane.show(track);
        window.location.hash = ":t:" + encodeURIComponent(track.name);
    } else {
        window.location.hash = "";
        detailPane.show(null);
    }
})

const map = new Map({selectedTrack, onSelect});

trackList.forEach(track =>
    metadata.load(track, record => {
        track.update(record);
        note.load(track, record => {
            track.update(record);
            map.addTrack(
                track.featureUrl(),
                (featureUrl, record) => trackList.update(featureUrl, record));
        })
    }));