var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var spritesmith = require('gulp.spritesmith');
var gulpIf = require('gulp-if');
var nunjucksRender = require('gulp-nunjucks-render');
var rename = require('gulp-rename');
var data = require('gulp-data');
var fs = require('fs');
var del = require('del');
var runSequence = require('run-sequence');
var jsHint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var scssLint = require('gulp-scss-lint');
var Server = require('karma').Server;

var customPlumber = function(errTitle) {
	return plumber({errorHandler: notify.onError({
		title: errTitle || "error running Gulp",
		error: "Error: <% error.message %>",
		sound: "Submarine"
	})});
};

gulp.task('browserSync', function() {
	browserSync({
		server: {
			baseDir: 'app'
		},
		browser: ['last 2 versions']
	})
});

gulp.task('sprites', function() {
	return gulp.src('app/images/sprites/**/*.png')
			.pipe(spritesmith({
                                cssName: '_sprites.scss',
                                imgName: 'sprites.png',
                                imgPath: '../images/sprites.png'
                             }))
            .pipe(gulpIf('*.png', gulp.dest('app/images')))
            .pipe(gulpIf('*.scss', gulp.dest('app/scss')))
});

gulp.task('sass', function() {
	return gulp.src('app/scss/**/*.scss')
            .pipe(customPlumber('Error running SASS'))
            .pipe(sourcemaps.init())
            .pipe(sass({
                                includePaths: ['app/bower_components']
                             }))
            .pipe(autoprefixer())
			.pipe(sourcemaps.write())
            .pipe(gulp.dest('app/css'))
            .pipe(browserSync.reload({stream: true}));
});

gulp.task('nunjucks', function() {
	nunjucksRender.nunjucks.configure(['app/templates'],
            {
                watch: false
            });

	return gulp.src('app/pages/**/*.+(html|nunjucks)')
            .pipe(data(function() {
                                return JSON.parse(fs.readFileSync('./app/data.json'));
                             }))
			.pipe(nunjucksRender())
            .pipe(rename(function(path) {
                                path.extname = '.html';
                             }))
			.pipe(gulp.dest('app'))
            .pipe(browserSync.reload({
                                stream: true
                             }));
});

gulp.task('clean:dev', function(callback) {
    del([
            'app/css',
            'app/*.+(html|nunjucks)'
    ], callback)
});

gulp.task('watch-js', ['lint:js'], browserSync.reload);

gulp.task('watch', function() {
	gulp.watch('app/**/*.scss', ['sass', 'lint:scss']);
    gulp.watch('app/js/**/*.js', ['watch-js']);
	gulp.watch(['app/**.html'], browserSync.reload);
    gulp.watch(['app/templates/**/*', 'app/pages/**/*.+(html|nunjucks)', 'app/data.json'], ['nunjucks']);
});

gulp.task('lint:js', function() {
    return gulp.src('app/js/**/*.js')
            .pipe(customPlumber('JSHint Error'))
            .pipe(jsHint())
            .pipe(jsHint.reporter('jshint-stylish'))
            .pipe(jscs({
                                fix: true,
                                configPath: '.jscsrc'
                             }))
            .pipe(gulp.dest('app/js'))
            .pipe(jsHint.reporter('fail', {
                                ignoreWarning: true,
                                ignoreInfo: true
                             }));
});

gulp.task('lint:scss', function() {
    return gulp.src(['app/scss/**/*.scss', '!app/scss/_sprites.scss'])
            .pipe(scssLint({
                                config: '.scss-lint.yml'
                             }));
});

gulp.task('test', function(done) {
    new Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('default', function(callback) {
    runSequence('clean:dev',
            ['sprites', 'lint:js', 'lint:scss'],
            ['sass', 'nunjucks'],
            ['browserSync', 'watch'],
                callback);
});
