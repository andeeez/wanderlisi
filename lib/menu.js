export default class Menu {

    open = false;
    openCallback = null;
    selectCallback = null;

    constructor(plan, openCallback, selectCallback) {
        this.openCallback = openCallback;
        this.selectCallback = selectCallback;
        document.getElementById("menu-button").addEventListener("click", e => this.menuClicked());
        document.addEventListener("mousedown", () => this.close());
        document.getElementById("menu-button").addEventListener("mousedown", e => {
            e.stopPropagation();
        });
        document.getElementById("menu").addEventListener("mousedown", e => {
            e.stopPropagation();
        });
        plan.list( (name, title) => {
            const menu = document.getElementById("menu");
            const div = document.createElement("div");
            div.classList.add("title");
            div.classList.add("menu-item");
            const text = document.createTextNode(title);
            div.appendChild(text);
            div.addEventListener("click", () => this.select(name));
            menu.appendChild(div);
        })
        document.getElementById("menu-button").style.display = "block"
    }

    select(name) {
        this.close();
        this.selectCallback(name);
    }

    close() {
        this.open = false;
        document.getElementById("menu").classList.remove("menu-open");
        document.getElementById("menu-button").classList.remove("active");
        this.openCallback(false);
    }

    menuClicked() {
        if (this.open = !this.open) {
            document.getElementById("menu").classList.add("menu-open");
            document.getElementById("menu-button").classList.add("active");
            this.openCallback(true);
        } else {
            this.close();
        }
    }
}