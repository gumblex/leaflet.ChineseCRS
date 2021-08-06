(function(L) {
'use strict';

function _coord_diff(a, b) {
    return new L.LatLng(a.lat - b.lat, a.lng - b.lng);
}

function wgs_gcj(wgs) {
    if (!(wgs.lat >= 0.8293 && wgs.lat <= 55.8271 &&
          wgs.lng >= 72.004 && wgs.lng <= 137.8347)) {
        return wgs;
    }

    /// Krasovsky 1940 ellipsoid
    /// @const
    var GCJ_A = 6378245;
    var GCJ_EE = 0.00669342162296594323; // f = 1/298.3; e^2 = 2*f - f**2

    var x = wgs.lng - 105, y = wgs.lat - 35;

    // These distortion functions accept (x = lng - 105, y = lat - 35).
    // They return distortions in terms of arc lengths, in meters.
    //
    // In other words, you can pretty much figure out how much you will be off
    // from WGS-84 just through evaulating them...
    //
    // For example, at the (mapped) center of China (105E, 35N), you get a
    // default deviation of <300, -100> meters.
    var dLat_m = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y +
        0.2 * Math.sqrt(Math.abs(x)) + (
            2 * Math.sin(x * 6 * Math.PI) + 2 * Math.sin(x * 2 * Math.PI) +
            2 * Math.sin(y * Math.PI) + 4 * Math.sin(y / 3 * Math.PI) +
            16 * Math.sin(y / 12 * Math.PI) + 32 * Math.sin(y / 30 * Math.PI)
        ) * 20 / 3;
    var dLon_m = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y +
        0.1 * Math.sqrt(Math.abs(x)) + (
            2 * Math.sin(x * 6 * Math.PI) + 2 * Math.sin(x * 2 * Math.PI) +
            2 * Math.sin(x * Math.PI) + 4 * Math.sin(x / 3 * Math.PI) +
            15 * Math.sin(x / 12 * Math.PI) + 30 * Math.sin(x / 30 * Math.PI)
        ) * 20 / 3;

    var radLat = wgs.lat / 180 * Math.PI;
    var magic = 1 - GCJ_EE * Math.pow(Math.sin(radLat), 2); // just a common expr

    // [[:en:Latitude#Length_of_a_degree_of_latitude]]
    var lat_deg_arclen = (Math.PI / 180) * (GCJ_A * (1 - GCJ_EE)) / Math.pow(magic, 1.5);
    // [[:en:Longitude#Length_of_a_degree_of_longitude]]
    var lon_deg_arclen = (Math.PI / 180) * (GCJ_A * Math.cos(radLat) / Math.sqrt(magic));

    // The screwers pack their deviations into degrees and disappear.
    // Note how they are mixing WGS-84 and Krasovsky 1940 ellipsoids here...
    return new L.LatLng(
        wgs.lat + (dLat_m / lat_deg_arclen),
        wgs.lng + (dLon_m / lon_deg_arclen),
    )
}

function gcj_bd(gcj) {
    var x = gcj.lng;
    var y = gcj.lat;

    // trivia: pycoordtrans actually describes how these values are calculated
    var r = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * Math.PI * 3000 / 180);
    var θ = Math.atan2(y, x) + 0.000003 * Math.cos(x * Math.PI * 3000 / 180);
    
    // Hard-coded default deviations again!
    return new L.LatLng(r * Math.sin(θ) + 0.0060, r * Math.cos(θ) + 0.0065);
}

// Yes, we can implement a "precise" one too.
// accuracy ~1e-7 deg (decimeter-level; exceeds usual data accuracy)
function bd_gcj(bd) {
    var x = bd.lng - 0.0065;
    var y = bd.lat - 0.0060;
    
    // trivia: pycoordtrans actually describes how these values are calculated
    var r = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000 / 180);
    var θ = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000 / 180);
    
    return new L.LatLng(r * Math.sin(θ), r * Math.cos(θ));
}

function gcj_wgs(gcj) {
    if (!(gcj.lat >= 0.83056 && gcj.lat <= 55.8296 &&
          gcj.lng >= 72.0077 && gcj.lng <= 137.8437)) {
        return gcj;
    }
    return _coord_diff(gcj, _coord_diff(wgs_gcj(gcj), gcj));
}

function bd_wgs(bd) {
    if (!(bd.lat >= 0.83676 && bd.lat <= 55.8355 &&
          bd.lng >= 72.0142 && bd.lng <= 137.8503)) {
        return bd;
    }
    return gcj_wgs(bd_gcj(bd));
}

function wgs_bd(bd) {
    return gcj_bd(wgs_gcj(bd));
}

function _exact_iter(fwd, rev) {
    return function rev_bored(heck) {
        var curr = rev(heck);
        var diff = {lat: Infinity, lng: Infinity};

        // Wait till we hit fixed point or get bored
        var i = 0;
        while (Math.max(Math.abs(diff.lat), Math.abs(diff.lng)) > 1e-6 && i++ < 8) {
            diff = _coord_diff(fwd(curr), heck);
            curr = _coord_diff(curr, diff);
        }
        return curr;
    }
}

var gcj_wgs_exact = _exact_iter(wgs_gcj, gcj_wgs);
var bd_wgs_exact = _exact_iter(wgs_bd, bd_wgs);


