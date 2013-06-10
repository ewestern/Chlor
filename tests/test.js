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

test( "Class test", function() {
    var cl = new Class();
    cl.set('happy', 'days');
    cl.set({'hill street': 'blues', 'All in': 'the family'});
    equal(cl.get('happy') , 'days', "Arg set succeeds");
    equal(cl.get('hill street') , 'blues', "obj set succeeds");
    var test = 5
    cl.when('something', function(){
        test += 5;
    });
    var test2 = 2;
    cl.when('something', function(num){
        test2 += num
    });
    cl.fire('something', 4);

    equal(test, 10, 'basic calback ok');
    equal(test2, 6, 'callback with args ok');
});

var sw = new Point(36.15, -118.7);
var ne = new Point(36.2, -118.65);

test("Point test", function(){
    equal(sw.get('lat') , 36.15, "lat set ok");
    equal(sw.get('lng') , -118.7, "lng set ok");
    almostEqual(sw.get('phi'), 0.630936525, 0.000001, 'lat radians ok')
    almostEqual(sw.get('lambda'), -2.07170582, 0.0000001, 'lng radians ok')

});
var bounds = new Box(sw, ne);

test("Bounds test", function(){
    equal(bounds.get('sw') , sw, "sw set ok");
    equal(bounds.get('ne') , ne, 'ne set ok');
    almostEqual(bounds.toSpan().get('lat') , 0.05, 0.00001, 'span ok');
    equal(bounds.urlString() , '-118.7,36.15,-118.65,36.2', 'url string ok');
    almostEqual(bounds.get("center").get('lat'), 36.175, 0.00001, 'center correct')
});


var p = projector(bounds, 800, 300, 'naive');

test("projector", function(){
    deepEqual(p(sw), [0,300], 'projected sw corner');
    deepEqual(p(ne), [800,0], 'projected ne corner')
});

var center = new Point(36.5, -118.4);
var ip_naive = inverse_projector(center, 600,600,1,'naive');
var ip_merc = inverse_projector(center, 600,600,1,'mercator');
test('log helpers', function(){
    almostEqual(px_2_zoom(600, 2*Math.PI), 1, 0.0000001, 'Pix 2 zoom passed');
    almostEqual(px_2_rad(600, 1), 2 * Math.PI, 0.00000001, 'Pix 2 rad passed');
    almostEqual(rad_2_px(2 * Math.PI, 1), 600, 0.00000001, 'rad 2 pix passed');
    almostEqual(px_2_rad(600, 2), Math.PI, 0.000000001, 'Pix 2 rad half passed');

});

console.log(ip_naive([600,600]));

test('inverse projector', function(){
    almostEqual(ip_naive([300,300]).get('lat'), center.get('lat'), 0.00001, 'center lat projected');
    almostEqual(ip_naive([300,300]).get('lng'), center.get('lng'), 0.00001, 'center lng');
//    almostEqual(ip_merc([300,300]).get('lat'), center.get('lat'), 0.00001, 'center lat projected');
//    almostEqual(ip_merc([300,300]).get('lng'), center.get('lng'), 0.00001, 'center lng');
});

//var tile = new Tile(bounds, 200, 200,  'topo');


//asyncTest("Tile test", function(){
//    equal(tile.get('tileBounds'), bounds, "bounds set");
//    equal(tile.get('tileWidth'), 200, "tiledimensions set");
//    tile.getImage();
//    tile.when('got', function(){
//        ok(tile.get('image'));
//        start()
//    });
//});



//var map = new Map('canvas', bounds.get('center'));
//
//test("Map Test", function(){
//    equal(map.get('width'), 300, "width ok")
//    equal(map.get('height'), 300, "heignt ok")
//
//})