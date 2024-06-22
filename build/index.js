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
    cb(xFunc, yFunc) {
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
    constructor(position, size) {
        this.position = position;
        this.size = size;
    }
    array() {
        return [...this.position.array(), ...this.size.array()];
    }
    toString() {
        return `[${this.position.toString()}, ${this.size.toString()}]`;
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
    constructor(width, height) {
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
        this.camera = new Rect(Vector2.zero(), new Vector2(width, height));
        this.canvas.addEventListener("click", (e) => {
            const clientPosition = new Vector2(e.clientX, e.clientY);
            const canvasPosition = canvas.getBoundingClientRect();
            const screenPosition = clientPosition.sub(new Vector2(canvasPosition.x, canvasPosition.y));
            const gridPosition = this.toCamera(screenPosition).div(new Vector2(64, 64)).cb(Math.floor, Math.floor);
            console.log(`clicked tile ${gridPosition.toString()}`);
        });
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
        return p.sub(this.camera.position).add(this.camera.size.scale(0.5));
    }
    toCamera(p) {
        return p.add(this.camera.position).sub(this.camera.size.scale(0.5));
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
    drawGrid(tileSize) {
        const _g = this.camera.size.div(new Vector2(tileSize, tileSize));
        const grid = new Vector2(Math.ceil(_g.x), Math.ceil(_g.y));
        const grid_offset = grid.scale(tileSize).sub(this.camera.size).scale(0.5);
        for (let y = 0; y < grid.y + 1; ++y) {
            const offset = y * tileSize + (-this.camera.position.y % tileSize) - grid_offset.y;
            this._drawLine(new Vector2(0, offset), new Vector2(grid.x * tileSize, offset), "#000000");
        }
        for (let x = 0; x < grid.x + 1; ++x) {
            const offset = x * tileSize + (-this.camera.position.x % tileSize) - grid_offset.x;
            this._drawLine(new Vector2(offset, 0), new Vector2(offset, grid.y * tileSize), "#000000");
        }
    }
}
function render(e) {
    e.clear("#181818");
    e.drawGrid(64);
    e.drawText(`camera: ${e.camera.toString()}`, new Vector2(10, 10), 14, "#FFFFFF");
    e.drawCircle(new Vector2(0, 0), 16, "#FF00FF");
    // renderer.drawCircle(new Vector2(64, 0), 16, "#FF00FF");
    // renderer.drawCircle(new Vector2(0, 64), 16, "#FF00FF");
    // renderer.drawCircle(new Vector2(64, 64), 16, "#FF00FF");
}
(() => {
    const factor = 96;
    const width = 16 * factor;
    const height = 9 * factor;
    const engine = new Engine(width, height);
    const camera_speed = 8;
    document.addEventListener("keydown", (e) => {
        if (e.code == "KeyW")
            engine.camera.position.y -= camera_speed;
        if (e.code == "KeyS")
            engine.camera.position.y += camera_speed;
        if (e.code == "KeyA")
            engine.camera.position.x -= camera_speed;
        if (e.code == "KeyD")
            engine.camera.position.x += camera_speed;
        render(engine);
    });
    render(engine);
})();
