export default class Metadata {
    load(track, callback) {
        fetch(track.folder() + "/metadata.json", response => {
            const metadata = JSON.parse(response.responseText)
            callback({ metadata })
        });
    }
}