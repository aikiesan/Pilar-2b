"""Builds a static mock of the Itaberá (SP) municipality profile from real IBGE,
MapBiomas and PILAR-2b API data downloaded into ./dl. Throwaway spike."""
import json, math, sys, html
from pathlib import Path

DL = Path(sys.argv[1])
OUT = Path(sys.argv[2])

def sidra(name):
    d = json.load(open(DL / name, encoding='utf-8'))
    return d[0], d[1:]

def fmt(n, dec=0):
    s = f"{n:,.{dec}f}"
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')

# ---------- geometry ----------
def rings(gj):
    out = []
    feats = gj['features'] if gj.get('type') == 'FeatureCollection' else [gj]
    for f in feats:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for p in polys:
            out.append(p[0])
    return out

def load(name):
    return json.load(open(DL / name, encoding='utf-8'))

class Proj:
    def __init__(self, allrings, w, h, pad=8):
        xs = [x for r in allrings for x, _ in r]; ys = [y for r in allrings for _, y in r]
        self.lat0 = math.radians((min(ys) + max(ys)) / 2)
        k = math.cos(self.lat0)
        self.minx, self.maxx = min(xs) * k, max(xs) * k
        self.miny, self.maxy = min(ys), max(ys)
        sx = (w - 2 * pad) / (self.maxx - self.minx); sy = (h - 2 * pad) / (self.maxy - self.miny)
        self.s = min(sx, sy); self.k = k
        self.ox = pad + ((w - 2 * pad) - (self.maxx - self.minx) * self.s) / 2
        self.oy = pad + ((h - 2 * pad) - (self.maxy - self.miny) * self.s) / 2
    def p(self, lon, lat):
        return (self.ox + (lon * self.k - self.minx) * self.s, self.oy + (self.maxy - lat) * self.s)
    def path(self, rs):
        parts = []
        for r in rs:
            pts = [self.p(x, y) for x, y in r]
            parts.append('M' + 'L'.join(f"{x:.1f} {y:.1f}" for x, y in pts) + 'Z')
        return ''.join(parts)

def centroid(rs):
    r = max(rs, key=len)
    a = cx = cy = 0
    for (x0, y0), (x1, y1) in zip(r, r[1:]):
        c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    a *= 0.5
    return cx / (6 * a), cy / (6 * a)

def hav(a, b):
    R = 6371; (lo1, la1), (lo2, la2) = a, b
    p1, p2 = math.radians(la1), math.radians(la2)
    d = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(d))

SELF = '3521705'
NB = {'3512605': 'Coronel Macedo', '3521804': 'Itaí', '3522406': 'Itapeva', '3522802': 'Itaporanga',
      '3523206': 'Itararé', '3543501': 'Riversul'}
NB_CH4 = {'3512605': 3775453.57, '3521804': 19766788.89, '3522406': 26712819.45, '3522802': 3586730.01,
          '3523206': 8353059.18, '3543501': 2569640.99, SELF: 10649186.70}
geo = {c: rings(load(f'mun_{c}.geojson')) for c in [SELF, *NB]}
region = rings(load('reg_imediata.geojson'))
sp_state = rings(load('sp_state.geojson'))

cent = centroid(geo[SELF])
ITAPEVA_CITY = (-48.8755, -23.9819)
SAO_PAULO = (-46.6333, -23.5505)
d_itapeva = hav(cent, ITAPEVA_CITY)
d_sp = hav(cent, SAO_PAULO)

def dms(v, pos, neg):
    h = pos if v >= 0 else neg; v = abs(v)
    return f"{int(v)}°{int((v % 1) * 60):02d}′{h}"
coord = f"{dms(cent[1], 'N', 'S')} {dms(cent[0], 'L', 'O')}"

# Hero map: Itaberá, its neighbours and the municipalities around them
allsp = load('sp_mun_int.geojson')['features']
names = {str(m['id']): m['nome'] for m in json.load(open(DL / 'sp_nomes.json', encoding='utf-8'))}
spg = {f['properties']['codarea']: rings(f) for f in allsp}
pr = rings(load('pr_state.geojson'))
W, H = 760, 560
nbr = [r for c in [SELF, *NB] for r in spg[c]]
xs = [x for r in nbr for x, _ in r]; ys = [y for r in nbr for _, y in r]
cx0, cy0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
hw, hh = (max(xs) - min(xs)) * 0.62, (max(ys) - min(ys)) * 0.62
frame = [[(cx0 - hw, cy0 - hh), (cx0 + hw, cy0 - hh), (cx0 + hw, cy0 + hh), (cx0 - hw, cy0 + hh)]]
P = Proj(frame, W, H, pad=0)
def inside(px, py, m=0): return m <= px <= W - m and m <= py <= H - m
hero = [f'<rect width="{W}" height="{H}" class="m-sea"/>', f'<path d="{P.path(pr)}" class="m-pr"/>']
others = []
for c, rs in spg.items():
    if c == SELF or c in NB: continue
    bx = [P.p(x, y) for r in rs for x, y in r[::8]]
    if not any(inside(px, py) for px, py in bx): continue
    hero.append(f'<path d="{P.path(rs)}" class="m-other"><title>{names.get(c, c)}</title></path>')
    others.append(c)
