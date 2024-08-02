import Map from "./map.js";
import DetailPane from "./detail.js";
import { TrackList } from "./track.js";

const params = window.location.hash.match(/:t:([^:]*)/)
const selectedTrack = params!=null && params.length > 1 ? decodeURIComponent(params[1]) : null;

const trackList = new TrackList()
const detailPane = new DetailPane();

const onSelect = (featureUrl =>  {
    if(featureUrl) {
        var track = trackList.get(featureUrl);
        detailPane.showTrack(track);
        window.location.hash = ":t:" + encodeURIComponent(track.name);
    } else {
        window.location.hash = "";
        detailPane.showTrack(null);
    }
})

const map = new Map({selectedTrack, onSelect});

trackList.forEach(track => map.addTrack(
    track.featureUrl(),
    (featureUrl, record) => trackList.update(featureUrl, record)));