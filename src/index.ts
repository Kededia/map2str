type numberCB = (arg1: number) => number;

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

    cb(xFunc: numberCB, yFunc: numberCB): Vector2 {
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
    camera: Rect;

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
    }

    _clientToGrid(x: number, y: number): Vector2 {
        const clientPosition = new Vector2(x, y);
        const canvasPosition = this.canvas.getBoundingClientRect();
        const screenPosition = clientPosition.sub(new Vector2(canvasPosition.x, canvasPosition.y));
        const gridPosition = this.toCamera(screenPosition).div(new Vector2(this.tileSize, this.tileSize)).cb(Math.floor, Math.floor);
        return gridPosition;
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
        const _g = this.camera.size.div(new Vector2(this.tileSize, this.tileSize));
        const grid = new Vector2(Math.ceil(_g.x), Math.ceil(_g.y));
        const grid_offset = grid.scale(this.tileSize).sub(this.camera.size).scale(0.5);

        for (let y = 0; y < grid.y + 1; ++y) {
            const offset = y * this.tileSize + (-this.camera.center.y % this.tileSize) - grid_offset.y;
            this._drawLine(new Vector2(0, offset), new Vector2(grid.x * this.tileSize, offset), "#000000");
        }
        for (let x = 0; x < grid.x + 1; ++x) {
            const offset = x * this.tileSize + (-this.camera.center.x % this.tileSize) - grid_offset.x;
            this._drawLine(new Vector2(offset, 0), new Vector2(offset, grid.y * this.tileSize), "#000000");
        }
    }
}

class VectorMap<T> {
    vectors: Array<Vector2>;
    strings: Array<T>;

    constructor() {
        this.vectors = [];
        this.strings = [];
    }

    set(key: Vector2, value: T) {
        this.delete(key);
        this.vectors.push(key);
        this.strings.push(value);
    }

    get(key: Vector2): T | undefined {
        for (let v in this.vectors) {
            if (this.vectors[v].x === key.x && this.vectors[v].y === key.y) {
                return this.strings[v];
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
            this.strings.splice(found, 1);
            return true;
        }
        return false;
    }

    *entries(): IterableIterator<[Vector2, T]> {
        for (let i = 0; i < this.vectors.length; ++i) {
            yield [this.vectors[i], this.strings[i]];
        }
    }
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

function render(e: Engine, app: App) {
    e.clear("#181818");
    e.drawGrid();

    for (let [position, index] of app.world.entries()) {
        const color = getColor(app, index);
        if (!color) continue;
        e.drawRect(position.scale(e.tileSize), new Vector2(e.tileSize, e.tileSize), color);
    }
    e.drawText(`camera: ${e.camera.toString()}`, new Vector2(10, 10), 14, "#FFFFFF");
}

function setActivePaletteItem(app: App, paletteIdx: string) {
    app.currentPaletteIdx = Number(paletteIdx);
}

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
}

(() => {
    const factor = 96;
    const width = 16 * factor;
    const height = 9 * factor;
    const tileSize = 64;
    const engine = new Engine(width, height, tileSize);
    const camera_speed = 8;

    const addBtn: HTMLButtonElement | null = document.querySelector("#add");
    const exportBtn: HTMLButtonElement | null = document.querySelector("#export");
    const palette: HTMLDivElement | null = document.querySelector("#palette");
    const filename: HTMLInputElement | null = document.querySelector("#filename");

    if (!addBtn || !palette || !exportBtn || !filename) throw new Error("no toolbar found");

    let paletteItemIdx = 0;

    const app: App = {
        world: new VectorMap(),
        palette: palette,
        currentPaletteIdx: -1,
    };

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
        console.log(output);
        // const a = document.createElement("a");
        // a.href = URL.createObjectURL(new File([output], "hello.txt", { type: "octet/stream" }));
        // a.setAttribute("download", filename.value || "export.txt");
        // document.body.appendChild(a);
        // a.click();
        // document.body.removeChild(a);
    });

    addBtn.addEventListener("click", (e) => {
        // PALETTE ITEM
        const paletteItem = document.createElement("div");
        paletteItem.className = "flex h-full";

        // TEXT INPUT
        const text = document.createElement("input");
        text.type = "text";
        text.placeholder = "#";
        text.className = "w-4";
        text.maxLength = 1;

        // RADIO INPUT
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "palette";
        radio.value = `${paletteItemIdx}`;
        radio.className = "w-8 h-full";
        radio.addEventListener("change", (e) => {
            setActivePaletteItem(app, radio.value);
        });

        // COLOR INPUT
        const color = document.createElement("input");
        color.type = "color";
        color.className = "h-full";
        color.addEventListener("change", (e) => {
            radio.click();
            render(engine, app);
        });

        // TREE
        paletteItem.appendChild(text);
        paletteItem.appendChild(color);
        paletteItem.appendChild(radio);

        palette.appendChild(paletteItem);
        if (palette.childElementCount == 1) {
            text.value = "#";
            radio.click();
        }
        paletteItemIdx += 1;
    });

    window.addEventListener("keydown", (e) => {
        if (e.code == "KeyW") engine.camera.center = engine.camera.center.add(new Vector2(0, -camera_speed));
        if (e.code == "KeyA") engine.camera.center = engine.camera.center.add(new Vector2(-camera_speed, 0));
        if (e.code == "KeyD") engine.camera.center = engine.camera.center.add(new Vector2(+camera_speed, 0));
        if (e.code == "KeyS") engine.camera.center = engine.camera.center.add(new Vector2(0, +camera_speed));
        render(engine, app);
    });

    engine.setEventCallback("grid_down", (button: number, position: Vector2) => {
        switch (button) {
            case 0: // left click
                if (app.currentPaletteIdx != -1) {
                    console.log(`click at ${position.toString()}`);
                    app.world.set(position, app.currentPaletteIdx);
                }
                break;
            case 1: // middle click

            case 2: // right click
                if (!app.world.delete(position)) {
                    console.log(`Nothing to delete ! ${position.toString()}`);
                }
                break;
        }
        render(engine, app);
    });
    addBtn.click();
    render(engine, app);
})();