for c, name in NB.items():
    hero.append(f'<path d="{P.path(spg[c])}" class="m-nb"><title>{name}</title></path>')
hero.append(f'<path d="{P.path(spg[SELF])}" class="m-self"/>')
x, y = P.p(*cent)
hero.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{W - 60}" y2="44" class="m-route"/>')
hero.append(f'<text x="{W - 16}" y="26" class="m-cap-lbl">São Paulo ↗ {fmt(d_sp)} km</text>')
placed = []
def free(px, py, w):
    return all(abs(px - qx) > (w + qw) / 2 + 6 or abs(py - qy) > 16 for qx, qy, qw in placed)
placed.append((x, y, 120))
RESERVED = [(W - 200, 0, W, 50), (0, H - 230, 225, H)]
def clear(px, py, w): return all(not (a - w/2 - 4 < px < c + w/2 + 4 and b - 10 < py < d + 14) for a, b, c, d in RESERVED)
NUDGE = {'Coronel Macedo': (14, -8), 'Itaporanga': (-4, 10)}
for c, name in NB.items():
    lx_, ly_ = P.p(*centroid(spg[c])); dx, dy = NUDGE.get(name, (0, 0)); lx_ += dx; ly_ += dy
    hero.append(f'<text x="{lx_:.0f}" y="{ly_:.0f}" class="m-lbl">{name}</text>'); placed.append((lx_, ly_, len(name) * 8))
for c in sorted(others, key=lambda c: -sum(len(r) for r in spg[c])):
    lx_, ly_ = P.p(*centroid(spg[c])); nm = names.get(c, c); w = len(nm) * 6.5
    if inside(lx_, ly_, 30) and free(lx_, ly_, w) and clear(lx_, ly_, w):
        hero.append(f'<text x="{lx_:.0f}" y="{ly_:.0f}" class="m-lbl-o">{nm}</text>'); placed.append((lx_, ly_, w))
px_, py_ = P.p(-49.75, -24.35)
if False: hero.append(f'<text x="{px_:.0f}" y="{py_:.0f}" class="m-state">PARANÁ</text>')
hero.append(f'<text x="{x:.0f}" y="{y + 2:.0f}" class="m-self-lbl">Itaberá</text>')
ix, iy = P.p(*ITAPEVA_CITY)
hero.append(f'<circle cx="{ix:.1f}" cy="{iy:.1f}" r="4" class="m-city"/>')
hero.append(f'<text x="{ix + 8:.0f}" y="{iy + 4:.0f}" class="m-city-lbl">Itapeva (cidade) · {fmt(d_itapeva)} km</text>')
px20 = 20 * P.s / (111.32)
hero.append(f'<g transform="translate({W - 20 - px20:.0f},{H - 20})"><line x1="0" y1="0" x2="{px20:.0f}" y2="0" class="m-scale"/>'
            f'<line x1="0" y1="-4" x2="0" y2="4" class="m-scale"/><line x1="{px20:.0f}" y1="-4" x2="{px20:.0f}" y2="4" class="m-scale"/>'
            f'<text x="0" y="-8" class="m-scale-lbl">20 km</text></g>')
hero_svg = f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Mapa de Itaberá, seus vizinhos e a região">{"".join(hero)}</svg>'

# State inset
P2 = Proj(sp_state, 220, 150, pad=6)
ins = [f'<path d="{P2.path(sp_state)}" class="i-state"/>', f'<path d="{P2.path(region)}" class="i-region"/>',
       f'<path d="{P2.path(geo[SELF])}" class="i-self"/>']
