/**
 * Created with PyCharm.
 * User: peterfrance
 * Date: 6/5/13
 * Time: 10:55 AM
 * To change this template use File | Settings | File Templates.
 */

var almostEqual = function(actual, expected, tol, msg){
    ok(actual + tol >= expected && actual - tol <= expected, msg)
};

//test( "Class test", function() {
//    var cl = new lass();
//    cl.set('happy', 'days');
//    cl.set({'hill street': 'blues', 'All in': 'the family'});
//    equal(cl.get('happy') , 'days', "Arg set succeeds");
//    equal(cl.get('hill street') , 'blues', "obj set succeeds");
//    var test = 5
//    cl.when('something', function(){
//        test += 5;
//    });
//    var test2 = 2;
//    cl.when('something', function(num){
//        test2 += num
//    });
//    cl.fire('something', 4);
//
//    equal(test, 10, 'basic calback ok');
//    equal(test2, 6, 'callback with args ok');
//});

var sw = new Chlor.point(36.15, -118.7);
var ne = new Chlor.point(36.2, -118.65);

test("Point test", function(){
    equal(sw.lat , 36.15, "lat set ok");
    equal(sw.lng , -118.7, "lng set ok");
    almostEqual(sw.phi, 0.630936525, 0.000001, 'lat radians ok')
    almostEqual(sw.lambda, -2.07170582, 0.0000001, 'lng radians ok')

});
var bounds = new Chlor.box(sw, ne);

test("Bounds test", function(){
    equal(bounds.sw , sw, "sw set ok");
    equal(bounds.ne , ne, 'ne set ok');
    almostEqual(bounds.toSpan().lat , 0.05, 0.00001, 'span ok');
    equal(bounds.urlString() , '-118.7,36.15,-118.65,36.2', 'url string ok');
    almostEqual(bounds.center.lat, 36.175, 0.00001, 'center correct')
});


//var p = projector(bounds, 800, 300, 'naive');
//
//test("projector", function(){
//    deepEqual(p(sw), [0,300], 'projected sw corner');
//    deepEqual(p(ne), [800,0], 'projected ne corner')
//});

//var center = new Chlor.Point(36.5, -118.4);
//var ip_naive = inverse_projector(center, 600,600,1,'naive');
//var ip_merc = inverse_projector(center, 600,600,1,'mercator');
//test('log helpers', function(){
//    almostEqual(px_2_zoom(600, 2*Math.PI), 1, 0.0000001, 'Pix 2 zoom passed');
//    almostEqual(px_2_rad(600, 1), 2 * Math.PI, 0.00000001, 'Pix 2 rad passed');
//    almostEqual(rad_2_px(2 * Math.PI, 1), 600, 0.00000001, 'rad 2 pix passed');
//    almostEqual(px_2_rad(600, 2), Math.PI, 0.000000001, 'Pix 2 rad half passed');
//
//});
//
//
//test('inverse projector', function(){
//    almostEqual(ip_naive([300,300]).get('lat'), center.get('lat'), 0.00001, 'center lat projected');
//    almostEqual(ip_naive([300,300]).get('lng'), center.get('lng'), 0.00001, 'center lng');
////    almostEqual(ip_merc([300,300]).get('lat'), center.get('lat'), 0.00001, 'center lat projected');
////    almostEqual(ip_merc([300,300]).get('lng'), center.get('lng'), 0.00001, 'center lng');
//});

var line1 = geoJson(intersects_test_1);
var line2 = geoJson(intersects_test_2);
var line3 = geoJson(intersects_test_3);
var line4 = geoJson(intersects_test_4);
var gon1 = geoJson(polygon_test_1)
var gon2 = geoJson(polygon_test_2)
console.log(gon1)
console.log(gon2)
test('vector methods test', function(){
    console.log('first')
    var p1 = new Chlor.point(1.5, 1.5)
    equal(line1.path.intersects(line2.path).lat, p1.lat);
    equal(line1.path.intersects(line2.path).lng, p1.lng);
    console.log('second')
    var p2 = new Chlor.point(-1, 1)
    equal(line3.path.intersects(line4.path).lat, p2.lat);
    equal(line3.path.intersects(line4.path).lng, p2.lng);
    console.log(Chlor._is_convex_polygon(gon1.outer.coordinates))
    console.log(Chlor._is_convex_polygon(gon2.outer.coordinates))
});