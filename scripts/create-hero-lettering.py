"""Generate connected Tinta lettering with a flowing handwriting reveal."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent.parent
font = TTFont(ROOT / 'assets/fonts/Tinta-Regular.ttf')
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
width = 0
font_size = font['head'].unitsPerEm
left, bottom, right, top = float('inf'), float('inf'), float('-inf'), float('-inf')
period_x = None
letter_paths = []
# Pen routes through the middle of Tinta's ink, in the font's coordinates.
# The font outlines stay fixed; these routes only uncover the finished ink.
pen_routes = {
    's': ['M64 134 Q35 155 20 154 Q-20 150 5 126 Q8 112 54 97 Q102 80 102 40 Q102 -6 52 -6 Q20 -6 42 20 Q112 110 212 134'],
    'e': ['M5 125 Q50 90 78 130 Q100 154 90 170 Q80 192 36 163 Q1 140 1 91 Q1 28 65 28 Q95 28 150 85 Q195 132 216 134'],
    'c': ['M28 117 Q55 120 43 140 Q10 163 -4 129 Q-24 58 10 22 Q38 -10 68 40 Q98 126 128 134 Q148 140 164 134'],
    'o': ['M5 134 Q-18 101 -18 60 Q-18 14 23 14 Q60 14 81 65 Q98 120 72 147 Q30 177 23 146 Q20 115 80 119 Q125 118 170 134'],
    'n': ['M3 134 Q7 105 0 20 Q12 74 44 108 Q67 134 91 132 Q116 130 105 70 Q95 15 123 15 Q147 15 180 64 Q230 135 259 134'],
    'd': ['M47 134 Q10 162 -6 115 Q-20 68 7 29 Q32 -10 68 45 Q110 100 116 203 Q116 293 67 293 Q17 293 43 217 Q60 154 106 136 Q140 129 206 134'],
    'l': ['M0 133 Q45 157 79 224 Q117 292 95 313 Q65 343 30 272 Q1 207 1 133 Q1 26 52 26 Q80 26 115 80 Q155 134 194 134'],
    'i': ['M4 134 Q-6 15 22 7 Q65 -15 110 65 Q157 130 186 134', 'M8 186 L8.1 186'],
    'f': ['M6 135 Q55 162 106 195 Q168 238 146 246 Q130 254 104 251 Q43 244 16 163 Q-13 85 -13 -10 Q-13 -136 25 -136 Q70 -136 80 -55 Q91 28 53 93 Q29 116 1 119 Q15 86 58 100 Q150 125 209 134'],
    '.': ['M23 25 L20 0'],
}
for char in 'second life.':
    # Some script fonts omit punctuation, so draw the closing dot separately.
    if ord(char) not in cmap:
        if char == '.':
            period_x = width + 45
            left, bottom = min(left, period_x - 32), min(bottom, -72)
            right, top = max(right, period_x + 32), max(top, -8)
            width += 140
        continue
    glyph = glyphs[cmap[ord(char)]]
    if char != ' ':
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        letter_paths.append((char, width, glyph.width, pen.getCommands()))
    bounds = BoundsPen(glyphs)
    glyph.draw(bounds)
    if bounds.bounds:
        x0, y0, x1, y1 = bounds.bounds
        left, bottom = min(left, width + x0), min(bottom, y0)
        right, top = max(right, width + x1), max(top, y1)
    width += glyph.width
view_x, view_y = left - 80, -top - 70
view_width, view_height = right - left + 160, top - bottom + 140

letter_markup = []
letter_masks = []
for index, (char, x, advance, path) in enumerate(letter_paths):
    delay = 1.8 * x / max(width, 1)
    duration = max(.06, 1.8 * advance / max(width, 1))
    mask_id = f'hero-letter-mask-{index}'
    routes = pen_routes[char]
    route_markup = []
    for route_index, route in enumerate(routes):
        route_duration = duration * (.8 if len(routes) > 1 and route_index == 0 else .2 if len(routes) > 1 else 1)
        route_delay = delay + (duration * .8 if route_index else 0)
        route_markup.append(
            f'<path class="hero-letter-reveal" d="{route}" '
            f'transform="translate({x} 0) scale(1,-1)" pathLength="1" '
            f'fill="none" stroke="white" stroke-width="54" stroke-linecap="round" '
            f'stroke-linejoin="round" style="--letter-delay:{route_delay:.3f}s;'
            f'--letter-duration:{route_duration:.3f}s"/>'
        )
    letter_masks.append(
        f'<mask id="{mask_id}" maskUnits="userSpaceOnUse" '
        f'x="{view_x}" y="{view_y}" width="{view_width}" height="{view_height}">'
        f'{"".join(route_markup)}</mask>'
    )
    letter_markup.append(
        f'<g mask="url(#{mask_id})">'
        f'<path class="hero-letter-fill" d="{path}" '
        f'transform="translate({x} 0) scale(1,-1)"/></g>'
    )
period_mark = (f'<circle class="hero-letter-period" cx="{period_x}" cy="-40" r="32" '
               f'style="--letter-delay:{1.8 * (period_x or width) / max(width, 1):.3f}s"/>'
               if period_x is not None else '')
if period_x is not None:
    letter_markup.append(period_mark)
letter_shapes = ''.join(letter_markup)
svg = (
    f'<svg class="hero-handwriting" viewBox="{view_x} {view_y} {view_width} {view_height}" '
    'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
    f'<defs>{"".join(letter_masks)}</defs>'
    f'<g class="hero-lettering">{letter_shapes}</g></svg>'
)
(ROOT / 'assets/hero-second-life.svg').write_text(svg, encoding='utf-8')
html_path = ROOT / 'index.html'
html = html_path.read_text(encoding='utf-8')
start, end = '<!-- hero-script:start -->', '<!-- hero-script:end -->'
before, rest = html.split(start, 1)
_, after = rest.split(end, 1)
html_path.write_text(before + start + svg + end + after, encoding='utf-8')
print('Tinta handwritten reveal generated.')
