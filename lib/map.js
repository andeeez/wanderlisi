import Map from 'https://cdn.skypack.dev/ol/Map.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import Feature from 'https://cdn.skypack.dev/ol/Feature.js';
import Point from 'https://cdn.skypack.dev/ol/geom/Point.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import VectorLayer from 'https://cdn.skypack.dev/ol/layer/Vector.js';
import VectorSource from 'https://cdn.skypack.dev/ol/source/Vector.js';
import XYZ from 'https://cdn.skypack.dev/ol/source/XYZ.js';
import TileWMS from 'https://cdn.skypack.dev/ol/source/TileWMS.js';
import TileGrid from "https://cdn.skypack.dev/ol/tilegrid/TileGrid";
import { fromLonLat, toLonLat } from 'https://cdn.skypack.dev/ol/proj.js';
import { getDistance } from 'https://cdn.skypack.dev/ol/sphere.js';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'https://cdn.skypack.dev/ol/style.js';
import Select from 'https://cdn.skypack.dev/ol/interaction/Select.js';
import { click } from 'https://cdn.skypack.dev/ol/events/condition.js';

import GPX from 'https://cdn.skypack.dev/ol/format/GPX.js';

const WMS_TILE_SIZE = 512;
const TILEGRID_ORIGIN = [2420000, 1350000];
const VIEW_EXTENT = [640000, 5660000, 1200000, 6190000];
const TILEGRID_RESOLUTIONS = [
    4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50,
    20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.1];

export default class TrackMap {

    processedLayers = []
    options = {};

    gpxFormat = new GPX();
    startPinSource = new VectorSource();
    endPinSource = new VectorSource();

    view = new View({
        extent: VIEW_EXTENT,
        minZoom: 7,
        maxZoom: 18,
        enableRotation: false,
        center: fromLonLat([7.6, 46.92]),
        zoom: 8.5,
    });

    select = new Select({
        condition: click,
        style: function(feature) {
            const isDone = feature.get("done");
            return new Style({
                stroke: new Stroke({
                    color: isDone ? '#1ac31ac0' : '#ff44ffc0',
                    width: 8
                })
            });
        },
        hitTolerance: 10,
        filter: function (feature) {
            return feature.getGeometry().getType() == "MultiLineString";
        }
    });
    selectedLayer = null;

    constructor(element, options) {
        this.map = new Map({
            target: element,
            layers: [[5, 5, 13], [10.5, 12, 14], [11.5, 13, 15], [12.6, 14, 16], [13.6, 15, 17], [14.6, 16, 28], [15.8, 18, 28]].map(z =>
                new TileLayer({
                    extent: [640000, 5660000, 1200000, 6190000],
                    preload: Infinity,
                    minZoom: z[0],
                    source: new XYZ({
                        minZoom: z[1],
                        maxZoom: z[2],
                        zDirection: -1,
                        url: z[0] < 11 ? `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg` :
                            `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg`
                    })
                })).concat([
                    new TileLayer({
                        opacity: 0.8,
                        minZoom: 11.5,
                        source: new TileWMS({
                            url: `https://wms0.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=ch.astra.wanderland-sperrungen_umleitungen&LANG=en`,
                            gutter: 120,
                            tileGrid: new TileGrid({
                                projection: "EPSG:2056",
                                tileSize: WMS_TILE_SIZE,
                                origin: TILEGRID_ORIGIN,
                                resolutions: TILEGRID_RESOLUTIONS
                            })
                        })
                    }),
                    new VectorLayer({
                        source: this.startPinSource,
                        style: new Style({
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
                        }),
                        zIndex: 4
                    }),
                    new VectorLayer({
                        source: this.endPinSource,
                        style: new Style({
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
                        }),
                        zIndex: 2
                    })
                ]),
            view: this.view,
            controls: []
        });

        this.options = options;
        this.map.on('pointermove', e => {
            var pixel = this.map.getEventPixel(e.originalEvent);
            var hit = this.map.hasFeatureAtPixel(pixel);
            this.map.getViewport().style.cursor = hit ? 'pointer' : '';
        });

        const format = this.gpxFormat;
        const readFeatures_ = format.readFeatures;
        format.readFeatures = function (source) {
            const meta = format.readMetadata(source);
            const features = readFeatures_.apply(this, arguments);
            if (meta && meta.name) {
                features.forEach(feature => {
                    if (feature.getGeometry().getType() == "MultiLineString") {
                        feature.set("name", meta.name);
                    }
                })
            }
            return features;
        }

        this.map.addInteraction(this.select);
        this.select.on('select', e => {
            this.selectedLayer && this.selectedLayer.setZIndex(0);
            if (e.selected.length > 0) {
                const layer = this.select.getLayer(e.selected[0]);
                this.selectTrack(layer, e.selected[0]);
            } else {
                this.options.onSelect && this.options.onSelect(null);
                this.selectNone();
            }
        });
    }

