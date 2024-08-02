export default class Note {

    load(folder, callback) {
        fetch(folder + "/notes.md", response => {
            trackContent[folder].notes = marked.parse(response.responseText);
            var values = response.responseText.split('\n')
                .filter(line => /^\s*-/.test(line))
                .filter(line => line.indexOf(":") > 0)
                .map(line => line.split(":")[1])
                .filter(line => line.length > 0)
                .map(line => line.trim()[0])
                .map(line => line.toLowerCase())
            if (values.length >= 2) {
                trackContent[folder].done = (values[0] != "n") * 1 + (values[1] != "n") * 2;
                callback
            }
        }, true);
    }
}