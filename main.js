import Map from 'https://cdn.skypack.dev/ol/Map.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import Feature from 'https://cdn.skypack.dev/ol/Feature.js';
import Point from 'https://cdn.skypack.dev/ol/geom/Point.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import VectorLayer from 'https://cdn.skypack.dev/ol/layer/Vector.js';
import VectorSource from 'https://cdn.skypack.dev/ol/source/Vector.js';
import XYZ from 'https://cdn.skypack.dev/ol/source/XYZ.js';
import {fromLonLat, toLonLat} from 'https://cdn.skypack.dev/ol/proj.js';
import {getDistance} from 'https://cdn.skypack.dev/ol/sphere.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'https://cdn.skypack.dev/ol/style.js';
import Select from 'https://cdn.skypack.dev/ol/interaction/Select.js';
import {click} from 'https://cdn.skypack.dev/ol/events/condition.js';

import GPX from 'https://cdn.skypack.dev/ol/format/GPX.js';
import tracks from './tracks/' with { type: 'json' };

const params = window.location.hash.match(/:t:([^:]*)/)
const selectedTrack = params!=null && params.length > 1 ? decodeURIComponent(params[1]) : null;

// Map Config

const view = new View({
    extent: [640000, 5660000, 1200000, 6190000],
    minZoom: 7,
    maxZoom: 17,
    enableRotation: false,
    center: fromLonLat([7.6, 46.92]),
    zoom: 8.5,
  });

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      extent: [640000, 5660000, 1200000, 6190000],
      preload: 1,
      source: new XYZ({
        zDirection: -1,
        url: `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg`
      })
    })
  ],
  view: view,
  controls: []
});

const startPinSource = new VectorSource ();
const endPinSource = new VectorSource ();
const processedLayers =  []

// Load Tracks

const trackMap = {}

const format = new GPX();
const readFeatures_ = format.readFeatures;
format.readFeatures = function(source, options) {
  const meta = format.readMetadata(source);
  const features = readFeatures_.apply(this, arguments);
  if(meta && meta.name) {
    features.forEach(feature => {
      if(feature.getGeometry().getType() == "MultiLineString") {
        feature.set("name", meta.name);
      }
    })
  }
  return features;
}

var trackContent = {};

tracks.forEach(track => {
  if(track.name) {
    track = track.name
  }
  if(track.indexOf(".") != -1 ) {
    return;
  }
  const source = new VectorSource({
      url: 'tracks/'+(/^.*\....$/.test(track) ? track : track+"/"+track+".gpx"),
      format: format,
  });
  source.on("addfeature", e => {
    const gpxUrl = e.target.getUrl()
    e.feature.set("gpxUrl", gpxUrl);
    var folder = gpxUrl.substring(0, gpxUrl.lastIndexOf('/')+1);
    fetch(folder+"/notes.md", response => {
      trackContent[folder] = trackContent[folder] || {};
      trackContent[folder].notes = marked.parse(response.responseText);
    });
  });
  const layer = new VectorLayer({
    source: source,
    style: new Style({
      stroke: new Stroke({
        color: '#bb11bbc0',
        width: 8
      })
    }),
    zIndex: 0
  })
  layer.on("postrender",
    event => {
      const layer = event.target
      if(processedLayers.indexOf(layer) == -1) {
        const features = layer.getSource().getFeatures();
        features.forEach(feature => {
          const type = feature.getGeometry().getType();
          if(processedLayers.indexOf(layer) == -1 && (type == "LineString" ||
              type == "MultiLineString")) {
            processedLayers.push(layer);
            if(feature.get("name") == selectedTrack) {
              selectTrack(layer, feature);
              view.fit(feature.getGeometry(), { maxZoom: 11 });
              select.getFeatures().push(feature);
            }
            const first = new Point(feature.getGeometry().getFirstCoordinate());
            const last = new Point(feature.getGeometry().getLastCoordinate());
            startPinSource.addFeature(new Feature(first));
            endPinSource.addFeature(new Feature(last));
          }
        });
      }
    });
  map.addLayer(layer);
});

// Start/End Markers

const startStyle = new Style({
    image: new CircleStyle({
      fill: new Fill({
        color: '#ffffff',
      }),
      radius: 5,
      stroke: new Stroke({
        color: '#cc11ccc0',
        width: 2,
      }),
    })
  });

