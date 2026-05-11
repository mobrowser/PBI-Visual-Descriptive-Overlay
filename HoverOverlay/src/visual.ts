export class Visual implements powerbi.extensibility.visual.IVisual {

    private container: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private tooltip: HTMLDivElement;
    private ttLabel: HTMLDivElement;
    private ttText: HTMLSpanElement;
    private ttName: HTMLDivElement;
    private animFrame: number = 0;
    private animPhase: number = 0;

    private zones: any[] = [];
    private activeZone: any = null;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private viewWidth: number = 0;
    private viewHeight: number = 0;

    // ─── Performance: throttle mousemove ─────────────────────────────────
    private lastMoveTime: number = 0;
    private readonly THROTTLE_MS: number = 50;

    private settings = {
        general: {
            enabled: true
        },
        overlay: {
            borderColor:  '#dc2626',
            borderWidth:  2,
            borderStyle:  'solid',
            borderRadius: 0,
            padding:      0.10,
            fillOpacity:  0.04,
            animate:      false
        },
        tooltip: {
            background:     '#1a1a2e',
            tooltipOpacity: 1,
            textColor:      '#ffffff',
            fontSize:       12,
            maxWidth:       220,
            position:       'follow',
            showZoneName:   true,
            labelColor:     '#dc2626',
            labelFontSize:  9
        },
        debug: {
            showAllZones: false
        }
    };

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.container = document.createElement('div');
        this.container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:all;';
        options.element.appendChild(this.container);

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.tooltip = document.createElement('div');
        this.tooltip.style.cssText = 'position:absolute;display:none;pointer-events:none;border-radius:4px;padding:8px 12px;font-family:Segoe UI,sans-serif;z-index:9999;word-wrap:break-word;line-height:1.5;border-left:3px solid #dc2626;';
        this.container.appendChild(this.tooltip);

        this.ttName = document.createElement('div');
        this.ttName.style.cssText = 'font-weight:600;margin-bottom:2px;';
        this.tooltip.appendChild(this.ttName);

        this.ttLabel = document.createElement('div');
        this.ttLabel.style.cssText = 'text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;';
        this.ttLabel.textContent = 'Visual description';
        this.tooltip.appendChild(this.ttLabel);

        this.ttText = document.createElement('span');
        this.tooltip.appendChild(this.ttText);

        // Throttled mousemove — hit-test runs at most every THROTTLE_MS
        this.container.addEventListener('mousemove', (e: MouseEvent) => {
            const now = Date.now();
            if (!this.settings.general.enabled) return;
            if (now - this.lastMoveTime < this.THROTTLE_MS) return;
            this.lastMoveTime = now;
            this.onMouseMove(e);
        });

        this.container.addEventListener('mouseleave', () => {
            if (!this.settings.general.enabled) return;
            this.onMouseLeave();
        });

        this.applyStyles();
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        this.viewWidth  = options.viewport.width;
        this.viewHeight = options.viewport.height;

        this.canvas.width  = this.viewWidth;
        this.canvas.height = this.viewHeight;
        this.container.style.width  = this.viewWidth  + 'px';
        this.container.style.height = this.viewHeight + 'px';

        if (options.dataViews && options.dataViews[0]) {
            this.readSettings(options.dataViews[0]);
            this.readZones(options.dataViews[0]);
        }

        // When disabled — clear canvas, hide tooltip, remove pointer events
        if (!this.settings.general.enabled) {
            this.clearCanvas();
            this.tooltip.style.display = 'none';
            this.stopAnimation();
            this.container.style.pointerEvents = 'none';
            return;
        }

        this.container.style.pointerEvents = 'all';
        this.container.style.background = 'transparent';
        this.applyStyles();

        if (this.settings.debug.showAllZones) {
            this.drawAllZones();
        } else {
            this.redraw();
        }
    }

    private readSettings(dataView: powerbi.DataView): void {
        const objects = dataView.metadata && dataView.metadata.objects;
        if (!objects) return;

        if (objects.general) {
            const g: any = objects.general;
            if (g.enabled != null) this.settings.general.enabled = !!g.enabled;
        }
        if (objects.overlay) {
            const o: any = objects.overlay;
            if (o.borderColor  && o.borderColor.solid)  this.settings.overlay.borderColor  = o.borderColor.solid.color;
            if (o.borderWidth  != null) this.settings.overlay.borderWidth  = Math.max(1, +o.borderWidth);
            if (o.borderStyle  != null) this.settings.overlay.borderStyle  = String(o.borderStyle);
            if (o.borderRadius != null) this.settings.overlay.borderRadius = Math.max(0, +o.borderRadius);
            if (o.padding      != null) this.settings.overlay.padding      = Math.max(0, +o.padding) / 100;
            if (o.fillOpacity  != null) this.settings.overlay.fillOpacity  = Math.min(1, Math.max(0, +o.fillOpacity));
            if (o.animate      != null) this.settings.overlay.animate      = !!o.animate;
        }
        if (objects.tooltip) {
            const t: any = objects.tooltip;
            if (t.background     && t.background.solid) this.settings.tooltip.background     = t.background.solid.color;
            if (t.tooltipOpacity != null) this.settings.tooltip.tooltipOpacity = Math.min(1, Math.max(0, +t.tooltipOpacity));
            if (t.textColor      && t.textColor.solid)  this.settings.tooltip.textColor       = t.textColor.solid.color;
            if (t.fontSize       != null) this.settings.tooltip.fontSize      = Math.max(8, +t.fontSize);
            if (t.maxWidth       != null) this.settings.tooltip.maxWidth      = Math.max(100, +t.maxWidth);
            if (t.position       != null) this.settings.tooltip.position      = String(t.position);
            if (t.showZoneName   != null) this.settings.tooltip.showZoneName  = !!t.showZoneName;
            if (t.labelColor     && t.labelColor.solid) this.settings.tooltip.labelColor      = t.labelColor.solid.color;
            if (t.labelFontSize  != null) this.settings.tooltip.labelFontSize = Math.max(8, +t.labelFontSize);
        }
        if (objects.debug) {
            const d: any = objects.debug;
            if (d.showAllZones != null) this.settings.debug.showAllZones = !!d.showAllZones;
        }
    }

    private readZones(dataView: powerbi.DataView): void {
        this.zones = [];
        if (!dataView.table) return;

        const cols = dataView.table.columns;
        const rows = dataView.table.rows;
        if (!cols || !rows || rows.length === 0) return;

        const idx: any = { zoneName: -1, x: -1, y: -1, zoneWidth: -1, zoneHeight: -1, description: -1, zoneColor: -1 };
        for (let i = 0; i < cols.length; i++) {
            const roles: any = cols[i].roles || {};
            if (roles['zoneName'])    idx.zoneName    = i;
            if (roles['x'])           idx.x           = i;
            if (roles['y'])           idx.y           = i;
            if (roles['zoneWidth'])   idx.zoneWidth   = i;
            if (roles['zoneHeight'])  idx.zoneHeight  = i;
            if (roles['description']) idx.description = i;
            if (roles['zoneColor'])   idx.zoneColor   = i;
        }

        for (const row of rows) {
            const x = parseFloat(row[idx.x] as string);
            const y = parseFloat(row[idx.y] as string);
            const w = parseFloat(row[idx.zoneWidth] as string);
            const h = parseFloat(row[idx.zoneHeight] as string);
            if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) continue;
            this.zones.push({
                name:        idx.zoneName    >= 0 ? String(row[idx.zoneName]    || '') : '',
                x, y, w, h,
                description: idx.description >= 0 ? String(row[idx.description] || '') : '',
                color:       idx.zoneColor   >= 0 ? String(row[idx.zoneColor]   || '') : ''
            });
        }
    }

    private onMouseMove(e: MouseEvent): void {
        this.mouseX = e.offsetX;
        this.mouseY = e.offsetY;
        const mx = this.mouseX / this.viewWidth;
        const my = this.mouseY / this.viewHeight;

        let hit: any = null;
        for (let i = 0; i < this.zones.length; i++) {
            const z = this.zones[i];
            if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
                hit = z;
                break;
            }
        }

        if (hit !== this.activeZone) {
            this.activeZone = hit;
            if (hit && this.settings.overlay.animate) {
                this.startAnimation();
            } else {
                this.stopAnimation();
                this.settings.debug.showAllZones ? this.drawAllZones() : this.redraw();
            }
        }

        if (hit) {
            this.showTooltip(hit);
        } else {
            this.tooltip.style.display = 'none';
        }
    }

    private onMouseLeave(): void {
        this.activeZone = null;
        this.tooltip.style.display = 'none';
        this.stopAnimation();
        this.settings.debug.showAllZones ? this.drawAllZones() : this.clearCanvas();
    }

    private showTooltip(zone: any): void {
        const s = this.settings.tooltip;
        this.ttText.textContent    = zone.description;
        this.ttName.textContent    = zone.name;
        this.ttName.style.display  = s.showZoneName && zone.name ? 'block' : 'none';
        this.tooltip.style.display = 'block';

        const maxW = s.maxWidth;
        let tx: number, ty: number;

        if (s.position === 'above' && this.activeZone) {
            const z = this.activeZone;
            tx = (z.x + z.w / 2) * this.viewWidth - maxW / 2;
            ty = (z.y - this.settings.overlay.padding * z.h / 2) * this.viewHeight - 80;
        } else if (s.position === 'below' && this.activeZone) {
            const z = this.activeZone;
            tx = (z.x + z.w / 2) * this.viewWidth - maxW / 2;
            ty = (z.y + z.h + this.settings.overlay.padding * z.h / 2) * this.viewHeight + 8;
        } else {
            tx = this.mouseX + 16;
            ty = this.mouseY - 10;
            if (tx + maxW > this.viewWidth - 8) tx = this.mouseX - maxW - 10;
            if (ty < 4) ty = this.mouseY + 20;
        }

        tx = Math.max(4, Math.min(tx, this.viewWidth - maxW - 4));
        ty = Math.max(4, ty);

        this.tooltip.style.left = tx + 'px';
        this.tooltip.style.top  = ty + 'px';
    }

    private startAnimation(): void {
        this.stopAnimation();
        this.animPhase = 0;
        const tick = () => {
            this.animPhase += 0.05;
            this.settings.debug.showAllZones ? this.drawAllZones() : this.redraw();
            this.animFrame = requestAnimationFrame(tick);
        };
        this.animFrame = requestAnimationFrame(tick);
    }

    private stopAnimation(): void {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = 0;
            this.animPhase = 0;
        }
    }

    private drawZone(zone: any, isActive: boolean): void {
        const s   = this.settings.overlay;
        const W   = this.viewWidth;
        const H   = this.viewHeight;
        const pad = s.padding;

        const rx = (zone.x - zone.w * pad / 2) * W;
        const ry = (zone.y - zone.h * pad / 2) * H;
        const rw = zone.w * (1 + pad) * W;
        const rh = zone.h * (1 + pad) * H;
        const rr = s.borderRadius;

        const color = (zone.color && zone.color.startsWith('#')) ? zone.color : s.borderColor;
        const r = parseInt(color.slice(1,3), 16) || 220;
        const g = parseInt(color.slice(3,5), 16) || 38;
        const b = parseInt(color.slice(5,7), 16) || 38;

        let fillAlpha   = s.fillOpacity;
        let strokeAlpha = 1;

        if (isActive && s.animate && this.animFrame) {
            const pulse  = 0.5 + 0.5 * Math.sin(this.animPhase * 3);
            fillAlpha   += pulse * 0.08;
            strokeAlpha  = 0.6 + pulse * 0.4;
        }
        if (!isActive && this.settings.debug.showAllZones) {
            fillAlpha   = 0.02;
            strokeAlpha = 0.3;
        }

        this.ctx.save();
        this.ctx.fillStyle = `rgba(${r},${g},${b},${fillAlpha})`;
        this.roundRect(rx, ry, rw, rh, rr);
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(${r},${g},${b},${strokeAlpha})`;
        this.ctx.lineWidth   = s.borderWidth;
        this.ctx.setLineDash(
            s.borderStyle === 'dashed' ? [8, 5] :
            s.borderStyle === 'dotted' ? [2, 4] : []
        );
        this.roundRect(rx, ry, rw, rh, rr);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        if (this.settings.debug.showAllZones) {
            this.ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
            this.ctx.font      = 'bold 11px Segoe UI, sans-serif';
            this.ctx.fillText(zone.name || 'zone', rx + 6, ry + 14);
        }

        this.ctx.restore();
    }

    private roundRect(x: number, y: number, w: number, h: number, r: number): void {
        r = Math.min(r || 0, w / 2, h / 2);
        this.ctx.beginPath();
        if (r === 0) {
            this.ctx.rect(x, y, w, h);
        } else {
            this.ctx.moveTo(x + r, y);
            this.ctx.lineTo(x + w - r, y);
            this.ctx.arcTo(x + w, y,     x + w, y + r,     r);
            this.ctx.lineTo(x + w, y + h - r);
            this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            this.ctx.lineTo(x + r, y + h);
            this.ctx.arcTo(x,     y + h, x,     y + h - r, r);
            this.ctx.lineTo(x,     y + r);
            this.ctx.arcTo(x,     y,     x + r, y,         r);
            this.ctx.closePath();
        }
    }

    private clearCanvas(): void {
        this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    }

    private redraw(): void {
        this.clearCanvas();
        if (!this.activeZone) return;
        this.drawZone(this.activeZone, true);
    }

    private drawAllZones(): void {
        this.clearCanvas();
        for (const zone of this.zones) {
            this.drawZone(zone, zone === this.activeZone);
        }
    }

    private applyStyles(): void {
        const s  = this.settings;
        const r  = parseInt(s.tooltip.background.slice(1,3), 16) || 26;
        const g  = parseInt(s.tooltip.background.slice(3,5), 16) || 26;
        const b  = parseInt(s.tooltip.background.slice(5,7), 16) || 46;
        this.tooltip.style.background      = `rgba(${r},${g},${b},${s.tooltip.tooltipOpacity})`;
        this.tooltip.style.color           = s.tooltip.textColor;
        this.tooltip.style.fontSize        = s.tooltip.fontSize     + 'px';
        this.tooltip.style.maxWidth        = s.tooltip.maxWidth     + 'px';
        this.tooltip.style.borderLeftColor = s.overlay.borderColor;
        this.ttLabel.style.color           = s.tooltip.labelColor;
        this.ttLabel.style.fontSize        = s.tooltip.labelFontSize + 'px';
        this.ttName.style.color            = s.tooltip.textColor;
        this.ttName.style.fontSize         = (s.tooltip.fontSize + 1) + 'px';
    }

    public enumerateObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstanceEnumeration {
        const instances: powerbi.VisualObjectInstance[] = [];
        const s = this.settings;

        switch (options.objectName) {
            case 'general':
                instances.push({ objectName: 'general', selector: null, properties: {
                    enabled: s.general.enabled
                }});
                break;
            case 'overlay':
                instances.push({ objectName: 'overlay', selector: null, properties: {
                    borderColor:  { solid: { color: s.overlay.borderColor } },
                    borderWidth:  s.overlay.borderWidth,
                    borderStyle:  s.overlay.borderStyle,
                    borderRadius: s.overlay.borderRadius,
                    padding:      Math.round(s.overlay.padding * 100),
                    fillOpacity:  s.overlay.fillOpacity,
                    animate:      s.overlay.animate
                }});
                break;
            case 'tooltip':
                instances.push({ objectName: 'tooltip', selector: null, properties: {
                    background:     { solid: { color: s.tooltip.background } },
                    tooltipOpacity: s.tooltip.tooltipOpacity,
                    textColor:      { solid: { color: s.tooltip.textColor } },
                    fontSize:       s.tooltip.fontSize,
                    maxWidth:       s.tooltip.maxWidth,
                    position:       s.tooltip.position,
                    showZoneName:   s.tooltip.showZoneName,
                    labelColor:     { solid: { color: s.tooltip.labelColor } },
                    labelFontSize:  s.tooltip.labelFontSize
                }});
                break;
            case 'debug':
                instances.push({ objectName: 'debug', selector: null, properties: {
                    showAllZones: s.debug.showAllZones
                }});
                break;
        }
        return instances;
    }
}
