# leaflet.ChineseCRS
[Leaflet](https://leafletjs.com/) plugin for using Chinese tile providers without offset.

This plugin uses the CRS appoach: Set the `crs` option of the `map` object, and
your features with WGS84 coordinates (EPSG:4326) will be directly usable.

## Usage

Add `leaflet.ChineseCRS.js` to your html/js project.

* `L.ChineseCRS.wgs_gcj({lat, lng})`: Convert coordinates from WGS84 (EPSG:4326) to GCJ02.
* `L.ChineseCRS.wgs_bd({lat, lng})`: Convert coordinates from WGS84 (EPSG:4326) to BD09.
* `L.ChineseCRS.gcj_wgs({lat, lng})`: Convert coordinates from GCJ02 to WGS84 (EPSG:4326).
* `L.ChineseCRS.bd_wgs({lat, lng})`: Convert coordinates from BD09 to WGS84 (EPSG:4326).
* `L.ChineseCRS.Proj_GCJ02_3857`: `L.Projection` object for Pseudo-Mercator (EPSG:3857) with GCJ02 coordinates.
* `L.ChineseCRS.Proj_BaiduMercator`: `L.Projection` object for Baidu Mercator with BD09 coordinates.
* `L.ChineseCRS.CRS_GCJ02_3857`: `L.CRS` object for Pseudo-Mercator (EPSG:3857) with GCJ02 coordinates.
* `L.ChineseCRS.CRS_BaiduMercator`: `L.CRS` object for Baidu Mercator with BD09 coordinates. This must be used with `L.BaiduTileLayer`.
* `L.ChineseCRS.BaiduTileLayer`: Tile layer for Baidu map.
* `L.ChineseCRS.QQTileLayer`: `L.TileLayer`, with `{x4}` and `{y4}` for QQ map's url.
* `L.ChineseCRS.TimestampTileLayer`: `L.TileLayer`, with `{t}` specifying current timestamp (milliseconds).
* `L.ChineseCRS.getTileLayer(type, url, options)`:
  * `type=baidu`: return `L.ChineseCRS.BaiduTileLayer` object.
  * `type=qq`: return `L.ChineseCRS.QQTileLayer` object.
  * `type=timestamp`: return `L.ChineseCRS.TimestampTileLayer` object.
  * other: return `L.TileLayer` object.

Example: `demo_gcj.html`, `demo_baidu.html`.

## Notes

The map projection chain:

* Proj_GCJ02_3857: WGS84(EPSG:4326) -> GCJ02 -> Pseudo-Mercator (EPSG:3857)
* Proj_BaiduMercator: WGS84(EPSG:4326) -> GCJ02 -> BD09 -> Baidu Mercator

Baidu Mercator is an (Ellipsoidal) Mercator projection with different ellipsoid parameters (Clarke 1866). This is guessed (using scipy) from Baidu's original approximate algorithm. (Inspired from [leaflet-tileLayer-baidugaode](https://github.com/muyao1987/leaflet-tileLayer-baidugaode))

PROJ string:

```
+proj=merc +a=6378206.4 +b=6356583.8 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs
```

## Acknowledgement
This work is based on [PRCoords](https://github.com/Artoria2e5/PRCoords) (GCJ02 and BD09 algorithms) and [PROJ](https://github.com/OSGeo/PROJ) (Mercator algorithms).

See also: [Leaflet.ChineseTmsProviders](https://github.com/htoooth/Leaflet.ChineseTmsProviders), [leaflet-tileLayer-baidugaode](https://github.com/muyao1987/leaflet-tileLayer-baidugaode) (for provider urls), [cntms](https://github.com/gumblex/cntms) (tile image reverse proxy, for GIS software).