const endStyle = new Style({
    image: new CircleStyle({
      fill: new Fill({
        color: '#ffffffa0',
      }),
      radius: 5,
      stroke: new Stroke({
        color: '#cc11ccc0',
        width: 2,
      }),
    })
  });

const startPinLayer = new VectorLayer ({
  source: startPinSource,
  style: startStyle,
  zIndex: 4
});

const endPinLayer = new VectorLayer ({
  source: endPinSource,
  style: endStyle,
  zIndex: 2
});

map.addLayer (endPinLayer);
map.addLayer (startPinLayer);

// Altitude Profile

const dataset = {
  showLine: true,
  borderColor: '#cc11ccc0',
  pointStyle: false,
  data: [
    { x: 0, y: 10 },
    { x: 2.5, y: 20 },
    { x: 7, y: 15 }
  ]
};

const elevationRange = 1000;
const distanceRange = 20;

const options = {
  locale: "de-CH",
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false
    },
  },
  scales: {
    x: {
      max: distanceRange
    }
  },
  animations: {
    y: {
      duration: 1000,
      easing: 'easeOutBack'
    }
  }
}

const profile = new Chart(
  document.getElementById('profile'),
  {
    type: 'scatter',
    options: options,
    data: {
      datasets: [
        dataset
      ]
    }
  }
);

// Map Interaction

const selectStyle = new Style({
  stroke: new Stroke({
    color: '#ff44ffe0',
    width: 8
  })
})

const select = new Select({
  condition: click,
  style: selectStyle,
  hitTolerance: 10,
  filter: function(feature) {
    return feature.getGeometry().getType() == "MultiLineString";
  }
});

var selectedLayer = null;
var lastTrack = null;
var showImages = false;

function updateImageView() {
  if(showImages && document.getElementById("images").innerHTML != "") {
    document.getElementById("detail-container").classList.add("expand-detail-container");
    document.getElementById("images-button").classList.add("active-button");
  } else {
    document.getElementById("detail-container").classList.remove("expand-detail-container");
    document.getElementById("images-button").classList.remove("active-button");
  }
}

function toggleImageViewer(clear) {
  var big = document.getElementById("image-viewer").classList.contains("image-viewer-normal");
  if(big && !clear) {
    document.getElementById("image-viewer").classList.remove("image-viewer-normal");
    document.getElementById("image-viewer").classList.add("image-viewer-big");
  } else {
    document.getElementById("image-viewer").classList.add("image-viewer-normal");
    document.getElementById("image-viewer").classList.remove("image-viewer-big");
  }
    const images = document.getElementsByClassName("image");
    const len = images !== null ? images.length : 0;
    for(var i=0; i < len; i++) {
        images[i].style.height = "100%";
    }
}

document.getElementById("images-button").addEventListener("click", () => {
  showImages = !showImages;
  updateImageView();
});

function fetch(url, callback) {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            callback(this);
          }
      };
      xmlhttp.open("GET", url, true);
      xmlhttp.send();
}

function toggleNotes(clear) {
  if(document.getElementById("notes").style.display = "none" && !clear) {
    document.getElementById("notes").style.display = "block";
    document.getElementById("track-data").style.display = "none";
    document.getElementById("notes-button").classList.add("active-button");
  } else {
    document.getElementById("notes").style.display = "none";
    document.getElementById("track-data").style.display = "block";
    document.getElementById("notes-button").classList.remove("active-button");
  }
}

document.getElementById("notes-button").addEventListener("click", () => toggleNotes());

