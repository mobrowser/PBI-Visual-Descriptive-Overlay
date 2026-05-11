# PBI-Visual-Descriptive-Overlay
This is a Power BI visual that can be added to Power BI report as a standard visual and overlays the page to have a pop up describe the individual visualizations on that page with a red box and a definition based on a hover over by the mouse.

===========================================================

# Hover Overlay — Power BI Custom Visual

A transparent canvas-based custom visual that draws a styled border and tooltip when a user hovers over defined hot zones on a Power BI report page. Zones are defined by a coordinate data table connected to the visual. The coordinates of the visuals can be manually input or programatically generated to enable the display on the pages desired.

---

## How It Works

The visual is placed as a transparent overlay covering the full report page (or a section of it). It reads zone definitions from a Power BI data table — each row defines a rectangular zone by its position and size of the visual's dimensions. When the user hovers over a zone, a styled border and tooltip appear.

---

## Coordinate System

Coordinates are expressed on a normalized scale **between 0 and 1**, relative to the visual's rendered width and height.

| Value | Meaning |
|---|---|
| `X = 0` | Left edge of the visual |
| `X = 1` | Right edge of the visual |
| `Y = 0` | Top edge of the visual |
| `Y = 1` | Bottom edge of the visual |

## Visual Card Schema

| Column | Type | Required | Description |
|---|---|---|---|
| ZoneName | Text | Yes | Display name shown in the tooltip header |
| X | Decimal | Yes |  Visual X coordinate on page (0–1 fraction of canvas width) |
| Y | Decimal | Yes | Visual Y coordinate on page (0–1 fraction of canvas height) |
| Width | Decimal | Yes | Effective overlay zone width (0–1 fraction of canvas height) |
| Height | Decimal | Yes | Effective overlay zone height (0–1 fraction of canvas height) |
| Description | Text | Yes | Tooltip description text | 
| ZoneColor | Text | No | Optional hex color override per zone (e.g. `#118DFF`) |

---

### Formula

Calculating coordinates to generate the correct size squares over the visuals requires a reference table on a per visual basis. Template file available as "HoverOverlay_Template.csv".  Your model suggested to have listed calculated columns below to match the names on the property pane.

```
X      = [VisualWidth] / [CanvasWidth]
Y      = [VisualHeight] / [CanvasHeight]
Width  = [VisualWidth]  / [CanvasWidth]
Height = [VisualHeight] / [CanvasHeight]
```

Where:
- `X` / `Y` — the visual's coordinates in normal scale (0-1)
- `Widgth` / `Height` — the canvas coordinates in normal scale (0-1)
- `VisualWidth` / `VisualHeight` — the visual size in pixels
- `CanvasWidth` / `CanvasHeight` — the report page canvas size in pixels

---

## Worked Example

Using the default canvas size of 1280 × 720.

| Visual Property | Value  in px|
|---|---|
| PositionX | 320 |
| PositionY | 90 |
| VisualWidth | 200 |
| VisuLHeight | 120 |

Calculate the zone coordinates for the visual :

```
X      = 320  / 1280 = 0.250
Y      = 90   / 720  = 0.125
Width  = 200  / 1280 = 0.156
Height = 120  / 720  = 0.167
```

A data table row for this zone might be:


| ReportPage | ZoneName | X | Y | Width | Height | CanvasHeight | CanvasWidth | PositionX | PositionY | VisualHeight | VisualWidth | Description | ZoneColor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Main Page | Revenue Card | 0.250 | 0.125 | 0.156 | 0.167 | 720 | 1280 | 320 | 90 | 200 | 120 | Total revenue for the selected period | 118DFF |


| Column | Type | Description |
|---|---|---|
|ReportPage | Text | Optional Report Page Name if the visual for filtering on multiple pages | 
| ZoneName | Text | Display name shown in the tooltip header |
| X | Decimal | Left edge of the overlay zone (0–1 fraction of canvas width) |
| Y | Decimal | Top edge of the overlay zone (0–1 fraction of canvas height) |
| CanvasWidth | Decimal |  Effective overlay zone width |
| CanvasHeight | Decimal | Effective overlay zone height |
| PositionX | Decimal | Visual X Position on page |
| PositionY | Decimal | Visual Y Position on page | 
| VisualHeight | Decimal | Visual Height (Height in px of visual) |
| VisualWidth | Decimal | Visual Width (Width in px of visual) |
| Description | Text | Tooltip description text |
| ZoneColor | Text | Optional hex color override per zone (e.g. `#118DFF`) |

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

- **Coordinates are relative to the visual, not the page** — the Hover Overlay visual itself must cover the area you want to detect. Size the visual to fill the page or the target area
- **Remove Default padding, it will create an unexpected offset.
- **Visual Coordinates and Canvas dimensions should be systemically extracted for ease of use and automation for any project of scale.  
- **Offsets should be used for overlays not covering the entire canvas.

---
