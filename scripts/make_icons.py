#!/usr/bin/env python3
"""Generate the pixel-art golf ball icons: icon.svg and apple-touch-icon.png.

Run from the repository root: python3 scripts/make_icons.py
Uses only the standard library.
"""
import struct
import zlib

GRID = 16
BACKGROUND = '#154d35'
BALL = '#ffffff'
DIMPLE = '#dfe6dc'
SHADOW = '#b9c7b4'
GRASS = '#bee278'

CENTER_X, CENTER_Y, RADIUS = 8, 7.5, 5.6
DIMPLES = {(6, 5), (9, 5), (7, 7), (10, 7), (5, 8), (8, 9), (10, 10), (6, 10)}


def pixels():
    """Return {(x, y): colour} for every non-background cell of the 16x16 grid."""
    cells = {}
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + .5 - CENTER_X, y + .5 - CENTER_Y
            distance = dx * dx + dy * dy
            if distance > RADIUS * RADIUS:
                continue
            on_shadow_edge = dx + dy > 4.2 and distance > (RADIUS - 1.6) ** 2
            cells[(x, y)] = SHADOW if on_shadow_edge else DIMPLE if (x, y) in DIMPLES else BALL
    for x in range(3, 13):
        cells[(x, 14)] = GRASS
    return cells


def write_svg(path):
    rects = ''.join(f'<rect x="{x * 4}" y="{y * 4}" width="4" height="4" fill="{colour}"/>'
                    for (x, y), colour in pixels().items())
    with open(path, 'w') as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">'
                f'<rect width="64" height="64" rx="12" fill="{BACKGROUND}"/>{rects}</svg>\n')


def rgb(colour):
    return bytes(int(colour[i:i + 2], 16) for i in (1, 3, 5))


def write_png(path, size=180, cell=11):
    """Square, full-bleed PNG; iOS rounds the corners itself."""
    offset = (size - GRID * cell) // 2
    cells = pixels()
    rows = []
    for py in range(size):
        row = bytearray([0])  # PNG filter type: none
        for px in range(size):
            x, y = (px - offset) // cell, (py - offset) // cell
            inside = 0 <= px - offset < GRID * cell and 0 <= py - offset < GRID * cell
            row += rgb(cells.get((x, y), BACKGROUND) if inside else BACKGROUND)
        rows.append(bytes(row))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) +
                chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b''))


if __name__ == '__main__':
    write_svg('icon.svg')
    write_png('apple-touch-icon.png')
