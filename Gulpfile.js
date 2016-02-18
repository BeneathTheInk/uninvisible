'use strict';
// TODO sass and copy css into dist

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var rollup = require('gulp-rollup');
var babel = require('gulp-babel');
var rollupIncludePaths = require('rollup-plugin-includepaths');
var minify = require('gulp-minify');
var sass = require('gulp-sass');
var util = require('gulp-util');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');


gulp.task('rollup', bundle);
gulp.task('sass', buildCSS);
gulp.task('minify-css', ['sass'], minCss);
gulp.task('css', ['sass', 'minify-css']);
gulp.task('default', ['rollup', 'css']);

var includePathsOptions = {
    paths: ['./src']
};

function bundle(){
    return gulp.src('./src/uninvisible.js')
    .pipe(rollup({
        sourceMap: true,
        plugins: [
            rollupIncludePaths(includePathsOptions)
        ]
    }))
    .pipe(babel())
    .pipe(minify())
    .on('error', util.log)
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
}

function buildCSS(){
    return gulp.src('./src/uninvisible.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./dist'));
}

function minCss(){
    return gulp.src('./dist/uninvisible.css')
        .pipe(minifyCss())
        .pipe(rename('uninvisible.min.css'))
        .pipe(gulp.dest('dist'));
}