a, b = P2.p(*cent); c2, d2 = P2.p(*SAO_PAULO)
ins.append(f'<line x1="{a:.1f}" y1="{b:.1f}" x2="{c2:.1f}" y2="{d2:.1f}" class="i-route"/>')
ins.append(f'<circle cx="{c2:.1f}" cy="{d2:.1f}" r="3" class="i-cap"/><text x="{c2 - 4:.0f}" y="{d2 - 7:.0f}" class="i-lbl" text-anchor="end">São Paulo</text>')
inset_svg = f'<svg viewBox="0 0 220 150" role="img" aria-label="Posição de Itaberá no estado de São Paulo">{"".join(ins)}</svg>'

# ---------- census ----------
h, r = sidra('pophist.json')
hist = [(int(x['D3N']), int(x['V'])) for x in r] + [(2022, 17983)]
h, r = sidra('situacao.json')
sit = {x['D4N']: int(x['V']) for x in r}
urb = sit['Urbana'] / sit['Total']

h, r = sidra('idade.json')
groups = [f"{a} a {a + 4} anos" for a in range(0, 100, 5)] + ['100 anos ou mais']
pyr = {}
for x in r:
    if x['D6N'] != 'Total' or x['D5N'] not in groups:
        continue
    pyr.setdefault(x['D5N'], {})[x['D4N']] = int(x['V']) if x['V'].isdigit() else 0
# collapse 80+
rows = []
for g in groups[:16]:
    rows.append((g.replace(' anos', ''), pyr[g]['Homens'], pyr[g]['Mulheres']))
m80 = sum(pyr[g]['Homens'] for g in groups[16:]); f80 = sum(pyr[g]['Mulheres'] for g in groups[16:])
rows.append(('80 ou mais', m80, f80))
mx = max(max(a, b) for _, a, b in rows)
men = sum(a for _, a, _ in rows); women = sum(b for _, _, b in rows)
age60 = sum(a + b for g, a, b in rows[12:])
age_u15 = sum(a + b for g, a, b in rows[:3])

pw, ph, mid, rh = 520, 17 * 22 + 30, 260, 22
py = []
for i, (g, m, f) in enumerate(reversed(rows)):
    yy = 8 + i * rh
    wm = (m / mx) * 190; wf = (f / mx) * 190
    py.append(f'<rect x="{mid - 44 - wm:.1f}" y="{yy}" width="{wm:.1f}" height="{rh - 6}" rx="2" class="p-m"><title>Homens {g}: {fmt(m)}</title></rect>')
    py.append(f'<rect x="{mid + 44:.1f}" y="{yy}" width="{wf:.1f}" height="{rh - 6}" rx="2" class="p-f"><title>Mulheres {g}: {fmt(f)}</title></rect>')
    py.append(f'<text x="{mid}" y="{yy + 12}" class="p-age" text-anchor="middle">{g.replace(" a ", "–")}</text>')
py.append(f'<text x="{mid - 44}" y="{ph - 4}" class="p-key" text-anchor="end">Homens · {fmt(men)}</text>')
py.append(f'<text x="{mid + 44}" y="{ph - 4}" class="p-key">Mulheres · {fmt(women)}</text>')
pyr_svg = f'<svg viewBox="0 0 {pw} {ph}" role="img" aria-label="Pirâmide etária de Itaberá, Censo 2022">{"".join(py)}</svg>'

# population line
lw, lh = 360, 150
ys_ = [v for _, v in hist]; lo, hi = 13000, 20000
def lx(yr): return 24 + (yr - 1970) / (2022 - 1970) * (lw - 96)
def ly(v): return 16 + (hi - v) / (hi - lo) * (lh - 46)
pts = ' '.join(f"{lx(a):.1f},{ly(b):.1f}" for a, b in hist)
ln = [f'<line x1="24" x2="{lw - 52}" y1="{ly(15000):.1f}" y2="{ly(15000):.1f}" class="grid"/>',
      f'<line x1="24" x2="{lw - 52}" y1="{ly(18000):.1f}" y2="{ly(18000):.1f}" class="grid"/>',
      f'<text x="{lw - 4}" y="{ly(15000) + 4:.1f}" class="ax" text-anchor="end">15 mil</text><text x="{lw - 4}" y="{ly(18000) + 4:.1f}" class="ax" text-anchor="end">18 mil</text>',
      f'<polyline points="{pts}" class="l-line"/>']
for a, b in hist:
    ln.append(f'<circle cx="{lx(a):.1f}" cy="{ly(b):.1f}" r="3.5" class="l-dot{" l-now" if a == 2022 else ""}"/>')
    ln.append(f'<text x="{lx(a):.1f}" y="{lh - 8}" class="ax" text-anchor="middle">{a}</text>')
