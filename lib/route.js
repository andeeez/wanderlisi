import openrouteService from 'https://cdn.jsdelivr.net/npm/openrouteservice-js@0.4.1/+esm'

const api_key = "5b3ce3597851110001cf62483fba1cfd846c49a386708e71503a4c1e";

export default class Route {

    calculate(from, to, callback) {
        this.calculateRoute(from, to).then(callback);
    }

    async calculateRoute(from, to) {
        const Directions = new openrouteService.Directions({ api_key });
        const Geocode = new openrouteService.Geocode({ api_key });
        let startLocation = await Geocode.geocode({
            text: from,
            boundary_country: ["CH"]
        })
        let endLocation = await Geocode.geocode({
            text: to,
            boundary_country: ["CH"]
        })
        var startCoordinates = startLocation.features[0].geometry.coordinates;
        var endCoordinates = endLocation.features[0].geometry.coordinates;

        let response = await Directions.calculate({
            coordinates: [startLocation.features[0].geometry.coordinates, endLocation.features[0].geometry.coordinates],
            profile: 'driving-car'
        });

        console.log(response)
        return {
            "start": {
                "name": startLocation.features[0].properties.label,
                "coordinates": startCoordinates
            },
            "end": {
                "name": endLocation.features[0].properties.label,
                "coordinates": endCoordinates
            },
            "distance": Math.round(response.routes[0].summary.distance / 1000),
            "duration": Math.round(response.routes[0].summary.duration / 60)
        }
    }
}