function selectTrack(layer, feature) {
    layer.setZIndex(1);
    const name = feature.get("name");
    selectedLayer = layer;
    document.getElementById("detail-container").classList.add("show-detail-container");
    document.getElementById("track-name").innerText = name;
    if(name != lastTrack) {
      document.getElementById("images").innerHTML = '';
    }
    lastTrack = name;
    var lines = feature.getGeometry().getCoordinates();
    var current = {
      distance: 0,
      up: 0,
      down: 0,
      time: 0,
      coordinate: toLonLat(feature.getGeometry().getFirstCoordinate())
    }
    var highest = 0;
    var lowest = 9999;
    var previous = Object.assign({}, current);
    var waypoints = [previous];
    dataset.data = [ {x: 0, y: current.coordinate[2] } ];
    profile.update();
    lines.forEach(
      line => line.forEach(point => {
        const coordinate = toLonLat(point);
        current.distance += getDistance(current.coordinate, coordinate);
        const delta = coordinate[2] - current.coordinate[2];
        highest = Math.max(highest, coordinate[2]);
        lowest = Math.min(lowest, coordinate[2]);
        current.up += delta > 0 ? delta : 0;
        current.down += delta < 0 ? -delta : 0;
        current.coordinate = coordinate;
        if(current.distance > previous.distance + 100 ||
          current.up > previous.up + 10 ||
          current.down > previous.down + 10) {
            var distance = (current.distance - previous.distance);
            var slope = ((current.up - previous.up) - (current.down - previous.down)) / distance;
            var speed = 6 * 0.77 * Math.exp( -3.5 * Math.abs(slope + 0.05) ) / 3.6
            var time = (distance / speed) / 60;
            current.time = previous.time + time;
            waypoints.push(current);
            dataset.data.push({x: current.distance / 1000.0, y:  current.coordinate[2] });
            previous = Object.assign({}, current);
          }
      }));

    const totalMinutes = current.time;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    document.getElementById("time").innerText = hours + " h " + String(minutes).padStart(2, '0');
    document.getElementById("distance").innerText = (Math.round(current.distance / 100.0) / 10).toLocaleString('de-CH');
    document.getElementById("up").innerText = Math.round(current.up).toLocaleString('de-CH');
    document.getElementById("down").innerText = Math.round(current.down).toLocaleString('de-CH');
    const gpxUrl = feature.get("gpxUrl");
    document.getElementById("gpx").href = gpxUrl;

    const roundedLowest = Math.floor(lowest / 100) * 100;
    const ratio = Math.max(
      1,
      Math.max(
        (highest-lowest) / elevationRange,
        (current.distance / 1000) / distanceRange
      )
    )

    options.scales = {
      x: {
        ticks: {
          stepSize: 2
        },
        min: 0,
        max: Math.ceil(distanceRange * ratio),
        grid: {
          color: ratio > 1 ? "#cc33cc80" : "rgba(0,0,0,0.1)"
        }
      },
      y: {
        ticks: {
          stepSize: 100
        },
        min: roundedLowest,
        max: roundedLowest + Math.ceil(elevationRange * ratio / 100) * 100,
        grid: {
          color: ratio > 1 ? "#cc33cc80" : "rgba(0,0,0,0.1)"
        }
      }
    };
    profile.update();
    window.location.hash = ":t:"+encodeURIComponent(name);
    var folder = gpxUrl.substring(0, gpxUrl.lastIndexOf('/')+1);
    if(trackContent[folder]) {
      document.getElementById("notes").innerHTML = trackContent[folder].notes;
    } else {
      fetch(folder+"/notes.md", response => {
        trackContent[folder] = trackContent[folder] || {};
        document.getElementById("notes").innerHTML = marked.parse(response.responseText);
      });
    }

    if(lastTrack != name || document.getElementById("images").innerHTML=='') {
      document.getElementById("images-button").style.display = "none";
      fetch(folder, response => {
        var list = JSON.parse(response.responseText);
        var images = list
          .map(item => item.name ? item.name : item)
          .filter(filename => {
            const ext = filename.split('.').pop().toLowerCase();
            return ext == "jpg" || ext == "jpeg";
          });
        if(images.length > 0) {
          document.getElementById("images-button").style.display = "inline";
          images.forEach(filename => {
              var elem = document.createElement("img");
              elem.setAttribute("src", folder+filename);
              elem.setAttribute("height", "100%");
              elem.classList.add("image");
              elem.addEventListener("click", ()=> toggleImageViewer() );
              document.getElementById("images").appendChild(elem);
          });
        }
        updateImageView();
      });
    } else {
      updateImageView();
    }
}

map.addInteraction(select);
select.on('select', function (e) {
  if(selectedLayer != null) {
    selectedLayer.setZIndex(0);
  }
  if(e.selected.length > 0) {
    const layer = select.getLayer(e.selected[0]);
    selectTrack(layer, e.selected[0]);
  } else {
    document.getElementById("detail-container").classList.remove("show-detail-container");
    document.getElementById("detail-container").classList.remove("expand-detail-container");
    document.getElementById("images-button").classList.remove("active-button");
    toggleImageViewer(true);
    window.location.hash = "";
  }
});