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

    array(): [number, number] {
        return [this.x, this.y];
    }

    toString(): string {
        return `[${this.x}, ${this.y}]`;
    }
}

class Rect {
    position: Vector2;
    size: Vector2;

    constructor(position: Vector2, size: Vector2) {
        this.position = position;
        this.size = size;
    }

    array(): [number, number, number, number] {
        return [...this.position.array(), ...this.size.array()];
    }

    toString(): string {
        return `[${this.position.toString()}, ${this.size.toString()}]`;
    }
}

class Renderer {
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

    camera: Rect;

    constructor(width: number, height: number) {
        const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
        if (canvas === null) throw new Error("Canvas #canvas not found.");

        const ctx = canvas.getContext("2d");
        if (ctx === null) throw new Error("Cannot init 2d context.");

        this.canvas = canvas;
        this.ctx = ctx;

        this.resize(width, height);
        this.clear("#181818");

        this.camera = new Rect(Vector2.zero(), new Vector2(width, height));

        this.canvas.addEventListener("click", (e) => {
            const clientPosition = new Vector2(e.clientX, e.clientY);
            const canvasPosition = canvas.getBoundingClientRect();

            console.log(`clientPosition=${clientPosition.toString()}`);
            console.log(`canvasPosition=[${canvasPosition.x}, ${canvasPosition.y}]`);

            const screenPosition = clientPosition.sub(new Vector2(canvasPosition.x, canvasPosition.y));
            console.log(screenPosition.toString());
            console.log(this.toCamera(screenPosition).toString());
        });
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
        return p.add(this.camera.position).add(this.camera.size.scale(0.5));
    }

    toCamera(p: Vector2): Vector2 {
        return p.sub(this.camera.position).sub(this.camera.size.scale(0.5));
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

    drawGrid(tileSize: number) {
        const _g = this.camera.size.div(new Vector2(tileSize, tileSize));
        const grid = new Vector2(Math.ceil(_g.x), Math.ceil(_g.y));
        const grid_offset = grid.scale(tileSize).sub(this.camera.size).scale(0.5);

        for (let y = 0; y < grid.y + 1; ++y) {
            const offset = y * tileSize + (this.camera.position.y % tileSize) - grid_offset.y;
            this._drawLine(new Vector2(0, offset), new Vector2(grid.x * tileSize, offset), "#000000");
        }
        for (let x = 0; x < grid.x + 1; ++x) {
            const offset = x * tileSize + (this.camera.position.x % tileSize) - grid_offset.x;
            this._drawLine(new Vector2(offset, 0), new Vector2(offset, grid.y * tileSize), "#000000");
        }
    }
}

function render(renderer: Renderer) {
    renderer.clear("#181818");
    renderer.drawGrid(64);
    renderer.drawText(`camera: ${renderer.camera.toString()}`, new Vector2(10, 10), 14, "#FFFFFF");
    // renderer.drawCircle(new Vector2(0, 0), 16, "#FF00FF");
    // renderer.drawCircle(new Vector2(64, 0), 16, "#FF00FF");
    // renderer.drawCircle(new Vector2(0, 64), 16, "#FF00FF");
    // renderer.drawCircle(new Vector2(64, 64), 16, "#FF00FF");
}

(() => {
    const factor = 96;
    const width = 16 * factor;
    const height = 9 * factor;
    const renderer = new Renderer(width, height);
    const camera_speed = 8;

    document.addEventListener("keydown", (e) => {
        // if (!e.repeat) {
        if (true) {
            switch (e.code) {
                case "KeyW":
                    renderer.camera.position.y -= camera_speed;
                    render(renderer);
                    break;
                case "KeyS":
                    renderer.camera.position.y += camera_speed;
                    render(renderer);
                    break;
                case "KeyA":
                    renderer.camera.position.x -= camera_speed;
                    render(renderer);
                    break;
                case "KeyD":
                    renderer.camera.position.x += camera_speed;
                    render(renderer);
                    break;
            }
        }
    });

    render(renderer);
})();
