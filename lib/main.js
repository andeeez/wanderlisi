import Map from "./map.js";
import DetailPane from "./detail.js";
import Note from "./note.js";
import { TrackList } from "./track.js";
import Metadata from "./metadata.js";
import Filter from "./filter.js";
import Menu from "./menu.js";
import Plan from "./plan.js";

function setTitle(title) {
    document.title = (title ? title + " - " : "") + "wanderlisi";
}

const params = window.location.hash.match(/:t:([^:]*)/)
var selectedTrackName = params!=null && params.length > 1 ? decodeURIComponent(params[1]) : null;

const planMatch = window.location.hash.match(/:p:([^:]*)/)
var selectedPlan = planMatch != null && planMatch.length > 1 ? decodeURIComponent(planMatch[1]) : null;

const planCallback = (name, title) => {
    if (name) {
        window.location.hash = ":p:" + name;
    } else {
        window.location.hash = "";
    }
    setTitle(title);
}

function trackListLoaded() {
    $("#menu-button").removeClass("hidden");
    if (selectedPlan) {
        plan.show(selectedPlan);
    }
}

const trackList = new TrackList(trackListLoaded)
const plan = new Plan(trackList, planCallback);

const onMenuOpen = open => {
    if(open) {
        onFeatureSelect(null);
    }
}

const onMenuSelect = (name) => {
    plan.show(name, true);
}

new Menu(plan, onMenuOpen, onMenuSelect);

const note = new Note();
const metadata = new Metadata();

const detailPane = new DetailPane(note);

const onFeatureSelect = (featureUrl =>  {
    if(featureUrl) {
        var track = trackList.get(featureUrl);
        detailPane.show(track);
        window.location.hash = ":t:" + encodeURIComponent(track.name);
        selectedTrackName = track.name;
        setTitle(track.name);
    } else {
        window.location.hash = "";
        detailPane.show(null);
        selectedTrackName = null;
        setTitle(null);
    }
})

const map = new Map('map', {selectedTrack: selectedTrackName, onSelect: onFeatureSelect});

const displayTrack =
    (track, visible) => {
        visible ? map.show(track) : map.hide(track);
        if(track.name == selectedTrackName) {
            if(!visible) {
                onFeatureSelect(null);
            }
        }
    }

const filter = new Filter(!selectedTrackName, trackList, displayTrack);

var counter = 0;
trackList.forEach(track =>
    metadata.load(track, record => {
        track.update(record);
        note.load(track, record => {
            track.update(record);
            map.addTrack(
                track.featureUrl(),
                false,
                (featureUrl, record) => {
                    trackList.update(featureUrl, record);
                    filter.apply(track);
                    counter += 1;
                    if(counter == trackList.size()) {
                        filter.show();
                    }
                });
        })
    }));

if(selectedPlan) {
    plan.open();
}