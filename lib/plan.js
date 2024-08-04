export default class Plan {

    callback = null;

    constructor(callback) {
        this.callback = callback;
        document.getElementById("close-button").addEventListener("click", () => this.close());
    }

    list(listCallback) {
        fetch("data/plans", response => {
            JSON.parse(response.responseText).forEach(entry => {
                var name = entry.name || entry;
                if (name.endsWith(".md")) {
                    name = name.replace(/\.md$/, "")
                    this.load(name, title => listCallback(name, title));
                }
            });
        }, true);
    }

    load(name, loadCallback) {
        var url = "data/plans/" + name + ".md";
        fetch(url, response => {
            var title = response.responseText.split('\n')
                .filter(line => /^#\s*.*/.test(line))
                .map(line => line.split("#")[1])
                .filter(line => line.length > 0)
                .map(line => line.trim())[0];

            loadCallback(title, response.responseText);
        });
    }

    show(name, sliding) {
        if(sliding) {
            document.getElementById("plan-container").classList.add("plan-container-sliding");
        }
        this.load(name, (title, content) => {
            document.getElementById("plan-container").classList.add("plan-container-open");
            this.callback(name, title);
            var rendered = marked.parse(content);
            document.getElementById("plan").innerHTML = rendered;
            setTimeout(() => document.getElementById("plan-container").classList.add("plan-container-sliding"), 1);
        })
    }

    close() {
        document.getElementById("plan-container").classList.remove("plan-container-open");
        this.callback();
    }

}