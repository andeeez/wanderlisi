import Map from 'https://cdn.skypack.dev/ol/Map.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import Feature from 'https://cdn.skypack.dev/ol/Feature.js';
import LineString from 'https://cdn.skypack.dev/ol/geom/LineString.js';
import Point from 'https://cdn.skypack.dev/ol/geom/Point.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import VectorLayer from 'https://cdn.skypack.dev/ol/layer/Vector.js';
import VectorSource from 'https://cdn.skypack.dev/ol/source/Vector.js';
import OSM from 'https://cdn.skypack.dev/ol/source/OSM.js';
import XYZ from 'https://cdn.skypack.dev/ol/source/XYZ.js';
import {fromLonLat, toLonLat} from 'https://cdn.skypack.dev/ol/proj.js';
import {getDistance} from 'https://cdn.skypack.dev/ol/sphere.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'https://cdn.skypack.dev/ol/style.js';

import Select from 'https://cdn.skypack.dev/ol/interaction/Select.js';
import {click} from 'https://cdn.skypack.dev/ol/events/condition.js';

import GPX from 'https://cdn.skypack.dev/ol/format/GPX.js';
import tracks from './tracks/' with { type: 'json' };

// Map Config

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new XYZ({
        url: `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg`
      })
    })
  ],
  view: new View({
    minZoom: 7,
    maxZoom: 17,
    enableRotation: false,
    center: fromLonLat([7.6, 46.92]),
    zoom: 8.5,
  }),
});

const center = map.getView().getCenter();
const startPinSource = new VectorSource ();
const endPinSource = new VectorSource ();
const processedLayers =  []

// Load Tracks

var trackIndex = 0;
const format = new GPX();
const readFeatures_ = format.readFeatures;
format.readFeatures = function(source, options) {
  const meta = format.readMetadata(source);
  const features = readFeatures_.apply(this, arguments);
  if(meta && meta.name) {
    features.forEach(feature => {
      if(feature.getGeometry().getType() == "MultiLineString") {
        feature.set("name", meta.name);
        var track = tracks[trackIndex++];
        if(track.name) {
          track = track.name
        }
        feature.set("gpxUrl", "tracks/"+track);
      }
    })
  }
  return features;
}

tracks.forEach(track => {
  if(track.name) {
    track = track.name
  }

  const source = new VectorSource({
      url: 'tracks/'+track,
      format: format,
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

const profile = new Chart(
  document.getElementById('profile'),
  {
    type: 'scatter',
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      animations: {
        radius: {
          duration: 200,
          easing: 'linear',
          loop: (context) => context.active
        }
      },
    },
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

var selected = null;

map.addInteraction(select);
select.on('select', function (e) {
  if(selected != null) {
    selected.setZIndex(0);
  }
  if(e.selected.length > 0) {
    const layer = select.getLayer(e.selected[0]);
    layer.setZIndex(1);
    const name = e.selected[0].get("name");
    selected = layer;
    document.getElementById("detail").style.display = "block";
    document.getElementById("trackName").innerText = name;
    var lines = e.selected[0].getGeometry().getCoordinates();
    var current = {
      distance: 0,
      up: 0,
      down: 0,
      time: 0,
      coordinate: toLonLat(e.selected[0].getGeometry().getFirstCoordinate())
    }
    var previous = Object.assign({}, current);
    var waypoints = [previous];
    dataset.data = [ {x: 0, y: current.coordinate[2] } ];
    profile.update();
    lines.forEach(
      line => line.forEach(point => {
        const coordinate = toLonLat(point);
        current.distance += getDistance(current.coordinate, coordinate);
        const delta = coordinate[2] - current.coordinate[2];
        current.up += delta > 0 ? delta : 0;
        current.down += delta < 0 ? -delta : 0;
        current.coordinate = coordinate;
        if(current.distance > previous.distance + 100 ||
          current.up > previous.up + 10 ||
          current.down > previous.down + 10) {
            var distance = (current.distance - previous.distance);
            var slope = 100 * ((current.up - previous.up) - (current.down - previous.down)) / distance;
            var speed = 0.11 + .67 * Math.exp( (-(slope + 2)^2) / 1800);
            var time = (distance / speed) / 60;
            console.log(distance, slope, speed * 3.6, time)
            current.time = previous.time + time;
            waypoints.push(current);
            dataset.data.push({x: current.distance / 1000.0, y:  current.coordinate[2] });
            previous = Object.assign({}, current);
          }
      }));
    const minutesDistance = 60 * (current.distance / 1000.0) / 4.5
    const minutesUp = 60 * current.up / 400.0;
    const minutesDown = 0; //60 * current.down / 1000.0;
    const minutesVertical = minutesUp < minutesDown ? minutesDown + minutesUp / 2 : minutesUp + minutesDown / 2;
    const totalMinutes = current.time; //minutesDistance + minutesVertical;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    document.getElementById("time").innerText = hours + "h" + String(minutes).padStart(2, '0')+"'";
    document.getElementById("distance").innerText = Math.round(current.distance / 100.0) / 10;
    document.getElementById("up").innerText = Math.round(current.up);
    document.getElementById("down").innerText = Math.round(current.down);
    const gpxUrl = e.selected[0].get("gpxUrl");
    document.getElementById("gpx").href = gpxUrl;
    profile.update();
  } else {
    document.getElementById("detail").style.display = "none";
  }
});