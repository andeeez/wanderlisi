import Map from "./map.js";
import DetailPane from "./detail.js";
import { TrackList } from "./track.js";

const params = window.location.hash.match(/:t:([^:]*)/)
const selectedTrack = params!=null && params.length > 1 ? decodeURIComponent(params[1]) : null;

const trackList = new TrackList()
const detailPane = new DetailPane();

const onSelect = detailPane.showTrack

const map = new Map({selectedTrack, onSelect});

trackList.forEach(track => map.addTrack(track.featureUrl(), rec => trackList.update(rec)));