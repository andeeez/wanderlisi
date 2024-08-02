import { toLonLat } from 'https://cdn.skypack.dev/ol/proj.js';
import { getDistance } from 'https://cdn.skypack.dev/ol/sphere.js';

export default class Profile {

    dataset = {
        showLine: true,
        borderColor: '#cc11ccc0',
        pointStyle: false,
        data: [
            { x: 0, y: 10 },
            { x: 2.5, y: 20 },
            { x: 7, y: 15 }
        ]
    };

    elevationRange = 1000;
    distanceRange = 20;

    options = {
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
                max: this.distanceRange
            }
        },
        animations: {
            y: {
                duration: 1000,
                easing: 'easeOutBack'
            }
        }
    }

    profile = new Chart(
        document.getElementById('profile'),
        {
            type: 'scatter',
            options: this.options,
            data: {
                datasets: [
                    this.dataset
                ]
            }
        }
    );

    show(track) {
        var feature = track.features.main;
        var lines = feature.getGeometry().getCoordinates();
        const start = toLonLat(feature.getGeometry().getFirstCoordinate())
        var current = {
            distance: 0,
            up: 0,
            down: 0,
            time: 0,
            coordinate: start
        }
        var highest = 0;
        var lowest = 9999;
        var previous = Object.assign({}, current);
        var waypoints = [previous];
        this.dataset.data = [{ x: 0, y: current.coordinate[2] }];
        this.profile.update();
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
                if (current.distance > previous.distance + 100 ||
                    current.up > previous.up + 10 ||
                    current.down > previous.down + 10) {
                    var distance = (current.distance - previous.distance);
                    var slope = ((current.up - previous.up) - (current.down - previous.down)) / distance;
                    var speed = 6 * 0.77 * Math.exp(-3.5 * Math.abs(slope + 0.05)) / 3.6
                    var time = (distance / speed) / 60;
                    current.time = previous.time + time;
                    waypoints.push(current);
                    this.dataset.data.push({ x: current.distance / 1000.0, y: current.coordinate[2] });
                    previous = Object.assign({}, current);
                }
            }));

        const totalMinutes = current.time;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        document.getElementById("time").innerText = hours + " h " + String(minutes).padStart(2, '0');
        document.getElementById("distance").innerText = (Math.round(current.distance / 100.0) / 10).toLocaleString('de-CH').replace(".", ",");
        document.getElementById("up").innerText = Math.round(current.up).toLocaleString('de-CH');
        document.getElementById("down").innerText = Math.round(current.down).toLocaleString('de-CH');

        const roundedLowest = Math.floor(lowest / 100) * 100;
        const ratio = Math.max(
            1,
            Math.max(
                (highest - lowest) / this.elevationRange,
                (current.distance / 1000) / this.distanceRange
            )
        )

        this.options.scales = {
            x: {
                ticks: {
                    stepSize: 2
                },
                min: 0,
                max: Math.ceil(this.distanceRange * ratio),
                grid: {
                    color: ratio > 1 ? "#cc33cc80" : "rgba(0,0,0,0.1)"
                }
            },
            y: {
                ticks: {
                    stepSize: 100
                },
                min: roundedLowest,
                max: roundedLowest + Math.ceil(this.elevationRange * ratio / 100) * 100,
                grid: {
                    color: ratio > 1 ? "#cc33cc80" : "rgba(0,0,0,0.1)"
                }
            }
        };
        this.profile.update();
    }

}