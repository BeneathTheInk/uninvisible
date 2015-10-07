module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: [ "dist/*.js" ],
		browserify: {
			dist: {
				src: "uninvisible.js",
				dest: "dist/uninvisible.js",
				options: {
					browserifyOptions: { standalone: "UnInVisible" }
				}
			}
		},
		sass: {
        dist: {
					options: {
						noCache: true
					},
          files: {
              'dist/uninvisible.css': 'uninvisible.scss'
          }
        }
    },
		wrap2000: {
			"dist-js": {
				src: 'dist/uninvisible.js',
				dest: 'dist/uninvisible.js',
				options: {
					header: "/*\n * UnInVisible (JS)\n * (c) 2015 Beneath the Ink, Inc.\n * Version <%= pkg.version %>\n */\n"
				}
			}
		},
		uglify: {
			dist: {
				src: "dist/uninvisible.js",
				dest: "dist/uninvisible.min.js"
			}
		},
		copy: {
			dist: {
				files: [{
					expand: true,
					cwd: "images/",
					src: [ "*" ],
					dest: "dist/images/",
					filter: 'isFile'
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-wrap2000');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-sass');

	grunt.registerTask('build-js-dist', [ 'browserify:dist', 'wrap2000:dist-js', 'uglify:dist' ]);
	grunt.registerTask('dist', [ 'clean', 'build-js-dist', 'sass:dist' ]);
	grunt.registerTask('default', [ 'dist' ]);

};
