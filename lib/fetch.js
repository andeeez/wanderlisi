function fetchUrl(url, callback, noCache, error) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            if(this.status == 200) {
                callback(this);
            } else {
                console.log(this.statusText)
                if(error) {
                    error(this.statusText);
                }
            }
        }
    };
    xmlhttp.open("GET", url, true);
    if (noCache) {
        xmlhttp.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
    }
    xmlhttp.send();
}