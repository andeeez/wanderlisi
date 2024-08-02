function fetch(url, callback, noCache) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            callback(this);
        }
    };
    xmlhttp.open("GET", url, true);
    if (noCache) {
        xmlhttp.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
    }
    xmlhttp.send();
}