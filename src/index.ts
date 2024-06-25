class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static zero(): Vector2 {
        return new Vector2(0, 0);
    }

    static one(): Vector2 {
        return new Vector2(1, 1);
    }

    static fromAngle(angle: number): Vector2 {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    add(that: Vector2): Vector2 {
        return new Vector2(this.x + that.x, this.y + that.y);
    }

    sub(that: Vector2): Vector2 {
        return new Vector2(this.x - that.x, this.y - that.y);
    }

    mul(that: Vector2): Vector2 {
        return new Vector2(this.x * that.x, this.y * that.y);
    }

    div(that: Vector2): Vector2 {
        if (that.x === 0 || that.y === 0) return this;
        return new Vector2(this.x / that.x, this.y / that.y);
    }

    scale(scalar: number): Vector2 {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    mod(that: Vector2): Vector2 {
        if (that.x === 0 || that.y === 0) return this;
        return new Vector2(this.x % that.x, this.y % that.y);
    }

    cb1(xFunc: (x: number) => number): Vector2 {
        return new Vector2(xFunc(this.x), xFunc(this.y));
    }

    cb2(xFunc: (x: number) => number, yFunc: (x: number) => number): Vector2 {
        return new Vector2(xFunc(this.x), yFunc(this.y));
    }

    array(): [number, number] {
        return [this.x, this.y];
    }

    toString(): string {
        return `[${this.x}, ${this.y}]`;
    }
}

class Rect {
    start: Vector2;
    end: Vector2;

    get size(): Vector2 {
        return this.end.sub(this.start);
    }
    get half(): Vector2 {
        return this.size.scale(0.5);
    }
    get center(): Vector2 {
        return this.start.add(this.half);
    }
    set center(value: Vector2) {
        const delta = this.center.sub(value);
        this.start = this.start.add(delta);
        this.end = this.end.add(delta);
    }

    constructor(start: Vector2, end: Vector2) {
        this.start = start;
        this.end = end;
    }

    static zero(): Rect {
        return new Rect(Vector2.zero(), Vector2.zero());
    }

    translate(delta: Vector2): Rect {
        const rect = new Rect(this.start, this.end);
        rect.center = rect.center.sub(delta);
        return rect;
    }

    array(): [number, number, number, number] {
        return [...this.start.array(), ...this.end.array()];
    }

    toString(): string {
        return `[${this.start.toString()}, ${this.end.toString()}] computed: [center: ${this.center.toString()}, size: ${this.size.toString()}]`;
    }
}

class VectorMap<T> {
    vectors: Array<Vector2>;
    values: Array<T>;

    constructor() {
        this.vectors = [];
        this.values = [];
    }

    set(key: Vector2, value: T) {
        this.delete(key);
        this.vectors.push(key);
        this.values.push(value);
    }

    has(key: Vector2): boolean {
        for (let v in this.vectors) {
            if (this.vectors[v].x === key.x && this.vectors[v].y === key.y) {
                return true;
            }
        }
        return false;
    }

    get(key: Vector2): T | undefined {
        for (let v in this.vectors) {
            if (this.vectors[v].x === key.x && this.vectors[v].y === key.y) {
                return this.values[v];
            }
        }
    }

    delete(key: Vector2): boolean {
        let found = -1;
        for (let i = 0; i < this.vectors.length; ++i) {
            if (this.vectors[i].x === key.x && this.vectors[i].y === key.y) {
                found = i;
            }
        }
        if (found != -1) {
            this.vectors.splice(found, 1);
            this.values.splice(found, 1);
            return true;
        }
        return false;
    }

    clear() {
        this.vectors = [];
        this.values = [];
    }

    *entries(): IterableIterator<[Vector2, T]> {
        for (let i = 0; i < this.vectors.length; ++i) {
            yield [this.vectors[i], this.values[i]];
        }
    }
}

type EventType = "grid_clicked" | "grid_down" | "grid_up";

class Engine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    get width(): number {
        return this.canvas.width;
    }
    set width(value: number) {
        this.canvas.width = value;
    }
    get height(): number {
        return this.canvas.height;
    }
    set height(value: number) {
        this.canvas.height = value;
    }

    tileSize: number;
    renderCb: () => void = () => {};

    camera: Rect;
    zoomLevel: number = 1;
    dragging = false;
    old_mouse_position = Vector2.zero();

    constructor(width: number, height: number, tileSize: number) {
        const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
        if (canvas === null) throw new Error("Canvas #canvas not found.");

        const ctx = canvas.getContext("2d");
        if (ctx === null) throw new Error("Cannot init 2d context.");

        this.canvas = canvas;
        this.ctx = ctx;

        this.resize(width, height);
        this.clear("#181818");

        this.tileSize = tileSize;
        this.camera = new Rect(Vector2.zero(), new Vector2(width, height));

        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button == 1) {
                this.dragging = true;
            }
        });
        this.canvas.addEventListener("mouseup", (e) => {
            if (e.button == 1) {
                this.dragging = false;
                this.old_mouse_position = Vector2.zero();
            }
        });
        this.canvas.addEventListener("mousemove", (e) => {
            if (this.dragging) {
                const mouse_position = new Vector2(e.clientX, e.clientY);
                if (this.old_mouse_position.x !== 0 || this.old_mouse_position.y !== 0) {
                    this.camera.center = this.camera.center.add(mouse_position.sub(this.old_mouse_position));
                }
                this.old_mouse_position = mouse_position;
                this.update();
            }
        });
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.tileSize -= Math.sign(e.deltaY);
            this.update();
        });
    }

    _clientToGrid(x: number, y: number): Vector2 {
        const clientPosition = new Vector2(x, y);
        const canvasPosition = this.canvas.getBoundingClientRect();
        const screenPosition = clientPosition.sub(new Vector2(canvasPosition.x, canvasPosition.y));
        const gridPosition = this.toCamera(screenPosition).div(new Vector2(this.tileSize, this.tileSize)).cb1(Math.floor);
        return gridPosition;
    }

    setRenderCallback(cb: () => void) {
        this.renderCb = cb;
    }

    setEventCallback(name: EventType, cb: any) {
        switch (name) {
            case "grid_clicked":
                this.canvas.addEventListener("click", (e) => {
                    e.preventDefault();
                    cb(e.button, this._clientToGrid(e.clientX, e.clientY));
                });
                break;
            case "grid_down":
                this.canvas.addEventListener("mousedown", (e) => {
                    // e.preventDefault();
                    cb(e.button, this._clientToGrid(e.clientX, e.clientY));
                });
                break;
            case "grid_up":
                this.canvas.addEventListener("mouseup", (e) => {
                    // e.preventDefault();
                    cb(e.button, this._clientToGrid(e.clientX, e.clientY));
                });
        }
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    clear(color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    toScreen(p: Vector2): Vector2 {
        return p.sub(this.camera.center).add(this.camera.size.scale(0.5));
    }

    toCamera(p: Vector2): Vector2 {
        return p.add(this.camera.center).sub(this.camera.size.scale(0.5));
    }

    drawText(text: string, position: Vector2, size: number, color: string) {
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        this.ctx.font = `${size}px monospace`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, ...position.array());
    }

    drawCircle(position: Vector2, radius: number, color: string) {
        this._drawCircle(this.toScreen(position), radius, color);
    }
    _drawCircle(position: Vector2, radius: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLine(start: Vector2, end: Vector2, color: string) {
        this._drawLine(this.toScreen(start), this.toScreen(end), color);
    }
    _drawLine(start: Vector2, end: Vector2, color: string) {
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(...start.array());
        this.ctx.lineTo(...end.array());
        this.ctx.stroke();
    }

    drawRect(position: Vector2, size: Vector2, color: string) {
        this._drawRect(this.toScreen(position), size, color);
    }
    _drawRect(position: Vector2, size: Vector2, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.fillRect(...position.array(), ...size.array());
        this.ctx.fill();
    }

    drawGrid() {
        const tile = new Vector2(this.tileSize, this.tileSize);
        const grid = this.camera.size.div(tile).cb1(Math.ceil);
        const grid_offset = this.camera.size.scale(0.5).mod(tile);

        for (let y = 0; y < grid.y + 1; ++y) {
            const offset = y * this.tileSize + (-this.camera.center.y % this.tileSize) + grid_offset.y;
            this._drawLine(new Vector2(0, offset), new Vector2(grid.x * this.tileSize, offset), "#000000");
        }
        for (let x = 0; x < grid.x + 1; ++x) {
            const offset = x * this.tileSize + (-this.camera.center.x % this.tileSize) + grid_offset.x;
            this._drawLine(new Vector2(offset, 0), new Vector2(offset, grid.y * this.tileSize), "#000000");
        }
    }

    update() {
        this.render();
    }

    render() {
        this.clear("#181818");
        this.drawGrid();

        this.renderCb();

        // this.drawText(`camera: ${this.camera.toString()}`, new Vector2(10, 10), 14, "#FFFFFF");
    }
}

/*
 **  PALETTE
 */
function createPaletteItem(app: App, palette: HTMLDivElement, character: string = "#", baseColor: string = "#FF00FF") {
    // PALETTE ITEM
    const paletteItem = document.createElement("div");
    paletteItem.className = "flex h-full";

    // TEXT INPUT
    const text = document.createElement("input");
    text.type = "text";
    text.placeholder = "#";
    text.textContent = character;
    text.className = "w-6 text-center";
    text.maxLength = 1;

    // RADIO INPUT
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "palette";
    radio.value = `${app.paletteItemIdx}`;
    radio.className = "w-8 h-full";
    radio.addEventListener("change", (e) => {
        setActivePaletteItem(app, Number(radio.value));
    });

    // COLOR INPUT
    const color = document.createElement("input");
    color.type = "color";
    color.className = "h-full";
    color.value = baseColor;
    color.addEventListener("change", (e) => {
        radio.click();
        engine.update();
    });

    // TREE
    paletteItem.appendChild(text);
    paletteItem.appendChild(color);
    paletteItem.appendChild(radio);

    app.paletteItemIdx += 1;

    palette.appendChild(paletteItem);

    // auto select new palette item
    radio.click();
}
function getColor(app: App, index: number): string | undefined {
    const color = app.palette.childNodes[index].childNodes[1];
    if (color instanceof HTMLInputElement && color.type === "color") {
        return color.value;
    }
}

function getText(app: App, index: number): string | undefined {
    const text = app.palette.childNodes[index].childNodes[0];
    if (text instanceof HTMLInputElement && text.type === "text") {
        return text.value;
    }
}

function setActivePaletteItem(app: App, paletteIdx: number) {
    app.currentPaletteIdx = paletteIdx;
}

// return a Rect that contain all tiles drawn
function computeWorldRect(app: App): Rect | undefined {
    let worldRect: Rect | undefined = undefined;
    for (let [pos, _] of app.world.entries()) {
        if (!worldRect) {
            worldRect = new Rect(pos, pos);
        } else {
            if (pos.x < worldRect.start.x) worldRect.start = new Vector2(pos.x, worldRect.start.y);
            if (pos.x > worldRect.end.x) worldRect.end = new Vector2(pos.x, worldRect.end.y);
            if (pos.y < worldRect.start.y) worldRect.start = new Vector2(worldRect.start.x, pos.y);
            if (pos.y > worldRect.end.y) worldRect.end = new Vector2(worldRect.end.x, pos.y);
        }
    }
    if (!worldRect) return undefined;
    worldRect.end = worldRect.end.add(Vector2.one());
    return worldRect;
}

interface App {
    world: VectorMap<number>;
    palette: HTMLDivElement;
    currentPaletteIdx: number;
    paletteItemIdx: number;
}

/*
 ** CONSTANTS
 */
const factor = 96;
const width = 16 * factor;
const height = 9 * factor;
const tileSize = 64;

const engine = new Engine(width, height, tileSize);

(() => {
    /*
     ** HTML
     */
    const addBtn: HTMLButtonElement | null = document.querySelector("#add");
    const importBtn: HTMLButtonElement | null = document.querySelector("#import");
    const exportBtn: HTMLButtonElement | null = document.querySelector("#export");
    const palette: HTMLDivElement | null = document.querySelector("#palette");
    const filename: HTMLInputElement | null = document.querySelector("#filename");

    if (!importBtn || !addBtn || !palette || !exportBtn || !filename) throw new Error("no toolbar found");

    /*
     ** VARS
     */
    const app: App = {
        world: new VectorMap(),
        palette: palette,
        currentPaletteIdx: -1,
        paletteItemIdx: 0,
    };

    engine.setRenderCallback(() => {
        for (let [position, index] of app.world.entries()) {
            const color = getColor(app, index);
            if (!color) continue;
            engine.drawRect(position.scale(engine.tileSize), new Vector2(engine.tileSize, engine.tileSize), color);
        }
    });

    /*
     ** EVENTS
     */
    importBtn.addEventListener("click", (e) => {
        const inputFile: HTMLInputElement = document.createElement("input");
        inputFile.type = "file";
        inputFile.addEventListener("change", async (_) => {
            if (inputFile.files && inputFile.files.length == 1) {
                // const palette = [];
                app.currentPaletteIdx = 0;
                app.world.clear();
                // recenter camera

                const text = await inputFile.files[0].text();
                const rows = text.split("\n");
                for (let y = 0; y < rows.length; ++y) {
                    const row = rows[y];
                    for (let x = 0; x < row.length; ++x) {
                        const character = row.charAt(x);
                        if (character !== " ") {
                            // if not in palette
                            // // add to palette
                            // get palette idx for this character
                            // app.world.set(new Vector2(x, y), paletteIdx);
                        }
                    }
                }
            }
        });
        inputFile.click();
    });
    exportBtn.addEventListener("click", (e) => {
        let worldRect = computeWorldRect(app);
        if (!worldRect) throw new Error("Couldn't compute world data");
        let output = "";
        for (let y = 0; y < worldRect.size.y; ++y) {
            for (let x = 0; x < worldRect.size.x; ++x) {
                const position = worldRect.start.add(new Vector2(x, y));
                const tile = app.world.get(position);
                if (tile !== undefined) {
                    const character = getText(app, tile);
                    output += character;
                } else {
                    output += " ";
                }
            }
            output += "\n";
        }
        // console.log(output);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new File([output], "export.txt", { type: "octet/stream" }));
        a.setAttribute("download", filename.value || "export.txt");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    addBtn.addEventListener("click", (_) => createPaletteItem(app, palette));

    engine.setEventCallback("grid_down", (button: number, position: Vector2) => {
        switch (button) {
            case 0: // left click
                if (app.currentPaletteIdx != -1) {
                    console.log(`click at ${position.toString()}`);
                    app.world.set(position, app.currentPaletteIdx);
                }
                break;
            case 1: // middle click
                break;
            case 2: // right click
                if (!app.world.delete(position)) {
                    console.log(`Nothing to delete ! ${position.toString()}`);
                }
                break;
        }
        engine.update();
    });

    createPaletteItem(app, palette, "#", "#9912aa");
    engine.update();
})();