pk = max(hist, key=lambda t: t[1])
ln.append(f'<text x="{lx(pk[0]):.1f}" y="{ly(pk[1]) - 9:.1f}" class="l-ann" text-anchor="middle">pico: {fmt(pk[1])}</text>')
line_svg = f'<svg viewBox="0 0 {lw} {lh}" role="img" aria-label="População de Itaberá nos censos de 1970 a 2022">{"".join(ln)}</svg>'

# ---------- MapBiomas ----------
mb = json.load(open(DL / 'mapbiomas_itabera.json', encoding='utf-8'))
years = list(range(1985, 2026))
GROUPS = [
    ('Soja', ['3.2.1.1. Soybean'], 'var(--c-soy)'),
    ('Outras lavouras', ['3.2.1.5. Other Temporary Crops', '3.2.2.1. Coffee', '3.2.2.2. Citrus', '3.2.2.4. Other Perennial Crops', '3.2.1.2. Sugar cane'], 'var(--c-crop)'),
    ('Pastagem', ['3.1. Pasture'], 'var(--c-pasture)'),
    ('Mosaico de usos', ['3.4. Mosaic of Uses'], 'var(--c-mosaic)'),
    ('Silvicultura', ['3.3. Forest Plantation'], 'var(--c-plant)'),
    ('Vegetação nativa', ['1.1. Forest Formation', '1.2. Savanna Formation', '2.1. Wetland', '2.3. Grassland Formation', '2.6. Rocky Outcrop'], 'var(--c-forest)'),
    ('Água, cidade e outros', ['4.2. Urban Area', '4.6. Other non Vegetated Areas', '5.1. River, Lake and Ocean'], 'var(--c-other)'),
]
series = {}
for name, classes, _ in GROUPS:
    s = [0] * len(years)
    for cls, vals in mb:
        if cls in classes:
            s = [a + b for a, b in zip(s, vals)]
    series[name] = s
tot = [sum(series[n][i] for n, *_ in GROUPS) for i in range(len(years))]
aw, ah = 760, 300
L, R_, T, B = 16, 200, 32, 28
def axx(i): return L + i / (len(years) - 1) * (aw - L - R_)
def axy(v): return T + (1 - v / max(tot)) * (ah - T - B)
area = []
base = [0] * len(years)
for name, _, col in GROUPS:
    top = [b + v for b, v in zip(base, series[name])]
    up = ' '.join(f"{axx(i):.1f},{axy(top[i]):.1f}" for i in range(len(years)))
    dn = ' '.join(f"{axx(i):.1f},{axy(base[i]):.1f}" for i in reversed(range(len(years))))
    area.append(f'<polygon points="{up} {dn}" style="fill:{col}"><title>{name}</title></polygon>')
    my = (axy(top[-1]) + axy(base[-1])) / 2
    if series[name][-1] / tot[-1] > 0.04:
        area.append(f'<text x="{aw - R_ + 8}" y="{my + 4:.1f}" class="a-lbl">{name} <tspan class="a-pct">{round(100 * series[name][-1] / tot[-1])}%</tspan></text>')
    base = top
for yr in (1985, 1995, 2005, 2015, 2025):
    i = yr - 1985
    area.append(f'<text x="{axx(i):.1f}" y="{ah - 8}" class="ax" text-anchor="middle">{yr}</text>')
# annotation: crossover year
cross = next(yr for yr, i in zip(years, range(len(years))) if series['Soja'][i] > series['Pastagem'][i])
ci = cross - 1985
area.append(f'<line x1="{axx(ci):.1f}" x2="{axx(ci):.1f}" y1="{T - 24}" y2="{ah - B}" class="a-mark"/>')
area.append(f'<text x="{axx(ci)+6:.1f}" y="{T - 12}" class="a-ann">{cross}: a soja passa o pasto</text>')
area_svg = f'<svg viewBox="0 0 {aw} {ah}" role="img" aria-label="Uso da terra em Itaberá, 1985 a 2025 (MapBiomas)">{"".join(area)}</svg>'
pas85, pas25 = series['Pastagem'][0], series['Pastagem'][-1]
soy85, soy25 = series['Soja'][0], series['Soja'][-1]
nat85, nat25 = series['Vegetação nativa'][0], series['Vegetação nativa'][-1]

# ---------- PAM / PPM ----------
h, r = sidra('pam.json')
crops = {}
for x in r:
    if x['D2N'].startswith('Quantidade') and x['V'].isdigit() and x['D4N'] not in ('Total', 'Café (em grão) Arábica'):
        crops[x['D4N']] = int(x['V'])
