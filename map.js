var name = {
    "type": "Feature",
        "id": 0,
        "properties": {
        "RTE_NO": "",
            "NAME": "",
            "TRL_NO": "Town Trail",
            "TRAIL_NAME": "Town Trail",
            "ATV_SYSTEM": "",
            "PAWM": "Non-Forest Non-Motorized Trail",
            "PAWM_OML": "Non-Forest\/Private Trails",
            "TRAIL_OML": "Non-Forest Non-Mot",
            "SOURCE": "",
            "RdLabel": "",
            "Shape_Leng": 396.034471420999978
    },
        "geometry": {
        "type": "LineString",
            "coordinates": [
            [-112.848563304002141, 37.703270441552583],
            [-112.848454060009757, 37.703222079591256],
            [-112.848321963422904, 37.70315976994322],
            [-112.848274562598661, 37.703176974815271],
            [-112.848254665695393, 37.703245961086402],
            [-112.848235484057838, 37.703343550194553],
            [-112.848229987047958, 37.703412309020713],
            [-112.848216721575525, 37.703458295109087],
            [-112.848192730736102, 37.703507317371468],
            [-112.848172412180432, 37.703559138504822],
            [-112.848159644103774, 37.703625152676715],
            [-112.848142995197421, 37.703679778772695],
            [-112.848134114632543, 37.703757173759556],
            [-112.848111402339043, 37.70385767850572],
            [-112.848091929205538, 37.703943822683463],
            [-112.848082622373084, 37.704004058115615],
            [-112.848069785177799, 37.704067211403242],
            [-112.848071632222826, 37.704141577882581],
            [-112.848058868726596, 37.704207588117491],
            [-112.848069052553342, 37.704327607470667],
            [-112.848056570427374, 37.704405058913125],
            [-112.848044157271048, 37.704485371777587],
            [-112.848010077517827, 37.704563161828837],
            [-112.847993284259786, 37.704612071202554],
            [-112.847948613833069, 37.704698610391262],
            [-112.84789236801123, 37.704753858877211],
            [-112.84784670089654, 37.704800356731589],
            [-112.847796939912058, 37.704826890009905],
            [-112.847726218333619, 37.704879501188806],
            [-112.84767342682612, 37.704928974812695],
            [-112.847634748594885, 37.70496677771736],
            [-112.847588868141969, 37.705004695702144],
            [-112.84753579226718, 37.705042724251697],
            [-112.847482716337922, 37.705080752778542],
            [-112.847436979893274, 37.705124392908374],
            [-112.847405719545151, 37.705170664791162],
            [-112.847374383269951, 37.705214075350483],
            [-112.847354200951543, 37.705271618665385],
            [-112.847352629775997, 37.705322635927082],
            [-112.847338868550267, 37.705348604797322],
            [-112.847313880192914, 37.705357579541307],
            [-112.847268006259085, 37.705395497300948],
            [-112.847268858410544, 37.705429820257038],
            [-112.847241189580259, 37.705476033609976],
            [-112.847220301926882, 37.7055049783052],
            [-112.84718875236193, 37.70553980739291],
            [-112.846626231896963, 37.706055261817653]
        ]
    }
};
//var canvas = document.getElementById('map');
//var ctx = canvas.getContext('2d');
//
//var coords = name.geometry.coordinates.map(function (point) {
//    return [point[1], point[0]];
//});


radius = 6378137;

//var merc_lat = function(phi){
//    return (0.5 * Math.log((1 + Math.sin(phi * Math.PI / 180)) / (1 - Math.sin(phi * Math.PI / 180))))
//};
//
//var mercator = function (sw, ne, width, height) {
//    var lam_nought = sw[1];
//    var phi_nought = merc_lat(sw[0]) * 180 / Math.PI;
//    var lon_scale = width / (ne[1] - sw[1]);
//    var lat_scale = height / (ne[0] - sw[0]);
//    return function (point) {
//        var xval = (point[1] - lam_nought) * lon_scale;
//        var y = merc_lat(point[0] * Math.PI / 180) * 180 / Math.PI;
//        var yval = height - ((y - phi_nought) * lat_scale);
//        return [yval, xval];
//    };
//};

//var sw = [37.70, -112.85];
//var ne = [37.71, -112.84];

var extend = function(base, newobj) {
    for (var prop in newobj){
        if (newobj.hasOwnProperty(prop)) {
            base[prop] = newobj[prop];
        }
    }
};

//var naive_projection = function(sw, ne, width, height){
//    var xspan = ne[1] - sw[1];
//    var yspan = ne[0] - sw[0];
//    return function(point){
//        var x = (point[1]-sw[1] )* width / xspan;
//        var y = height - (point[0] - sw[0]) * height / yspan;
//        return [x, y]
//    }
//};
//
//function d3_geo_mercator(λ, φ) {
//    return [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ];
//}

var C = 0.0001;

var geo_projections = {
    mercator : function (lambda, phi) {
        return Point(lambda, Math.log(Math.tan(Math.PI / 4 + phi / 2)) );
    },
    naive : function (lambda, phi){return Point (lambda, phi)}
};
var inverse_geo_projections = {
    mercator :  function(x, y) {
        return [ x, 2 * Math.atan(Math.exp(y)) - Math.PI / 2 ];
    }
};


// returns a function that converts a geographical point to x,y pairs
var projector = function(bounds, width, height, proj_name){

    var f = geo_projections[proj_name] || geo_projections.mercator;
    var span = bounds.toSpan(null);

    return function(point){
        var p = f(point);
        var x = width * (p.lambda - bounds.sw.lambda) / span.lambda;
        var y = height - (height * (p.phi - bounds.sw.phi) / span.phi);
        return [x, y]
    }

};


