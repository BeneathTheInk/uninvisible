'use strict';
// TODO sass and copy css into dist

var gulp = require('gulp');
var babel = require('gulp-babel');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var minify = require('gulp-minify');

gulp.task('babelifySource', babelifySource);
gulp.task('babelifyIndex', babelifyIndex);
gulp.task('bundle', ['babelifySource', 'babelifyIndex'], bundle);
gulp.task('default', ['bundle']);

function babelifySource(done){
    var stream = gulp.src('./src/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('dist/compiled'));
	stream.on('end', done);
}

function babelifyIndex(done){
    var stream = gulp.src('./uninvisible.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('dist/compiled'));
	stream.on('end', done);
}

function bundle(done) {
  var browserifyOptions = {
    entries: ['./dist/compiled/uninvisible.js'],
    standalone: "UnInVisible"
    // debug: true,
  };

  var b = browserify(browserifyOptions);

  var stream = b.bundle()
    .pipe(source('uninvisible.js'))
    .pipe(buffer())
    .pipe(minify())
    .pipe(gulp.dest('dist'));

    stream.on('end', done);
}