    addTrack(featureUrl, visible, callback) {
        const source = new VectorSource({
            url: featureUrl,
            format: this.gpxFormat,
        });
        source.on("addfeature", e => {
            const featureUrl = e.target.getUrl();
            e.feature.set("featureUrl", featureUrl);
        });
        const layer = new VectorLayer({
            source: source,
            style: new Style(),
            zIndex: 0
        })

        layer.on("postrender",
            event => {
                const layer = event.target
                if (this.processedLayers.indexOf(layer) == -1) {
                    const features = layer.getSource().getFeatures();
                    features.forEach(feature => {
                        const type = feature.getGeometry().getType();
                        if (this.processedLayers.indexOf(layer) == -1 && (type == "LineString" ||
                            type == "MultiLineString")) {
                            this.processedLayers.push(layer);
                            const start = new Feature(new Point(feature.getGeometry().getFirstCoordinate()));
                            const end = new Feature(new Point(feature.getGeometry().getLastCoordinate()));
                            if (!visible) {
                                start.setStyle(new Style());
                                end.setStyle(new Style());
                                layer.setStyle(new Style({
                                    stroke: new Stroke({
                                        color: '#bb11bba0',
                                        width: 8
                                    })
                                }));
                            }
                            this.startPinSource.addFeature(start);
                            this.endPinSource.addFeature(end);
                            const featureUrl = feature.get("featureUrl");
                            const trackData = {
                                name: feature.get("name"),
                                features: { main: feature, start, end },
                                start: toLonLat(feature.getGeometry().getFirstCoordinate())
                            };
                            callback && callback(featureUrl, trackData);
                            // Set done status after callback to ensure track data is updated
                            if (this.options.trackList) {
                                const track = this.options.trackList.get(featureUrl);
                                if (track) {
                                    feature.set("done", track.done);
                                }
                            }
                            if (feature.get("name") == this.options.selectedTrack) {
                                this.selectTrack(layer, feature);
                                this.view.fit(feature.getGeometry(), { maxZoom: 12 });
                                this.select.getFeatures().push(feature);
                            }
                        }
                    });
                }
            });
        this.map.addLayer(layer);
    }

    selectNone() {
        this.select.getFeatures().clear();
    }

    selectTrack(layer, feature) {
        layer.setZIndex(1);
        this.selectedLayer = layer;
        this.options.onSelect && this.options.onSelect(feature.get("featureUrl"));
    }

    show(track, color) {
        if (color) {
            // Color main feature and pins (pins: white fill, colored stroke)
            Object.entries(track.features).forEach(([key, feature]) => {
                if (key === 'main') {
                    feature.setStyle(new Style({
                        stroke: new Stroke({
                            color: color,
                            width: 8
                        })
                    }));
                } else {
                    // Pins: white fill with original transparency, colored stroke
                    feature.setStyle(new Style({
                        image: new CircleStyle({
                            fill: new Fill({ color: key === 'start' ? '#ffffff' : '#ffffffa0' }),
                            radius: 5,
                            stroke: new Stroke({ color: color, width: 2 })
                        })
                    }));
                }
            });
        } else {
            Object.values(track.features).forEach(feature => feature.setStyle(null));
        }
    }

    hide(track) {
        Object.values(track.features).forEach(feature => feature.setStyle(new Style()));
    }

}
