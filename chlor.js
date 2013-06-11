var extend = function(base, newobj) {
    for (var prop in newobj){
        if (newobj.hasOwnProperty(prop)) {
            base[prop] = newobj[prop];
        }
    }
};


var Chlor = {};
var curr_tile_id = 100;

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
    var proj_bounds = new Box(f(bounds.get('sw').get('lambda'), bounds.get('sw').get('phi') ),
                                f(bounds.get('ne').get('lambda'), bounds.get('ne').get('phi')));
    var span = proj_bounds.toSpan();
    return function(point){
        var p = f(point.get('lambda'), point.get('phi'));
//        x, y coordinates are the magnitude of an arc from a bounding line to the given coordinate in the given dimension
//          times the ratio total map magnitude / total map span
        var x = Math.round(width * (p.get('lambda') - proj_bounds.get('sw').get('lambda')) / span.get('lambda'));
        var y = Math.round(height * (1 - ((p.get('phi') - proj_bounds.get('sw').get('phi')) / span.get('phi'))));
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

var inverse_projector = function(center, width, height, zoom, projection){
//
    var f = inverse_geo_projections[projection] || inverse_geo_projections.mercator;

    return function(pairs){
        // x, y as drawn on canvas
        var x = pairs[0];
        var y = height - pairs[1];
        var phi = center.get('phi') + px_2_rad(y-(height/2), zoom);
        var lambda = center.get('lambda') + px_2_rad(x-(width/2), zoom)%(2*Math.PI);
        var projected = f(lambda, phi);
        return new Point(projected[1] / (Math.PI/180), projected[0] / (Math.PI/180));
    };
};


var Class = function(){
    this.attributes = {};
};

extend(Class.prototype, {

    get: function(attr){
        if (this.attributes.hasOwnProperty(attr)){
            return this.attributes[attr];
        } else {
            return null
        }
    },
    set : function(attrs, val){
        if (typeof  attrs == 'string' && typeof val !== 'undefined'){
            this.attributes[attrs] = val;
            this.fire('set:'+ attrs);
        } else {
            for (var prop in attrs){
                if (attrs.hasOwnProperty(prop)){
                    this.attributes[prop] = attrs[prop];
                    this.fire('set:' + prop);
                }
            }
        }
    },
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
        for (var prop in this.attributes){
            if (this.attributes.hasOwnProperty(prop)){
            var att = this.attributes[prop];
                s += prop + ' : ' + att.toString() + '\n';
            }
        }
        return s
    }
});


var Feature = Chlor.feature = function() {

};

var Path = Chlor.path = function(geopath){
    this.coordinates = geopath;
};

var Collection = Chlor.collection = function(){
    this.features = [];

};

var Polyline = Chlor.polyline = function(path, options){
    var attributes = this.attributes = options || {};
    var path = this.path = path;

};

extend(Path, {
    intersect : function(other){
//        returns the point at which this intersectos with other
    }

});