nice = {'Soja (em grão)': 'Soja', 'Milho (em grão)': 'Milho', 'Trigo (em grão)': 'Trigo', 'Laranja': 'Laranja',
        'Feijão (em grão)': 'Feijão', 'Batata-inglesa': 'Batata', 'Tomate': 'Tomate', 'Banana (cacho)': 'Banana',
        'Sorgo (em grão)': 'Sorgo', 'Limão': 'Limão'}
top = sorted(crops.items(), key=lambda t: -t[1])[:8]
cmax = top[0][1]
crop_rows = ''.join(
    f'<li><span class="bl-name">{nice.get(k, k)}</span><span class="bl-bar"><i style="width:{100 * v / cmax:.1f}%"></i></span><span class="bl-val">{fmt(v)} t</span></li>'
    for k, v in top)
h, r = sidra('ppm.json')
herd = {x['D4N']: int(x['V']) for x in r if x['V'].isdigit()}
area_harv = 88947

# ---------- PILAR-2b ----------
N4 = 10649186.70
mix = [('Palha de soja', 5606603), ('Palha de milho', 4636559), ('Resíduos urbanos', 224439 + 9961),
       ('Pecuária', 171104)]
kwh = N4 * 35.8 * 0.35 / 3.6
nb_sorted = sorted(NB_CH4.items(), key=lambda t: -t[1])
nbmax = nb_sorted[0][1]
nb_rows = ''.join(
    f'<li class="{"is-self" if c == SELF else ""}"><span class="bl-name">{"<b>Itaberá</b>" if c == SELF else f"<a href=#>{NB[c]}</a>"}</span>'
    f'<span class="bl-bar"><i style="width:{100 * v / nbmax:.1f}%"></i></span><span class="bl-val">{fmt(v / 1e6, 1)} mi</span></li>'
    for c, v in nb_sorted)
self_pos = [c for c, _ in nb_sorted].index(SELF) + 1
mix_tot = sum(v for _, v in mix)
mix_bar = ''.join(f'<i style="flex:{v}" class="mx-{i}" title="{n}"></i>' for i, (n, v) in enumerate(mix))
mix_leg = ''.join(f'<li><i class="mx-{i}"></i>{n} <b>{round(100 * v / mix_tot)}%</b></li>' for i, (n, v) in enumerate(mix))

ctx = dict(**globals())
tpl = Path(sys.argv[3]).read_text(encoding='utf-8')
page = tpl
for k, v in {
    'HERO_SVG': hero_svg, 'INSET_SVG': inset_svg, 'PYR_SVG': pyr_svg, 'LINE_SVG': line_svg, 'AREA_SVG': area_svg,
    'CROP_ROWS': crop_rows, 'NB_ROWS': nb_rows, 'MIX_BAR': mix_bar, 'MIX_LEG': mix_leg,
    'D_ITAPEVA': fmt(d_itapeva), 'D_SP': fmt(d_sp), 'COORD': coord,
    'URB': str(round(urb * 100)), 'RUR': str(100 - round(urb * 100)), 'URB_N': fmt(sit['Urbana']), 'RUR_N': fmt(sit['Rural']),
    'AGE60': str(round(100 * age60 / 17983)), 'AGEU15': str(round(100 * age_u15 / 17983)),
    'PAS85': fmt(pas85), 'PAS25': fmt(pas25), 'SOY85': fmt(soy85), 'SOY25': fmt(soy25), 'NAT85': fmt(nat85), 'NAT25': fmt(nat25),
    'CROSS': str(cross), 'AREA_HARV': fmt(area_harv),
    'BOV': fmt(herd.get('Bovino', 0)), 'SUI': fmt(herd.get('Suíno - total', 0)), 'GAL': fmt(herd.get('Galináceos - total', 0)),
    'SOJA_T': fmt(crops['Soja (em grão)']), 'TRIGO_T': fmt(crops['Trigo (em grão)']), 'LARANJA_T': fmt(crops['Laranja']),
    'GWH': fmt(kwh / 1e6, 0), 'NB_POS': str(self_pos),
}.items():
    page = page.replace('{{' + k + '}}', v)
OUT.write_text(page, encoding='utf-8')
print('ok', OUT, f'd_itapeva={d_itapeva:.1f} d_sp={d_sp:.1f} cross={cross} urb={urb:.3f} gwh={kwh/1e6:.1f}')
