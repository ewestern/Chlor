;
(function (exports){
var extend = function(base, newobj) {
    for (var prop in newobj){
        if (newobj.hasOwnProperty(prop)) {
            base[prop] = newobj[prop];
        }
    }
};

var Chlor = {};
var curr_tile_id = 100;
var RADIUS = 6371000;
var geo_projections = {
    mercator : function (lambda, phi) {
        var r = 180 / Math.PI;
        return new Point(Math.log(Math.tan(Math.PI / 4 + phi / 2))*r, lambda*r );
    },
    naive : function (lambda, phi){
            var r = 180 / Math.PI;
            return new Point (phi*r, lambda*r)
        }
};
var inverse_geo_projections = {
    mercator :  function(x, y) {
        return [ x, 2 * Math.atan(Math.exp(y)) - Math.PI / 2 ];
    },
    naive : function(x, y){
        return [x, y]
    }
};

var projector = function(bounds, width, height, proj_name){

    var f = geo_projections[proj_name] || geo_projections.mercator;
    var proj_bounds = new Box(f(bounds.sw.lambda, bounds.sw.phi ),
                                f(bounds.ne.lambda, bounds.ne.phi));
    var span = proj_bounds.toSpan();
    return function(point){
        var p = f(point.lambda, point.phi);
//        x, y coordinates are the magnitude of an arc from a bounding line to the given coordinate in the given dimension
//          times the ratio total map magnitude / total map span
        var x = Math.round(width * (p.lambda - proj_bounds.sw.lambda) / span.lambda);
        var y = Math.round(height * (1 - ((p.phi - proj_bounds.sw.phi) / span.phi)));
        return [x, y]
    }

};

var logBase = function (b, x){
    return Math.log(x) / Math.log(b)
};

var rad_2_px = function(rad, zoom){
    return Math.pow(2, (zoom - 1 + logBase(2, (rad * 600/ (2 * Math.PI)))));
};

var px_2_rad = function(px, zoom){
    var sign = px >= 0 ? 1 : -1;
    return sign * Math.pow(2, (logBase(2, (Math.abs(px) * 2 * Math.PI / 600)) - zoom + 1));
};

var px_2_zoom = function(px, rad){
    return logBase(2, (px*(2*Math.PI / 600)/rad)) + 1
};

//is_convex_polygon = function(path){
//    var angles = [];
//        for (var i =0; i < path.length; i++){
//            if (i <= 1) continue;
//            var c = Math.sqrt(Math.pow((path[i-2].lat - path[i-1].lat),2) + Math.pow((path[i-2].lng - path[i-1].lng), 2));
//            console.log(c)
//            var a = Math.sqrt(Math.pow((path[i-1].lat - path[i].lat),2) + Math.pow((path[i-1].lng - path[i].lng), 2));
//            console.log(a)
//            var b = Math.sqrt(Math.pow((path[i].lat - path[i-2].lat),2) + Math.pow((path[i].lng - path[i-2].lng), 2));
//            console.log(b)
//            var beta = Math.acos((Math.pow(a, 2) + Math.pow(c, 2) - Math.pow(b, 2)) / (2 * a * c));
//            angles.push(beta * (180/Math.PI))
//        }
//    return angles
//}

//var _convex_contains = function(path1, path2){
//
//
//}

var inverse_projector = function(center, width, height, zoom, projection){
//
    var f = inverse_geo_projections[projection] || inverse_geo_projections.mercator;

    return function(pairs){
        // x, y as drawn on canvas
        var x = pairs[0];
        var y = height - pairs[1];
        var phi = center.phi + px_2_rad(y-(height/2), zoom);
        var lambda = center.lambda + px_2_rad(x-(width/2), zoom)%(2*Math.PI);
        var projected = f(lambda, phi);
        return new Point(projected[1] / (Math.PI/180), projected[0] / (Math.PI/180));
    };
};


var Class = function(){};

extend(Class.prototype, {

    when : function(name, callback, context){
        this._events || (this._events = {});
        // retrieve array of all callbacks/contexts to fire on the named event
        var named_events = this._events[name] || (this._events[name] = []);
        // add the current callback/context to that named event
        named_events.push({callback:callback, context:context || this });
        return this
    },
    fire: function(name) {
        // no use to fire an event if there is no listener
        if (!this._events) return this;
        // create array of all args after name
        var args = Array.prototype.slice.call(arguments, 1);
        //named events is the array of all callbacks and contexts listening for this trigger
        var namedevents = this._events[name];
        if (namedevents) {
            // iterate through each event, calling the callback with the relevant context and optional passed arguments
            namedevents.forEach(function(event){
                event.callback.apply(event.context, args)
            })
        }
        return this;
    },
    toString : function(){
        var s = '';
        for (var prop in this){
            if (this.hasOwnProperty(prop)){
            var att = this[prop];
                s += prop + ' : ' + att.toString() + '\n';
            }
        }
        return s
    }
});

var Feature = function() {};
extend(Feature.prototype, {
    defaults  : function(options){
        var attributes = {
            color : '#ff0000',
            strikeWidth : 3
        };
        extend(attributes, options);
        this.attributes = attributes;
    },
    maps : []


});


var Path = Chlor.path = function(geopath, bounds){
    if (!bounds){
        var xmin = 180,
            ymin = 90,
            xmax = -180,
            ymax = -90;
        geopath.forEach(function(point){
            if (point.lat < ymin) ymin = point.lat;
            else if (point.lat > ymax) ymax = point.lat;
            if (point.lng < xmin) xmin = point.lng;
            else if (point.lng > xmax) xmax = point.lng
        });
        this.bounds = new Box(new Point(ymin, xmin), new Point(ymax, xmax))
    } else {this.bounds = bounds}
    this.coordinates = geopath;
};


extend(Path.prototype, {
    intersects: function(other){
        var short = this.coordinates.length >= other.coordinates.length ? other.coordinates : this.coordinates;
        var long = this.coordinates.length < other.coordinates.length ? other.coordinates : this.coordinates;
        for (var i = 0; i < short.length; i++){
            if (i !== 0){
                var slopea = (short[i].lat - short[i-1].lat)/(short[i].lng - short[i-1].lng);
                var C_a = short[i].lat - slopea * short[i].lng;
                for (var j = 0; j < long.length; j++){
                    if (j !== 0){
                        var slopeb = (long[i].lat - long[j-1].lat)/ (long[i].lng - long[j-1].lng);
                        var C_b = long[i].lat - slopeb * long[i].lng;
                        var cand_p_x = (C_b - C_a) / (slopea - slopeb);
                        var cand_p_y = slopeb * cand_p_x + C_b;
                        if (
                            Math.max(long[i].lat, long[j-1].lat) >= cand_p_y &&
                            cand_p_y >= Math.min(long[i].lat, long[j-1].lat) &&
                            Math.max(long[i].lng, long[j-1].lng) >= cand_p_x &&
                            cand_p_x>= Math.min(long[i].lng, long[j-1].lng)

                        )return new Point(cand_p_y, cand_p_x);
                    }
                }
            }
        }
        return null
    }


});

var Collection = Chlor.collection = function(){
    this.features = [];
};


var Polyline = Chlor.polyline = function(path, options){
    this.defaults(options);
    this.path = path;
};



var Polygon = Chlor.polygon = function(paths, options){
    this.paths = paths;
    this.outer = this.paths[0]
};

extend(Polygon.prototype, {
//    contains : function(point){
//
//    },
//    intersects : function(polygon){
//
//
//    }

});

extend(Polyline.prototype, Feature.prototype);
extend(Path, {
    intersect : function(other){
    },
    distance : function(){
        return this.coordinates.reduce(function(prev, current, i, arr){
            return current._sphere_dis(arr[i-1]) + !i ? 0 : prev
        })
    }
});


var Map = Chlor.map = function(selector, point, options) {

    var attributes = {
        zoom : 13,
        projection : 'naive',
        style : 'topo'
    };
    extend(attributes, options);
    var el = document.getElementById(selector);
    var bg_canvas = document.createElement('canvas');
    var f_canvas = document.createElement('canvas');
    bg_canvas.width = f_canvas.width = el.clientWidth;
    bg_canvas.height = f_canvas.height = el.clientHeight;
    bg_canvas.style.cssText = "z-index:0; position:absolute;";
    f_canvas.style.cssText = "z-index: 1;position:absolute";
    el.appendChild(bg_canvas);
    el.appendChild(f_canvas);
    extend(this, {
        el : el,
        bg_context : bg_canvas.getContext('2d'),
        f_context : f_canvas.getContext('2d'),
        center : point,
        width : el.clientWidth,
        height : el.clientHeight,
        tilewidth : Math.round(el.clientWidth / 3),
        tileheight : Math.round(el.clientHeight / 2),
        projection : attributes.projection,
        zoom : attributes.zoom,
        style : attributes.style,
        tiles : {},
        features : []
    });
    this.tiles[attributes.zoom] = [[],[]];
    var dragging  = false;
    var o_x  = 0;
    var o_y =  0;
    extend(this, {
        mousedown : el.addEventListener('mousedown', (function(event){
            o_x = event.clientX;
            o_y = event.clientY;
            dragging = true;
        }).bind(this)),
        mousemove : el.addEventListener('mousemove', (function(event){
            if (dragging){
                var m_x = event.clientX;
                var m_y = event.clientY;
                this._scrollMap(o_x-m_x, o_y-m_y);
                o_x = m_x;
                o_y = m_y;
            }
        }).bind(this)),
        mouseup : el.addEventListener('mouseup', (function(){
            dragging = false;
        }).bind(this)),
        keydown : document.addEventListener('keydown', this._keyListener.bind(this)),
        dblclick : el.addEventListener('dblclick', (function(event){
            var coords = [event.clientX, event.clientY];
            this.center =  this.inverse_projector(coords);
            this._zoomMap(1)
        }).bind(this))
    });

    this._initProjectors();
    this._initTiles();
};

extend(Map.prototype, Class.prototype);
extend(Map.prototype, {
    _keyListener : function(event){
        switch (event.keyCode){
            case 189: this._zoomMap(-1); break;
            case 187: this._zoomMap(1); break;
            case 37: this._scrollMap(-5,0); break;
            case 38: this._scrollMap(0,-5); break;
            case 39: this._scrollMap(5,0); break;
            case 40: this._scrollMap(0,5); break;
        }
    },

    _redraw : function(){
        if (this.features.length > 0) this.f_context.clearRect(0,0, 800, 500);
        this.features.forEach(function(feature){
            this.draw(feature)
        }, this);
    },

    draw : function(feature){
        var ctx = this.f_context;
        if (this.features.indexOf(feature) === -1) {
            this.features.push(feature);
        }
        if (feature.maps.indexOf(this) === -1){
            feature.maps.push()
        }
        ctx.beginPath();
        ctx.strokeStyle = feature.attributes.color;
        ctx.lineWidth = feature.attributes.strikeWidth;
        var p = this.projector;
        feature.path.coordinates.forEach(function(point, i){
            var vals = p(point);
            if (i == 0) ctx.moveTo(vals[0], vals[1]);
            else ctx.lineTo(vals[0], vals[1])
        }, this);
        ctx.stroke();
    },

    remove : function(feature){
        feature.maps.splice(feature.maps.indexOf(this), 1);
        this.features.splice(this.features.indexOf(feature), 1);
        this._redraw()
    },

    _zoomMap : function(inc){
        this.zoom += inc;
        this._initProjectors();
        if (! (this.zoom in this.tiles)) {
            this.tiles[this.zoom] = [[],[]];
            this._initTiles();

        }else  this._updateTiles();
        this._redraw()
    },

    _scrollMap : function(dx, dy){
        var w = this.width, h = this.height;
        var sw = this.inverse_projector([dx, h + dy]);
        var ne = this.inverse_projector([w + dx, dy]);
        var bounds = this.bounds = new Box(sw, ne);
        var center = this.center = bounds.center;
        this.projector = projector(bounds, w, h, this.projection);
        this.inverse_projector = inverse_projector(center, w, h, this.zoom, this.projection);
        this._updateTiles();
        this._redraw()
    },

    _updateTiles : function() {
        var tiles = this.tiles[this.zoom];
//        console.log(tiles)
        var span = this.bounds.toSpan();
        var m_lines = this.bounds.lines;
        var new_top_row = [];
        var new_bottom_row = [];
        for (var i = 0; i < tiles.length; i++){
            var row = tiles[i];
            var new_bounds, nw, se, t;
            for (var j = 0; j < row.length; j++){
                var tile = row[j],
                    t_lines = tile.bounds.lines;
//                    if none of the tiles are in the map zone, set tile active to false
                if (t_lines[0] > m_lines[2] ||
                    t_lines[1] > m_lines[3] ||
                    t_lines[2] < m_lines[0] ||
                    t_lines[3] < m_lines[1]) tile.active = false;
                    //otherwise, redraw the tile
                else {
                    tile.active = true;
                    this._drawTile(tile)
                }

                if (j == 0 && t_lines[0] > m_lines[0] && tile.active){
                    se = tile.bounds.sw;
                    new_bounds = new Box(
                        new Point(se.lat, se.lng - span.lng/3),
                        new Point(se.lat + span.lat/2, se.lng)
                    );
                    t = this._newTile(new_bounds,this.tilewidth, this.tileheight);
                    row.unshift(t);
                    j += 1;
                }
                else if (j == row.length-1 && t_lines[2] < m_lines[2] && tile.active){
                    nw = tile.bounds.ne;
                    new_bounds = new Box(
                            new Point(nw.lat - span.lat / 2, nw.lng),
                            new Point(nw.lat, nw.lng + span.lng /3)
                    );
                    t = this._newTile(new_bounds, this.tilewidth, this.tileheight);
                    row.push(t);
                }

                if (i == 0 && t_lines[3] < m_lines[3] && tile.active){
                    se = tile.bounds.ne;
                    new_bounds = new Box(
                        new Point(se.lat, se.lng - span.lng /3),
                        new Point(se.lat + span.lat / 2, se.lng )
                    );
                    t = this._newTile(new_bounds, this.tilewidth, this.tileheight);
                    new_top_row.push(t);
                }

                else if (i == tiles.length - 1 && t_lines[1] > m_lines[1] && tile.active){
                    nw = tile.bounds.sw;
                    new_bounds = new Box(
                        new Point(nw.lat - span.lat / 2, nw.lng),
                        new Point(nw.lat, nw.lng + span.lng / 3)
                    );
                    t = this._newTile(new_bounds, this.tilewidth, this.tileheight);
                    new_bottom_row.push(t);
                }
            }
        }
        if (new_top_row.length > 0) tiles.unshift(new_top_row);
        else if (new_bottom_row.length > 0) tiles.push(new_bottom_row);
    },

    _initProjectors : function(){
        var ip = this.inverse_projector = inverse_projector(this.center, this.width, this.height,
                                                            this.zoom, this.projection);
        var bounds = new Box(ip([0, this.height]), ip([this.width, 0]));
        this.bounds = bounds;
        this.projector = projector(bounds, this.width, this.height, this.projection);

    },

    _initTiles : function() {
        var bounds = this.bounds;
        var span = bounds.toSpan();
        var tile_width_span = span.lng / 3;
        var tile_height_span = span.lat / 2;

        var mc = this.center;
        var tw = this.tilewidth;
        var th = this.tileheight;
        for (var i = 0; i<6; i++){
            var col = i%3;
            var row = Math.floor(i/3);
            var tb = new Box(new Point(
                                    mc.lat - (row*tile_height_span),
                                    bounds.sw.lng + (col*tile_width_span)),
                            new Point(
                                    mc.lat + (!row*tile_height_span),
                                    bounds.sw.lng + ((col+1)*tile_width_span)));
            this.tiles[this.zoom][row][col] = this._newTile(tb, tw, th);
        }
    },

    _newTile : function(tb, tw, th){
            var tile = new Tile(tb, tw, th, this.style);
            tile._getImage();
            this._drawTile(tile);
            return tile
    },

    _drawTile : function(tile){
//    only called if some portion of tile is on the map
        var tw = tile.width, th = tile.height;
        var nw_tile_proj = this.projector(new Point(tile.bounds.ne.lat,
                                                        tile.bounds.sw.lng));
//        if (tile._id === 101) console.log(nw_tile_proj)
        var x = nw_tile_proj[0],
            y = nw_tile_proj[1];
        var p = {
//          if the new origin of the tile is off the map, set it to zero
            dx : x < 0 ? 0 : x,
            dy : y < 0 ? 0 : y,
//          if the new origin is off the map in a dimension, then we crop it in that dimension by the amount it is off
            sx : x < 0 ? Math.abs(x) : 0,
            sy : y < 0 ? Math.abs(y) : 0,
//          if the new origin is off the map, then the new width is tital width plus the amount off
//          otherwise, it is either a) the total map width minus the amount off
            sWidth : x <= 0 ? tw + x : Math.min((this.width - x), tw),
            sHeight : y <= 0 ? th + y: Math.min((this.height - y), th)
        };
        extend(tile, p);
//        console.log(tile)
        var that = this;
        function draw(){
            that.bg_context.drawImage(tile.image, p.sx, p.sy, p.sWidth, p.sHeight, p.dx, p.dy, p.sWidth, p.sHeight)
        }
        if (tile.ready){
            draw()
        } else {
            tile.when('imageready', draw);
            this.bg_context.fillStyle = '#C0C0C0';
            this.bg_context.fillRect(p.dx, p.dy, p.sWidth, p.sHeight);
        }
    }
});

var Tile = function(bounds, width, height, style){
    extend(this, {
        width : width,
        height : height,
        bounds : bounds,
        style : style,
        active : true,
        _id : curr_tile_id
    });
    curr_tile_id += 1;
};
extend(Tile.prototype, Class.prototype);
extend(Tile.prototype, {

    retrieveImage: function(response){
        var that = this;
        var sw = new Point(response.extent.ymin, response.extent.xmin);
        var ne = new Point(response.extent.ymax, response.extent.xmax);
        extend(this, {
            width : response.width,
            height: response.height,
            image : new Image(),
            bounds : new Box(sw, ne)
        });
        this.image.onload = function(){
            that.ready =  true;
            that.fire('imageready')
        };

        this.image.src = response.href;
    },

    _getImage: function(){
        var map_request = new XMLHttpRequest();
        var that = this;
        var url = urlTemplate(services(that.style, that.zoom), {
            bounds : that.bounds.urlString(),
            width : that.width,
            height : that.height
        });
        map_request.open("GET", url, true);
        map_request.onreadystatechange = function(){
            if (map_request.readyState == 4){
                if (map_request.status == 200) that.retrieveImage(JSON.parse(map_request.responseText));
            } else {
                //todo: handle
            }
        };
        map_request.send()
    }

});

var urlTemplate = function(url, context){
    var re = /{[a-zA-Z_]+}/g;
    return url.replace(re, function(match){
        return context[match.slice(1,-1)]
    });
};


var services = function(name, zoom){
    var map = {
      scanned_topo : 'http://raster.nationalmap.gov/ArcGIS/rest/services/DRG/TNM_Digital_Raster_Graphics/MapServer/export?bbox={bounds}&size={width},{height}&bboxSR=4326&imageSR=4326&format=jpg&f=pjson',
      topo : 'http://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/export?bbox={bounds}&bboxSR=4326&size={width},{height}&imageSR=4326&format=jpg&f=pjson',
      image_topo: 'http://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryTopo/MapServer/export?bbox={bounds}&bboxSR=4326&size={width},{height}&imageSR=4326&format=jpg&f=pjson',
      ecosystems: 'http://rmgsc.cr.usgs.gov/ArcGIS/rest/services/ecosys_US/MapServer/export?bbox={bounds}&bboxSR=4326&size={width},{height}&imageSR=4326&format=jpg&f=pjson',
      hydro : function(zoom) {
        var large = 'http://services.nationalmap.gov/ArcGIS/rest/services/NHD_Large/MapServer/export?bbox={bounds}&bboxSR=4326&size={width},{height}&imageSR=4326&format=jpg&f=pjson';
        var small = 'http://basemap.nationalmap.gov/ArcGIS/rest/services/NHD_Small/MapServer/export?bbox={bounds}&bboxSR=4326&size={width},{height}&imageSR=4326&format=jpg&f=pjson';
        return zoom > 11 ? small : large
      }

    };
    if (typeof map[name] == 'function') return map[name](zoom);
    else return map[name]
};

var Point = Chlor.point = function(lat, lng){
    var rat = (Math.PI/180);
    extend(this, {
        lat : lat,
        lng : lng,
        phi : lat * rat,
        lambda : lng * rat
    });
};

extend(Point.prototype, Class.prototype);
extend(Point.prototype, {
    equals : function(other, tol){
        tol = tol || 0.001;
        return this.lat - tol <= other.lat <= this.lat + tol &&
                this.lng - tol <= other.lng <= this.lng
    },

    _sphere_dis : function(other){
//       computes the distance in meters from another point
//
        var dx = (Math.cos(this.phi) * Math.cos(this.lambda)) - (Math.cos(other.phi) * Math.cos(other.lambda));
        var dy = (Math.cos(this.phi) * Math.sin(this.lambda)) - (Math.cos(other.phi) * Math.sin(other.lambda));
        var dz = Math.sin(this.phi) - Math.sin(other.phi);
        var Ch = Math.sqrt((Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2)));
        return RADIUS * 2 * Math.asin(Ch/2);
    }
});

var Box = Chlor.box = function(sw, ne){
    extend(this, {
        sw : sw,
        ne : ne,
        seq : [sw, new Point(ne.lat, sw.lng), ne, new Point(sw.lat, ne.lng), sw],
        center : new Point((sw.lat + ne.lat) / 2, (sw.lng + ne.lng) / 2),
        lines : [sw.lng, sw.lat, ne.lng, ne.lat]
    });
};


extend(Box.prototype, Class.prototype);
extend(Box.prototype, {
    urlString: function(){
        return this.lines.join(',')
    },
    toSpan : function(){
        return new Point(this.ne.lat - this.sw.lat,
                        this.ne.lng - this.sw.lng)
    },
    contains : function(point){
        return  !!(this.ne.lat > point.lat > this.sw.lat &&
            this.ne.lng > point.lng > this.ne.lng)

    }
});
exports.Chlor =  Chlor
}(this));