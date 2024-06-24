"use strict";
class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static zero() {
        return new Vector2(0, 0);
    }
    static one() {
        return new Vector2(1, 1);
    }
    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }
    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y);
    }
    sub(that) {
        return new Vector2(this.x - that.x, this.y - that.y);
    }
    mul(that) {
        return new Vector2(this.x * that.x, this.y * that.y);
    }
    div(that) {
        if (that.x === 0 || that.y === 0)
            return this;
        return new Vector2(this.x / that.x, this.y / that.y);
    }
    scale(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    mod(that) {
        if (that.x === 0 || that.y === 0)
            return this;
        return new Vector2(this.x % that.x, this.y % that.y);
    }
    cb1(xFunc) {
        return new Vector2(xFunc(this.x), xFunc(this.y));
    }
    cb2(xFunc, yFunc) {
        return new Vector2(xFunc(this.x), yFunc(this.y));
    }
    array() {
        return [this.x, this.y];
    }
    toString() {
        return `[${this.x}, ${this.y}]`;
    }
}
class Rect {
    get size() {
        return this.end.sub(this.start);
    }
    get half() {
        return this.size.scale(0.5);
    }
    get center() {
        return this.start.add(this.half);
    }
    set center(value) {
        const delta = this.center.sub(value);
        this.start = this.start.add(delta);
        this.end = this.end.add(delta);
    }
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    static zero() {
        return new Rect(Vector2.zero(), Vector2.zero());
    }
    translate(delta) {
        const rect = new Rect(this.start, this.end);
        rect.center = rect.center.sub(delta);
        return rect;
    }
    array() {
        return [...this.start.array(), ...this.end.array()];
    }
    toString() {
        return `[${this.start.toString()}, ${this.end.toString()}] computed: [center: ${this.center.toString()}, size: ${this.size.toString()}]`;
    }
}
class VectorMap {
    constructor() {
        this.vectors = [];
        this.values = [];
    }
    set(key, value) {
        this.delete(key);
        this.vectors.push(key);
        this.values.push(value);
    }
    has(key) {
        for (let v in this.vectors) {
            if (this.vectors[v].x === key.x && this.vectors[v].y === key.y) {
                return true;
            }
        }
        return false;
    }
    get(key) {
        for (let v in this.vectors) {
            if (this.vectors[v].x === key.x && this.vectors[v].y === key.y) {
                return this.values[v];
            }
        }
    }
    delete(key) {
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
    *entries() {
        for (let i = 0; i < this.vectors.length; ++i) {
            yield [this.vectors[i], this.values[i]];
        }
    }
}
class Engine {
    get width() {
        return this.canvas.width;
    }
    set width(value) {
        this.canvas.width = value;
    }
    get height() {
        return this.canvas.height;
    }
    set height(value) {
        this.canvas.height = value;
    }
    constructor(width, height, tileSize) {
        this.renderCb = () => { };
        this.zoomLevel = 1;
        this.dragging = false;
        this.old_mouse_position = Vector2.zero();
        const canvas = document.querySelector("#canvas");
        if (canvas === null)
            throw new Error("Canvas #canvas not found.");
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            throw new Error("Cannot init 2d context.");
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
            this.tileSize += Math.sign(e.deltaY);
            this.update();
        });
    }
    _clientToGrid(x, y) {
        const clientPosition = new Vector2(x, y);
        const canvasPosition = this.canvas.getBoundingClientRect();
        const screenPosition = clientPosition.sub(new Vector2(canvasPosition.x, canvasPosition.y));
        const gridPosition = this.toCamera(screenPosition).div(new Vector2(this.tileSize, this.tileSize)).cb1(Math.floor);
        return gridPosition;
    }
    setRenderCallback(cb) {
        this.renderCb = cb;
    }
    setEventCallback(name, cb) {
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
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    clear(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    toScreen(p) {
        return p.sub(this.camera.center).add(this.camera.size.scale(0.5));
    }
    toCamera(p) {
        return p.add(this.camera.center).sub(this.camera.size.scale(0.5));
    }
    drawText(text, position, size, color) {
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        this.ctx.font = `${size}px monospace`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, ...position.array());
    }
    drawCircle(position, radius, color) {
        this._drawCircle(this.toScreen(position), radius, color);
    }
    _drawCircle(position, radius, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    drawLine(start, end, color) {
        this._drawLine(this.toScreen(start), this.toScreen(end), color);
    }
    _drawLine(start, end, color) {
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(...start.array());
        this.ctx.lineTo(...end.array());
        this.ctx.stroke();
    }
    drawRect(position, size, color) {
        this._drawRect(this.toScreen(position), size, color);
    }
    _drawRect(position, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.fillRect(...position.array(), ...size.array());
        this.ctx.fill();
    }
    drawGrid() {
        const tile = new Vector2(this.tileSize, this.tileSize);
        const grid = this.camera.size.div(tile).cb1(Math.ceil);
        // const grid_offset = new Vector2(this.tileSize, this.tileSize).add(
        //     new Vector2(-this.camera.center.x % this.tileSize, -this.camera.center.y % this.tileSize)
        // );
        // const grid_offset = grid.scale(this.tileSize).sub(this.camera.size);
        const grid_offset = this.camera.size.scale(0.5).mod(tile);
        console.log(`tile = ${tile}`);
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
function getColor(app, index) {
    const color = app.palette.childNodes[index].childNodes[1];
    if (color instanceof HTMLInputElement && color.type === "color") {
        return color.value;
    }
}
function getText(app, index) {
    const text = app.palette.childNodes[index].childNodes[0];
    if (text instanceof HTMLInputElement && text.type === "text") {
        return text.value;
    }
}
function setActivePaletteItem(app, paletteIdx) {
    app.currentPaletteIdx = Number(paletteIdx);
}
// return a Rect that contain all tiles drawn
function computeWorldRect(app) {
    let worldRect = undefined;
    for (let [pos, _] of app.world.entries()) {
        if (!worldRect) {
            worldRect = new Rect(pos, pos);
        }
        else {
            if (pos.x < worldRect.start.x)
                worldRect.start = new Vector2(pos.x, worldRect.start.y);
            if (pos.x > worldRect.end.x)
                worldRect.end = new Vector2(pos.x, worldRect.end.y);
            if (pos.y < worldRect.start.y)
                worldRect.start = new Vector2(worldRect.start.x, pos.y);
            if (pos.y > worldRect.end.y)
                worldRect.end = new Vector2(worldRect.end.x, pos.y);
        }
    }
    if (!worldRect)
        return undefined;
    worldRect.end = worldRect.end.add(Vector2.one());
    return worldRect;
}
(() => {
    /*
     ** CONSTANTS
     */
    const factor = 96;
    const width = 16 * factor;
    const height = 9 * factor;
    const tileSize = 42;
    const camera_speed = 4;
    /*
     ** HTML
     */
    const addBtn = document.querySelector("#add");
    const exportBtn = document.querySelector("#export");
    const palette = document.querySelector("#palette");
    const filename = document.querySelector("#filename");
    if (!addBtn || !palette || !exportBtn || !filename)
        throw new Error("no toolbar found");
    /*
     ** VARS
     */
    const app = {
        world: new VectorMap(),
        palette: palette,
        currentPaletteIdx: -1,
    };
    let paletteItemIdx = 0;
    const engine = new Engine(width, height, tileSize);
    engine.setRenderCallback(() => {
        for (let [position, index] of app.world.entries()) {
            const color = getColor(app, index);
            if (!color)
                continue;
            engine.drawRect(position.scale(engine.tileSize), new Vector2(engine.tileSize, engine.tileSize), color);
        }
    });
    /*
     ** EVENTS
     */
    exportBtn.addEventListener("click", (e) => {
        let worldRect = computeWorldRect(app);
        if (!worldRect)
            throw new Error("Couldn't compute world data");
        let output = "";
        for (let y = 0; y < worldRect.size.y; ++y) {
            for (let x = 0; x < worldRect.size.x; ++x) {
                const position = worldRect.start.add(new Vector2(x, y));
                const tile = app.world.get(position);
                if (tile !== undefined) {
                    const character = getText(app, tile);
                    output += character;
                }
                else {
                    output += " ";
                }
            }
            output += "\n";
        }
        // console.log(output);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new File([output], "hello.txt", { type: "octet/stream" }));
        a.setAttribute("download", filename.value || "export.txt");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
            engine.update();
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
        if (e.code == "KeyW")
            engine.camera.center = engine.camera.center.add(new Vector2(0, -camera_speed));
        if (e.code == "KeyA")
            engine.camera.center = engine.camera.center.add(new Vector2(-camera_speed, 0));
        if (e.code == "KeyD")
            engine.camera.center = engine.camera.center.add(new Vector2(+camera_speed, 0));
        if (e.code == "KeyS")
            engine.camera.center = engine.camera.center.add(new Vector2(0, +camera_speed));
        engine.update();
    });
    engine.setEventCallback("grid_down", (button, position) => {
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
    // INITIAL STATE
    addBtn.click();
    engine.update();
})();
//# sourceMappingURL=index.js.map