var inverse_projector = function(width, height, zoom, projection){
    var f = inverse_geo_projections[projection] || inverse_geo_projections.mercator;
    return function(pairs, origin){
            pairs = f(pairs);
            var x = pairs[0];
            var y = pairs[1];
            var lng = origin.lamda + (zoom/C * x) / (Math.PI/180);
            var lat = origin.phi - (zoom/C * y) / (Math.PI/180);
        return Point(lat, lng)
    };
};

var defaults = function(){

}


var Class = function(){};
extend(Class.prototype, {
    get: function(attr){
        if (this.attributes.hasOwnProperty(attr)){
            return this.attributes[prop];
        } else {
            return null
        }
    },
    set : function(attrs){
        for (prop in attrs){
            this.attributes[prop] = attrs[prop]
        }
    }

});

var Map = function(selector, point, options) {
//    point, zoom
//    var zoom = this.zoom = zoom > 10 ? 10 : (zoom < 1 ? 1: zoom) || 10;
    var attributes = this.attributes = options || {};
    var el = document.getElementById(selector);
    extend(attributes, {
        el : el,
        context : el.getContext('2d'),
        center : attributes.center || Point(0,0),
        width : el.clientWidth,
        height : el.clientHeight,
        tilewidth : el.clientWidth / 2,
        tileheight : 3 * el.clientHeight / 4,
        projector : attributes.projector || 'mercator',
        zoom : attributes.zoom || 8
    });
    this.attributes = attributes;



};

extend(Map.prototype, Class.prototype);
extend(Map.prototype, {
    tiles: [],
    context : null,
    setMap : function() {
        this.set({bounds: this.getMapBounds()})

    },


    _getTileBounds : function(){


    },
    onCanvas : function(){

    },

    drawTiles: function(){

    },
    _onMap : function(){

    },
    drawImages: function(){
        this.tiles.forEach(function(tile){
            if (_onMap(tile)){
                var bounds = tile.extent;
                this.options.context.drawImage(tile.image, x, y)
            }

        });
    },

    refresh_tiles: function(){

    },

    getGeoBounds : function(point, width, height, zoom){
//    the box represented by a map of width and height at zoom centered at Point
        var dimensions = inverse_geo_projections.mercator(this.get('width'), this.get('height'));
        var x_rad_span = this.get('zoom')/C * dimensions[0];
        var y_rad_span = this.get('zoom')/C * dimensions[1];
        var x_max_rad = this.get('center').lambda + x_rad_span/2;
        var x_min_rad = this.get('center').lambda - x_rad_span/2;
        var y_max_rad = this.get('center').phi + y_rad_span/2;
        var y_min_rad = this.get('center').phi - y_rad_span / 2;
        var rat = Math.PI / 180;
        return new Box(new Point(y_min_rad/rat, x_min_rad/rat), new Point(y_max_rad/rat, x_max_rad/rat))
    }

});

var Layer = function (){

};


var Tile = function(width, height){

};

extend(Tile.prototype, {

    success: function(response){
        this.width = response.width;
        this.height = response.height;
        this.image = new Image();
        this.image.onload = function(){
          //
        };
        this.image.src = response.href;
        var sw = new Point(response.extent.ymin, response.extent.xmin);
        var ne = new Point(response.extent.ymax, response.extent.xmax);
        this.extent = new Box(sw, ne)
    },
    fetch_tile: function(style, box){
        var map_request = new XMLHttpRequest();
        var url = services[style] + 'export?bbox=' + box.string + '&bboxSR=4326&format=jpg&f=pjson';
        console.log(url);
        map_request.onreadystatechange = function(){
            if (map_request.readyState == 4){
                if (map_request.status == 200){
                    this.success(JSON.parse(map_request.responseText));
                }
            }
        }.apply(this);
        map_request.open("GET", url, true);
        map_request.send()
    }

});

var services = {
    'topo': 'http://raster.nationalmap.gov/ArcGIS/rest/services/DRG/TNM_Digital_Raster_Graphics/MapServer/'
};
//'export?bbox=-1194%2C+36.59%2C+-118.95%2C+36.6+&bboxSR=4326&layers=&layerdefs=&size=&imageSR=&format=png&transparent=false&dpi=&time=&layerTimeOptions=&f=pjson'

var Point = function(lat, lng){
    var rat = (Math.PI/180);
    this.lat = lat;
    this.lng = lng;
    this.phi = lat * rat;
    this.lambda = lng * rat;
};

extend(Point.prototype, {


});

var Box = function(sw, ne){
    this.sw = sw;
    this.ne = ne;
    this.corners = [sw.lng, sw.lat, ne.lng, ne.lat];
};



extend(Box.prototype, {

    urlstring: function(){
        return this.corners.join(',')
    },
    center : new Point((this.sw.lat + this.ne.lat)/2, (this.sw.lng + this.sw.lng)/2),
    toSpan : function(geom){
        return new Point(this.ne.lat - this.sw.lat, this.ne.lng - this.nw.lng)
    }

});


//var draw_polyline = function(ctx, path, projection) {
//    ctx.beginPath();
//    path.forEach(function (point, i) {
//        var vals = projection(point);
//        if (i==0) ctx.moveTo(vals[0], vals[1]);
//        else ctx.lineTo(vals[0], vals[1]);
//    });
//    ctx.stroke();
//};

