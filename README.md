# PBI-Visual-Descriptive-Overlay
This is a Power BI visual that can be added to Power BI report as a standard visual and overlays the page to have a pop up describe the individual visualizations on that page with a red box and a definition based on a hover over by the mouse.

===========================================================

# Hover Overlay — Power BI Custom Visual (V3)

A transparent canvas-based custom visual that draws a styled border and tooltip when a user hovers over defined hot zones on a Power BI report page. Zones are defined by a coordinate data table connected to the visual.

---

## How It Works

The visual is placed as a transparent overlay covering the full report page (or a section of it). It reads zone definitions from a Power BI data table — each row defines a rectangular zone by its position and size as fractions of the visual's dimensions. When the user hovers over a zone, a styled border and tooltip appear.


---

## Data Table Schema

Create a Power BI table with the following columns:

| Column | Type | Required | Description |
|---|---|---|---|
| ZoneName | Text | Yes | Display name shown in the tooltip header |
| X | Decimal | Yes | Left edge of the zone (0–1 fraction of canvas width) |
| Y | Decimal | Yes | Top edge of the zone (0–1 fraction of canvas height) |
| Width | Decimal | Yes | Zone width (0–1 fraction of canvas width) |
| Height | Decimal | Yes | Zone height (0–1 fraction of canvas height) |
| Description | Text | Yes | Tooltip description text |
| ZoneColor | Text | No | Optional hex color override per zone (e.g. `#118DFF`) |

---

## Coordinate System

All coordinates are expressed on a scale **between 0 and 1**, relative to the visual's rendered width and height.

| Value | Meaning |
|---|---|
| `X = 0` | Left edge of the visual |
| `X = 1` | Right edge of the visual |
| `Y = 0` | Top edge of the visual |
| `Y = 1` | Bottom edge of the visual |

### Formula

```
X      = PosX      / CanvasWidth
Y      = PosY      / CanvasHeight
Width  = VisualWidth  / CanvasWidth
Height = VisualHeight / CanvasHeight
```

Where:
- `PosX` / `PosY` — the visual's position in pixels, from **Format pane → General → Properties**
- `VisualWidth` / `VisualHeight` — the visual's size in pixels, from the same Properties panel
- `CanvasWidth` / `CanvasHeight` — the report page canvas size, from **View → Page size** (default: **1280 × 720**)

---

## Worked Example

Using the default canvas size of 1280 × 720.
Suppose you have a card visual with these properties (from Format → General → Properties):

| Property | Value |
|---|---|
| Position X | 320 |
| Position Y | 90 |
| Width | 200 |
| Height | 120 |

Calculate the zone coordinates:

```
X      = 320  / 1280 = 0.250
Y      = 90   / 720  = 0.125
Width  = 200  / 1280 = 0.156
Height = 120  / 720  = 0.167
```

The data table row for this zone would be:

| ZoneName | X | Y | Width | Height | Description | ZoneColor |
|---|---|---|---|---|---|---|
| Revenue Card | 0.250 | 0.125 | 0.156 | 0.167 | Total revenue for the selected period | |

---

### Finding Visual Coordinates

1. Click the target visual in Power BI Desktop to select it
2. Open **Format pane → General → Properties**
3. Note the **Position** (X, Y) and **Size** (Width, Height) values in pixels
4. Apply the formula above using your page canvas size

Alternatively, this can be accessed via multiple third party add ons that leverage the pbip file type.

### Finding Your Canvas Size

1. Go to **View → Page view → Actual size** (optional, for reference)
2. Right-click the report canvas → **Page settings** — note Width and Height
3. Default is **1280 × 720**

---

### Format Pane Options

| Option | Description |
|---|---|
| **General → Enable overlay** | Toggle the overlay on/off |
| **Border → Color** | Border and fill color |
| **Border → Width (px)** | Border thickness |
| **Border → Style** | Solid, dashed, or dotted |
| **Border → Corner radius (px)** | Rounded corners |
| **Border → Frame padding** | Extra space around the zone border (% of zone size) |
| **Border → Fill opacity** | Translucent fill inside the border (0–1) |
| **Border → Pulse animation** | Animated pulsing border on hover |
| **Tooltip → Background color** | Tooltip background |
| **Tooltip → Text color** | Tooltip text color |
| **Tooltip → Font size** | Tooltip font size in px |
| **Tooltip → Max width** | Maximum tooltip width in px |
| **Tooltip → Position** | Follow cursor, above zone, or below zone |
| **Tooltip → Show zone name** | Show/hide the zone name header in the tooltip |
| **Debug → Show all zones** | Renders all zones simultaneously — useful for verifying coordinates |

---

## Tips and Gotchas

- **Use Debug mode first** — turn on *Show all zones* to verify all zones are positioned correctly before sharing the report
- **Coordinates are relative to the visual, not the page** — the Hover Overlay visual itself must cover the area you want to detect. Size the visual to fill the page or the target area
- **Page size matters** — if your report uses a custom canvas size, use that size in the formula, not 1280 × 720

---