var Map = Chlor.map = function(selector, point, options) {
    var attributes = this.attributes = options || {};
    var el = document.getElementById(selector);
    var zoom = attributes.zoom || 13;
    var bg_canvas = document.createElement('canvas');
    var f_canvas = document.createElement('canvas');
    bg_canvas.width = f_canvas.width = el.clientWidth;
    bg_canvas.height = f_canvas.height = el.clientHeight;
    bg_canvas.style.cssText = "z-index:0; position:absolute;";
    f_canvas.style.cssText = "z-index: 1;position:absolute";
    el.appendChild(bg_canvas);
    el.appendChild(f_canvas);
    extend(attributes, {
        el : el,
        bg_context : bg_canvas.getContext('2d'),
        f_context : f_canvas.getContext('2d'),
        center : point,
        width : el.clientWidth,
        height : el.clientHeight,
        tilewidth : Math.round(el.clientWidth / 3),
        tileheight : Math.round(el.clientHeight / 2),
        projection : attributes.projection || 'naive',
        zoom : zoom,
        style : attributes.style || 'topo',
        tiles : {},
        features : []
    });
    this.get('tiles')[zoom] = [[],[]];
    var dragging  = false;
    var o_x  = 0;
    var o_y =  0;
    this.set('listeners', {
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
            var point = this.inverse_projector(coords);
            this.set("center", point);
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
        if (this.get("features").length > 0) this.get('f_context').clearRect(0,0, 800, 500);
        this.get("features").forEach(function(feature){
            this.draw(feature)
        }, this);
    },

    draw : function(feature){
        var ctx = this.get("f_context");
        if (this.get('features').indexOf(feature) === -1) {
            console.log('push')
            this.get('features').push(feature);
        }
        ctx.beginPath();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;

        var p = this.projector;
        feature.path.coordinates.forEach(function(point, i){
            var vals = p(point);
            if (i == 0) ctx.moveTo(vals[0], vals[1]);
            else ctx.lineTo(vals[0], vals[1])
        }, this);
        ctx.stroke();
    },

    _zoomMap : function(inc){
        this.set('zoom', this.get("zoom") + inc);
        this._initProjectors();
        if (! (this.get('zoom') in this.get("tiles"))) {
            this.get('tiles')[this.get('zoom')] = [[],[]];
            this._initTiles();

        }else  this._updateTiles();
        this._redraw()
    },

    _scrollMap : function(dx, dy){
        var w = this.get("width"), h = this.get('height');
        var sw = this.inverse_projector([dx, h + dy]);
        var ne = this.inverse_projector([w + dx, dy]);
        var bounds = new Box(sw, ne);
        this.set('bounds', bounds);
        this.set('center', bounds.get('center'));
        this.projector = projector(bounds, w, h, this.get("projection"));
        this.inverse_projector = inverse_projector(this.get('center'), w, h, this.get('zoom'), this.get('projection'));
        this._updateTiles();
        this._redraw()
    },

    _updateTiles : function() {
        var tiles = this.get('tiles')[this.get('zoom')];
        var span = this.get('bounds').toSpan();
        var m_lines = this.get('bounds').get("lines");
        var new_top_row = [];
        var new_bottom_row = [];
        for (var i = 0; i < tiles.length; i++){
            var row = tiles[i];
            var new_bounds, nw, se, t;
            for (var j = 0; j < row.length; j++){
                var tile = row[j],
                    t_lines = tile.get('bounds').get('lines');
//                    if none of the tiles are in the map zone, set tile active to false
                if (t_lines[0] > m_lines[2] ||
                    t_lines[1] > m_lines[3] ||
                    t_lines[2] < m_lines[0] ||
                    t_lines[3] < m_lines[1]) tile.set('active', false);
                    //otherwise, redraw the tile
                else {
                    tile.set('active', true);
                    this._drawTile(tile)
                }

                if (j == 0 && t_lines[0] > m_lines[0] && tile.get('active')){
                    se = tile.get('bounds').get('sw');
                    new_bounds = new Box(
                        new Point(se.get('lat'), se.get('lng') - span.get('lng')/3),
                        new Point(se.get('lat') + span.get('lat')/2, se.get('lng'))
                    );
                    t = this._newTile(new_bounds,this.get("tilewidth"), this.get('tileheight'));
                    row.unshift(t);
                    j += 1;
                }
                else if (j == row.length-1 && t_lines[2] < m_lines[2] && tile.get('active')){
                    nw = tile.get('bounds').get('ne');
                    new_bounds = new Box(
                            new Point(nw.get('lat') - span.get('lat')/2, nw.get('lng')),
                            new Point(nw.get('lat'), nw.get('lng') + span.get('lng')/3)
                    );
                    t = this._newTile(new_bounds, this.get('tilewidth'), this.get('tileheight'));
                    row.push(t);
                }

                if (i == 0 && t_lines[3] < m_lines[3] && tile.get("active")){
                    se = tile.get('bounds').get('ne');
                    new_bounds = new Box(
                        new Point(se.get('lat'), se.get('lng')-span.get('lng')/3),
                        new Point(se.get('lat') + span.get('lat')/2, se.get('lng'))
                    );
                    t = this._newTile(new_bounds, this.get('tilewidth'), this.get("tileheight"));
                    new_top_row.push(t);
                }

                else if (i == tiles.length-1 && t_lines[1] > m_lines[1] && tile.get('active')){
                    nw = tile.get('bounds').get('sw');
                    new_bounds = new Box(
                        new Point(nw.get('lat')-span.get('lat')/2, nw.get('lng')),
                        new Point(nw.get('lat'), nw.get("lng") + span.get('lng')/3)
                    );
                    t = this._newTile(new_bounds, this.get('tilewidth'), this.get('tileheight'));
                    new_bottom_row.push(t);
                }
            }
        }
        if (new_top_row.length > 0) tiles.unshift(new_top_row);
        else if (new_bottom_row.length > 0) tiles.push(new_bottom_row);
    },

    _initProjectors : function(){
        var ip = this.inverse_projector = inverse_projector(this.get('center'),this.get('width'), this.get('height'),
                                                            this.get('zoom'), this.get('projection'));
        var bounds = new Box(ip([0, this.get('height')]), ip([this.get('width'), 0]));
        this.set('bounds', bounds);
        this.projector = projector(bounds,this.get('width'), this.get('height'), this.get('projection'));

    },

    _initTiles : function() {
        var bounds = this.get('bounds');
        var span = bounds.toSpan();
        var tile_width_span = span.get('lng')/3;
        var tile_height_span = span.get('lat')/2;

        var mc = this.get('center');
        var tw = this.get('tilewidth');
        var th = this.get('tileheight');
        for (var i = 0; i<6; i++){
            var col = i%3;
            var row = Math.floor(i/3);
            var tb = new Box(new Point(
                                    mc.get('lat') - (row*tile_height_span),
                                    bounds.get('sw').get('lng') + (col*tile_width_span)),
                            new Point(
                                    mc.get('lat') + (!row*tile_height_span),
                                    bounds.get("sw").get('lng') + ((col+1)*tile_width_span)));
            this.get('tiles')[this.get('zoom')][row][col] = this._newTile(tb, tw, th);
        }
    },

    _newTile : function(tb, tw, th){
            var tile = new Tile(tb, tw, th, this.get('style'));
            tile._getImage();
            this._drawTile(tile);
            return tile
    },

    _drawTile : function(tile){
//    only called if some portion of tile is on the map
        var tw = tile.get('width'), th = tile.get('height');
        var nw_tile_proj = this.projector(new Point(tile.get('bounds').get('ne').get('lat'),
                                                        tile.get('bounds').get('sw').get('lng')));
         var x = nw_tile_proj[0],
            y = nw_tile_proj[1];
        var p = {
//            if the new origin of the tile is off the map, set it to zero
            dx : x < 0 ? 0 : x,
            dy : y < 0 ? 0 : y,
//            if the new origin is off the map in a dimension, then we crop it in that dimension by the amount it is off
            sx : x < 0 ? Math.abs(x) : 0,
            sy : y < 0 ? Math.abs(y) : 0,
//            if the new origin is off the map, then the new width is tital width plus the amount off
//          otherwise, it is either a) the total map width minus the amount off
            sWidth : x <= 0 ? tw + x : Math.min((this.get('width') - x), tw),
            sHeight : y <= 0 ? th + y: Math.min((this.get('height') - y), th)
        };
        tile.set(p);
        var that = this;
        function draw(){
            that.get('bg_context').drawImage(tile.get('image'), p.sx, p.sy, p.sWidth, p.sHeight, p.dx, p.dy, p.sWidth, p.sHeight)
        }
        if (tile.get('ready')){
            draw()
        } else {
            tile.when('imageready', draw);
            this.get('bg_context').fillStyle = '#C0C0C0';
            this.get("bg_context").fillRect(p.dx, p.dy, p.sWidth, p.sHeight);
        }
    }
});

