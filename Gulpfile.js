// var gulp = require("gulp");
// var babel = require("gulp-babel");
//
// gulp.task("default", function () {
//   return gulp.src("./uninvisible.js")
//     .pipe(babel())
//     .pipe(gulp.dest("dist/compiled"));
// });
'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const fs = require("fs");


gulp.task('bab', bab);
gulp.task('babel', babelate);
gulp.task('default', ['bab', 'babel'], bundle);

function bab(done){
    let stream = gulp.src('./src/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('dist/compiled'));
	stream.on('end', done);
}

function babelate(done){
    let stream = gulp.src('./uninvisible.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('dist/compiled'));
	stream.on('end', done);
};

function bundle(done) {
  var browserifyOptions = {
    entries: ['./dist/compiled/uninvisible.js'],
    standalone: "UnInVisible",
    // debug: true
  };

  var b = browserify(browserifyOptions);

  var stream = b.bundle()
    .pipe(source('uninvisible.js'))
    .pipe(buffer())
    .pipe(gulp.dest('dist'));

    stream.on('end', done);
}
