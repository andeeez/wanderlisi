export default class Menu {

    open = false;
    callback = null;

    constructor(callback) {
        this.callback = callback;
        document.getElementById("menu-button").addEventListener("click", () => this.menuClicked());
        fetch("data/plans", response => {
            JSON.parse(response.responseText).forEach(entry => {
                var name = entry.name || entry;
                if (name.endsWith(".md")) {
                    var url = "data/plans/" + name;
                    fetch(url, response => {
                        var title = response.responseText.split('\n')
                            .filter(line => /^#\s*.*/.test(line))
                            .map(line => line.split("#")[1])
                            .filter(line => line.length > 0)
                            .map(line => line.trim())[0];

                        const menu = document.getElementById("menu");
                        const div = document.createElement("div");
                        div.classList.add("title");
                        div.classList.add("item");
                        const text = document.createTextNode(title);
                        div.appendChild(text);
                        div.addEventListener("click", () => this.select(url));
                        menu.appendChild(div);
                    })
                }
            });
        }, true);
    }

    select(url) {
        this.callback(url);
    }

    close() {
        this.open = false;
        document.getElementById("menu").classList.remove("menu-open");
        document.getElementById("menu-button").classList.remove("active");
    }

    menuClicked() {
        if (this.open = !this.open) {
            document.getElementById("menu").classList.add("menu-open");
            document.getElementById("menu-button").classList.add("active");
        } else {
            this.close();
        }
    }
}