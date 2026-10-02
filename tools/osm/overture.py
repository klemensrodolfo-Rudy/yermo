# Baja las siluetas de edificios de Overture Maps (Google Open Buildings, Microsoft y otros) para una zona.
# Necesita: pip install duckdb. Uso: python tools/osm/overture.py hurlingham  (lee tools/osm/<zona>/bbox.json de dl_api.mjs)
import duckdb, sys, json, time, os
from collections import Counter
RELEASE = '2026-09-23.0'
d = os.path.join(os.path.dirname(__file__), sys.argv[1])
b = json.load(open(os.path.join(d, 'bbox.json')))
con = duckdb.connect()
for ext in ('httpfs', 'spatial'):
    con.execute(f'INSTALL {ext}; LOAD {ext};')
con.execute("SET s3_region='us-west-2'")
t = time.time()
rows = con.execute(f"""
  SELECT height, num_floors, class, names.primary AS name, sources[1].dataset AS src, ST_AsGeoJSON(geometry) AS g
  FROM read_parquet('s3://overturemaps-us-west-2/release/{RELEASE}/theme=buildings/type=building/*', hive_partitioning=1)
  WHERE bbox.xmin > {b['W']} AND bbox.xmax < {b['E']} AND bbox.ymin > {b['S']} AND bbox.ymax < {b['N']}
""").fetchall()
print(len(rows), 'edificios en', round(time.time() - t), 's')
out = []
for h, f, c, n, src, g in rows:
    g = json.loads(g)
    ring = g['coordinates'][0] if g['type'] == 'Polygon' else g['coordinates'][0][0]
    out.append({'h': h, 'f': f, 'c': c, 'n': n, 'src': src, 'r': [[round(x, 7), round(y, 7)] for x, y in ring]})
json.dump(out, open(os.path.join(d, 'overture.json'), 'w'))
print(Counter(r['src'] for r in out).most_common())
