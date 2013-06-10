

//var polyline_box = function (coordinates) {
//    var ne = [],
//        sw = [];
//    coordinates.forEach(function (point, i) {
//        if (i === 0) {
//            ne = point;
//            sw = point;
//        } else {
//            lat = point[0];
//            lng = point[1];
//            if (lat > ne[0]) ne = [lat, ne[1]];
//            if (lat < sw[0]) sw = [lat, sw[1]];
//            if (lng > ne[1]) ne = [ne[0], lng];
//            if (lng < sw[1]) sw = [sw[0], lng];
//        }
//    });
//    return [ne, sw];
//};

var geoJson = function(obj){
    switch(obj.type) {
        case 'FeatureCollection':
            return new Collection(
                obj.features.map(function(feat){
                    return geoJson(feat)
                })
            );
            break;
        case 'Feature':
            var coords = obj.geometry.coordinates;
            switch(obj.geometry.type){
                case "LineString":
                    var path = new Path(coords.map(function(point){
                        return new Point(point[1], point[0])
                    }));
                    return new Polyline(path, obj.properties);
                    break;
                case "Point":
                    return new Point(coords[1], coords[0]);
                    break;
                case "MultiPoint":
                    var points = coords.map(function(point){
                        return new Point(point[1], point[0])
                    });
                    return new Collection(points);
                    break;
                case 'MultiLineString':
//                    coords.
                    var polylines = coords.map(function(line){
                        var arr = line.map(function(point){
                            return new Point(point[1], point[0])
                        });
                        var path = new Path(arr);
                        return new Polyline(path, obj.properties)
                    });
                    return new Collection(polylines);
                    break;
//                case "Polygon":
//                    new Polygon
//                    break;
//                case 'MultiPolygon':
//                    for ... new Polygon
//                    break;
            }
    }
};

