import Map from 'https://cdn.skypack.dev/ol/Map.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import Feature from 'https://cdn.skypack.dev/ol/Feature.js';
import LineString from 'https://cdn.skypack.dev/ol/geom/LineString.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import VectorLayer from 'https://cdn.skypack.dev/ol/layer/Vector.js';
import VectorSource from 'https://cdn.skypack.dev/ol/source/Vector.js';
import OSM from 'https://cdn.skypack.dev/ol/source/OSM.js';
import XYZ from 'https://cdn.skypack.dev/ol/source/XYZ.js';
import { fromLonLat } from 'https://cdn.skypack.dev/ol/proj.js';
import Style from 'https://cdn.skypack.dev/ol/style/Style.js';
import Stroke from 'https://cdn.skypack.dev/ol/style/Stroke.js';
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

tracks.forEach(track => {
  if(track.name) {
    track = track.name
  }
  map.addLayer(
    new VectorLayer({
      source: new VectorSource({
        url: 'tracks/'+track,
        format: new GPX(),
      }),
      style: new Style({
        stroke: new Stroke({
          color: '#cc11cc',
          width: 8
        })
      })
    })
  )});