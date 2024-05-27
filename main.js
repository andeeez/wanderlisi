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
import { fromLonLat } from 'https://cdn.skypack.dev/ol/proj.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'https://cdn.skypack.dev/ol/style.js';
import GPX from 'https://cdn.skypack.dev/ol/format/GPX.js';
import tracks from './tracks/' with { type: 'json' };

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
    center: fromLonLat([7.6, 46.92]),
    zoom: 8.5,
  }),
});

const center = map.getView().getCenter();
const startPinSource = new VectorSource ();
const endPinSource = new VectorSource ();
const processedLayers =  []

tracks.forEach(track => {
  if(track.name) {
    track = track.name
  }
  var layer = new VectorLayer({
    source: new VectorSource({
      url: 'tracks/'+track,
      format: new GPX(),
    }),
    style: new Style({
      stroke: new Stroke({
        color: '#cc11ccc0',
        width: 8
      })
    })
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

const startStyle = new Style({
    image: new CircleStyle({
      fill: new Fill({
        color: '#cc11cca0',
      }),
      radius: 5,
      stroke: new Stroke({
        color: '#ffffff',
        width: 2,
      }),
    })
  });

const endStyle = new Style({
    image: new CircleStyle({
      fill: new Fill({
        color: '#ccccccc0',
      }),
      radius: 5,
      stroke: new Stroke({
        color: '#ffffff',
        width: 2,
      }),
    })
  });

const startPinLayer = new VectorLayer ({
  source: startPinSource,
  style: startStyle
});

const endPinLayer = new VectorLayer ({
  source: endPinSource,
  style: endStyle
});

map.addLayer (endPinLayer);
map.addLayer (startPinLayer);