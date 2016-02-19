'use strict';

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var minify = require('gulp-minify');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');

var roll = require('rollup');
var babelPlugin = require('rollup-plugin-babel');
var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');

gulp.task('default', ['js', 'css']);

gulp.task('js', ['bundle', 'standalone', 'minBundle', 'minStandalone']);
    gulp.task('bundle', bundle);
    gulp.task('standalone', standalone);
    gulp.task('minBundle', ['bundle'], minBundle);
    gulp.task('minStandalone', ['standalone'], minStandalone);

gulp.task('css', ['sass', 'minify-css']);
    gulp.task('sass', buildCSS);
    gulp.task('minify-css', ['sass'], minCss);

var rollupOptions = {
    entry: './src/uninvisible.js',
    plugins: [
        nodeResolve({
            jsnext: false,
            main: true,
            browser: true
        }),
        commonjs({
            exclude: [ "src/**" ]
        }),
        babelPlugin({
            exclude: 'node_modules/**'
        }),
    ]
};

function rollItUp(format, dest, done){
    roll.rollup(rollupOptions)
    .then(function(bundle){
        bundle.write({
            format: format,
            moduleName: 'UnInVisible',
            dest: dest
        }).then(function(){
            done();
        });
    });
}

function bundle(done){ return rollItUp('umd', './dist/uninvisible.js', done); }
function standalone(done){ return rollItUp('iife', './dist/uninvisible_standalone.js', done); }
function minBundle(done){ return minJs('./dist/uninvisible.js', done); }
function minStandalone(done){ return minJs('./dist/uninvisible_standalone.js', done); }

function minJs(src, done){
    var stream = gulp.src(src)
        .pipe(minify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));

    stream.on('end', done);
}

function buildCSS(){
    return gulp.src('./src/uninvisible.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./dist'));
}

function minCss(){
    return gulp.src('./dist/uninvisible.css')
        .pipe(minifyCss())
        .pipe(rename('uninvisible-min.css'))
        .pipe(gulp.dest('dist'));
}
