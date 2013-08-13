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
                    var path = new Chlor.path(coords.map(function(point){
                        return new Chlor.point(point[1], point[0])
                    }));
                    return new Chlor.polyline(path, obj.properties);
                    break;
                case "Point":
                    return new Chlor.point(coords[1], coords[0]);
                    break;
                case "MultiPoint":
                    var points = coords.map(function(point){
                        return new Chlor.point(point[1], point[0])
                    });
                    return new Chlor.collection(points);
                    break;
                case 'MultiLineString':
//                    coords.
                    var polylines = coords.map(function(line){
                        var arr = line.map(function(point){
                            return new Chlor.point(point[1], point[0])
                        });
                        var path = new Chlor.path(arr);
                        return new Chlor.polyline(path, obj.properties)
                    });
                    return new Chlor.collection(polylines);
                    break;
                case 'Polygon':
                    var paths = coords.map(function(path){
                        console.log(path)
                        var arr = path.map(function(point){
                            return new Chlor.point(point[1], point[0])
                        });
                        return new Chlor.path(arr)
                    });
                    return new Chlor.polygon(paths, {});
            }
    }
};

var cross_product = function(){


}

var dot_product = function(a, b){
    var acc = 0;
    for (var i = 0; i < a.length; i++){
        acc += a[i] * b[i]
    }
    return acc
};