var Tile = function(bounds, width, height, style){
    this.attributes = {
        width : width,
        height : height,
        bounds : bounds,
        style : style,
        parameters : {},
        active : true,
        _id : curr_tile_id
    };
    curr_tile_id += 1;
};
extend(Tile.prototype, Class.prototype);
extend(Tile.prototype, {

    retrieveImage: function(response){
        var that = this;
        var sw = new Point(response.extent.ymin, response.extent.xmin);
        var ne = new Point(response.extent.ymax, response.extent.xmax);
        this.set({
            'width' : response.width,
            'height': response.height,
            'image' : new Image(),
            'extent': new Box(sw, ne)
        });
        this.set("bounds", this.get('extent'));

        var img = this.get('image');

        img.onload = function(){
            that.set('ready', true);
            that.fire('imageready')
        };

        img.src = response.href;
    },
    _getImage: function(){
        var map_request = new XMLHttpRequest();

        var url = urlTemplate(services(this.get('style'), this.get('zoom')), {
            bounds : this.get('bounds').urlString(),
            width : this.get('width'),
            height : this.get('height')
        });
        var that = this;
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
    this.attributes = {};
    var rat = (Math.PI/180);
    this.set({
        lat : lat,
        lng : lng,
        phi : lat * rat,
        lambda : lng * rat
    });
};

extend(Point.prototype, Class.prototype);
extend(Point.prototype, {

});

var Box = Chlor.Box = function(sw, ne){
    this.attributes = {};
    this.set({
        sw : sw,
        ne : ne,
        seq : [sw, new Point(ne.get('lat'), sw.get('lng')), ne, new Point(sw.get('lat'), ne.get('lng')), sw],
        center : new Point((sw.get('lat') + ne.get('lat'))/2, (sw.get('lng') + ne.get('lng'))/2),
        lines : [sw.get('lng'), sw.get('lat'), ne.get('lng'), ne.get('lat')]
    });
};


extend(Box.prototype, Class.prototype);
extend(Box.prototype, {
    urlString: function(){
        return this.get('lines').join(',')
    },
    toSpan : function(){
        return new Point(this.get('ne').get('lat') - this.get('sw').get('lat'),
                        this.get('ne').get('lng') - this.get('sw').get('lng'))
    }
});