// Hex Grid Math for rendering (Pointy topped hexes)

export interface Point {
  x: number;
  y: number;
}

export class HexGrid {
  public hexSize: number;
  public origin: Point;

  constructor(hexSize: number, origin: Point) {
    this.hexSize = hexSize;
    this.origin = origin;
  }

  // Axial (q,r) to Pixel (x,y)
  public hexToPixel(q: number, r: number): Point {
    const x = this.hexSize * Math.sqrt(3) * (q + r / 2);
    const y = this.hexSize * 3 / 2 * r;
    return {
      x: x + this.origin.x,
      y: y + this.origin.y
    };
  }

  // Pixel (x,y) to fractional Axial
  public pixelToHex(x: number, y: number): { q: number, r: number } {
    const pt = { x: x - this.origin.x, y: y - this.origin.y };
    const q = (Math.sqrt(3) / 3 * pt.x - 1 / 3 * pt.y) / this.hexSize;
    const r = (2 / 3 * pt.y) / this.hexSize;
    return this.hexRound(q, r);
  }

  public hexRound(fractionalQ: number, fractionalR: number): { q: number, r: number } {
    const fractionalS = -fractionalQ - fractionalR;
    let q = Math.round(fractionalQ);
    let r = Math.round(fractionalR);
    const s = Math.round(fractionalS);

    const qDiff = Math.abs(q - fractionalQ);
    const rDiff = Math.abs(r - fractionalR);
    const sDiff = Math.abs(s - fractionalS);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    }
    
    return { q, r };
  }

  // Corners relative to center
  public hexCorners(q: number, r: number): Point[] {
    const center = this.hexToPixel(q, r);
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30; // Pointy topped offset
      const angleRad = Math.PI / 180 * angleDeg;
      corners.push({
        x: center.x + this.hexSize * Math.cos(angleRad),
        y: center.y + this.hexSize * Math.sin(angleRad)
      });
    }
    return corners;
  }
}
