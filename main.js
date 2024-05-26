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
    /*new TileLayer({
      source: new OSM({
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
      })
    }),*/
    new TileLayer({
      source: new XYZ({
        url: `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg`
      })
    }),
    new VectorLayer({
      source: new VectorSource({
        url: 'tracks/'+tracks[0].name,
        format: new GPX(),
      }),
      style: new Style({
        stroke: new Stroke({
          color: '#cc11cc',
          width: 8
        })
      })
    })
  ],
  view: new View({

    center: fromLonLat([7.12, 46.92]),
    zoom: 11,
  }),
});

map.on('postcompose', function (e) {
  //document.querySelector('canvas').style.filter = "grayscale(30%) contrast(60%)";
});

var lineStyle =
{
  "2021": [
    new Style({
      stroke: new Stroke({
        color: '#cc11cc60',
        width: 3
      })
    })
  ],
  "2022": [
    new Style({
      stroke: new Stroke({
        color: '#cc11cc60',
        width: 3
      })
    })
  ],
  "2023": [
    new Style({
      stroke: new Stroke({
        color: '#11ddcc60',
        width: 3
      })
    }),
  ],
  "2024": [
    new Style({
      stroke: new Stroke({
        color: '#cc771160',
        width: 3
      })
    }),
  ]
};

var data=[]
data.forEach(trip => {
  if (!trip.from.location.coordinates.y || !trip.to.location.coordinates.y) {
    return
  }
  var line = new Vector({
    source: new SourceVector({
      features: [new Feature({
        geometry: new LineString([
          fromLonLat([trip.from.location.coordinates.y, trip.from.location.coordinates.x]),
          fromLonLat([trip.to.location.coordinates.y, trip.to.location.coordinates.x])]),
        name: 'Line',
      })]
    })
  });

  line.setStyle(lineStyle[trip.month.split("-")[0]]);
  map.addLayer(line);
});