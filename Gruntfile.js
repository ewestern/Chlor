
module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: ':'
			},
			dist : {
			    src : ['*.js'],
			    dest : 'dist/<%= pkg.name %>.js'
			}

		},
        qunit: {
            files: ['tests/*.html']
        }


	});
	grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.registerTask('test', ['qunit']);
    grunt.registerTask('default', ['qunit']);
}