function pj_sinhpsi2tanphi(taup, e) {
    // From PROJ library
    var numit = 5;
    // min iterations = 1, max iterations = 2; mean = 1.954
    var rooteps = Math.sqrt(1e-15);
    var tol = rooteps / 10; // the criterion for Newton's method
    var tmax = 2 / rooteps; // threshold for large arg limit exact
    var e2m = 1 - e * e;
    var stol = tol * Math.max(1.0, Math.abs(taup));
    // The initial guess.  70 corresponds to chi = 89.18 deg (see above)
    var tau = Math.abs(taup) > 70 ? taup * Math.exp(e * Math.atanh(e)) : taup / e2m;
    if (!(Math.abs(tau) < tmax))      // handles +/-inf and nan and e = 1
        return tau;
    // If we need to deal with e > 1, then we could include:
    // if (e2m < 0) return std::numeric_limits<double>::quiet_NaN();
    var i = numit;
    while (i --> 0) {
        var tau1 = Math.sqrt(1 + tau * tau);
        var sig = Math.sinh( e * Math.atanh(e * tau / tau1) );
        var taupa = Math.sqrt(1 + sig * sig) * tau - sig * tau1;
        var dtau = ((taup - taupa) * (1 + e2m * (tau * tau)) /
                    (e2m * tau1 * Math.sqrt(1 + taupa * taupa)));
        tau += dtau;
        if (!(Math.abs(dtau) >= stol))  // backwards test to allow nans to succeed.
            break;
    }
    return tau;
}


var SphericalMercator_GCJ02 = {
    bounds: L.Projection.SphericalMercator.bounds,
    project: function(latlng) {
        var p_gcj = wgs_gcj(latlng);
        return L.Projection.SphericalMercator.project(p_gcj);
    },
    unproject: function(point) {
        var p_gcj = L.Projection.SphericalMercator.unproject(point);
        return gcj_wgs_exact(p_gcj);
    }
};


var CRS_GCJ02_3857 = L.Util.extend(L.CRS.EPSG3857, {
    code: 'USER:GCJ02_3857',
    projection: SphericalMercator_GCJ02,
});


var BaiduMercator_BD09 = {
    // Baidu uses EPSG:7008, Clarke 1866
    // PROJ:
    // +proj=merc +a=6378206.4 +b=6356583.8 +lat_ts=0.0 +lon_0=0.0
    // +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs
    A: 6378206.4,
    E: 0.08227185422300325876963654309,

    bounds: new L.Bounds(
        [20037725.5, -16095439.382927246],
        [-20037726.46909435, 19488378.9859151]
    ),
    project: function(latlng) {
        var p_bd = wgs_bd(latlng);
        var x = p_bd.lng * Math.PI/180 * this.A;
        var phi = p_bd.lat * Math.PI/180;
        var y = (Math.asinh(Math.tan(phi)) - this.E * Math.atanh(this.E * Math.sin(phi))) * this.A;
        return new L.Point(x, y);
    },
    unproject: function(point) {
        return bd_wgs_exact({
            lng: point.x / Math.PI*180 / this.A,
            lat: Math.atan(pj_sinhpsi2tanphi(
                Math.sinh(point.y / this.A), this.E)) / Math.PI*180
        });
    }
};


var CRS_BaiduMercator = L.Util.extend(L.CRS.EPSG3395, {
    code: 'USER:BaiduMercator',
    projection: BaiduMercator_BD09,

    transformation: (function () {
        var scale = Math.pow(2, -18-8);
        return L.transformation(scale, 0, -scale, 0);
    }())
});


var BaiduTileLayer = L.TileLayer.extend({
    // Don't use tms: true here.
    getTileUrl: function (coords) {
        var z = this._getZoomForUrl();
        var data = {
            r: L.Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: -coords.y-1,
            z: this._getZoomForUrl(),
            t: +(new Date())
        };
        data['xm'] = data.x.toString().replace('-', 'M');
        data['ym'] = data.y.toString().replace('-', 'M');
        return L.Util.template(this._url, L.Util.extend(data, this.options));
    },
});


var QQTileLayer = L.TileLayer.extend({
    // Default tms: true
    getTileUrl: function (coords) {
        var z = this._getZoomForUrl();
        var data = {
            r: L.Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: this._globalTileRange.max.y - coords.y,
            z: this._getZoomForUrl(),
            t: +(new Date())
        };
        data['x4'] = data.x >> 4;
        data['y4'] = data.y >> 4;
        return L.Util.template(this._url, L.Util.extend(data, this.options));
    },
});


var TimestampTileLayer = L.TileLayer.extend({
    getTileUrl: function (coords) {
        var data = {
            r: Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: this._getZoomForUrl(),
            t: +(new Date())
        };
        if (this._map && !this._map.options.crs.infinite) {
            var invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) {
                data['y'] = invertedY;
            }
            data['-y'] = invertedY;
        }
        return L.Util.template(this._url, L.Util.extend(data, this.options));
    },
});


function getTileLayer(type, url, options) {
    switch (type) {
        case "baidu":
            return new BaiduTileLayer(url, options);
        case "qq":
            return new QQTileLayer(url, options);
        case "timestamp":
            return new TimestampTileLayer(url, options);
        default:
            return L.tileLayer(url, options);
    }
}


L.ChineseCRS = {
    wgs_gcj: wgs_gcj,
    wgs_bd: wgs_bd,
    gcj_wgs: gcj_wgs_exact,
    bd_wgs: bd_wgs_exact,
    Proj_GCJ02_3857: SphericalMercator_GCJ02,
    Proj_BaiduMercator: BaiduMercator_BD09,
    CRS_GCJ02_3857: CRS_GCJ02_3857,
    CRS_BaiduMercator: CRS_BaiduMercator,
    BaiduTileLayer: BaiduTileLayer,
    QQTileLayer: QQTileLayer,
    TimestampTileLayer: TimestampTileLayer,
    getTileLayer: getTileLayer,
};

})(L);
