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
window.noteInstance = note; // Make note instance globally available for inline onclick
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

const map = new Map('map', {
    selectedTrack: selectedTrackName,
    onSelect: onFeatureSelect,
    trackList: trackList
});

// Load historic hotels and ONLY the selected SAC huts (from sac-huts-selected.json)
// Initially hidden, can be enabled via filters
Promise.all([
    fetch('./data/historic-hotels.json').then(response => response.json()),
    fetch('./data/sac-huts-selected.json').then(response => response.json())
])
.then(([hotels, selectedHuts]) => {
    // Add hotels (initially hidden via map settings)
    map.addHotels(hotels);

    const huts = (selectedHuts || []).map(h => {
        const lat = h.Latitude != null ? Number(h.Latitude) : null;
        const lon = h.Longitude != null ? Number(h.Longitude) : null;
        return {
            name: h.Name || h.Name,
            altitude: h.Hoehe_m != null ? Number(h.Hoehe_m) : null,
            difficulty: h.Schwierigkeitsgrad || h.Schwierigkeitsgrad,
            coordinates: (lat !== null && !isNaN(lat) && lon !== null && !isNaN(lon)) ? { latitude: lat, longitude: lon } : null,
            sac_reference: h.Webseite ? { url: h.Webseite } : null
        };
    });

    // Add huts (initially hidden via map settings)
    map.addHuts(huts.filter(h => h.coordinates));
})
.catch(error => console.error('Error loading map data:', error));

// Accepts optional color for 'all' status
const displayTrack =
    (track, visible, color) => {
        if (typeof color === 'string') {
            map.show(track, color);
        } else {
            visible ? map.show(track) : map.hide(track);
        }
        if(track.name == selectedTrackName) {
            if(!visible && typeof color !== 'string') {
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