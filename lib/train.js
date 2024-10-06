export default class Train {

    baseUrl = "https://transport.opendata.ch/v1/connections"

    calculate(from, to, date, arrivalTime, callback) {

        const url = this.baseUrl
            + "?from=" + encodeURIComponent(from)
            + "&to=" + encodeURIComponent(to)
            + "&date=" + encodeURI(date)
            + "&time=" + encodeURI(arrivalTime)
            + "&isArrivalTime=1"
            + "&limit=1";

        console.log(url)

        return fetchUrl(url, response => {
            const data = JSON.parse(response.responseText);
            const travel = data.connections[0];
            const result = {};
            if(travel) {
                result.duration = moment.duration(travel.duration.replace("00d", "")).asMinutes();
                result.start = {
                    name: travel.from.location.name,
                    time: moment(travel.from.departure).format("HH:mm")
                }
                if(travel.from.location.id) {
                    result.start.coordinates = [travel.from.location.coordinate.y, travel.from.location.coordinate.x]
                }
                result.end = {
                    name: travel.to.location.name,
                    time: moment(travel.to.arrival).format("HH:mm")
                }
                if (travel.to.location.id) {
                    result.end.coordinates = [travel.to.location.coordinate.y, travel.to.location.coordinate.x]
                }
            } else {
                result.duration = 0;
            }
            callback(result);
        }, false, () => callback({duration: 0}));
    }
}