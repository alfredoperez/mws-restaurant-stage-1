const del = require('del');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const gulp = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const clean_css = require('gulp-clean-css');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
var $ = require('gulp-load-plugins')({lazy: true});

const dirs = {
  src: 'src',
  dest: 'build'
}

const clean = () => del(['build']);  // del requires it to be a string and not a variable

const build_html = () => {
  return gulp
    .src(`${dirs.src}/*.html`)
    .pipe($.useref({ searchPath: [".tmp", "src", "."] }))
    .pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true } })))
    .pipe($.if(/\.css$/, $.cssnano({ safe: true, autoprefixer: false })))
    .pipe(
      $.if(
        /\.html$/,
        $.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: { compress: { drop_console: true } },
          processConditionalComments: true,
          removeComments: true,
          removeEmptyAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        })
      )
    )
    .pipe(gulp.dest(`${dirs.dest}/`));
}
// const build_html = () => {
//   return gulp.src([`${dirs.src}/*.html`])
//     .pipe(gulp.dest(`${dirs.dest}/`));
// }

const build_css_source = (source) => {
  return gulp.src([
    `${dirs.src}/css/helpers.css`,
    `${dirs.src}/css/main.css`,
    `${dirs.src}/css/normalize.css`,
    `${dirs.src}/css/${source}.css`,
  ])
    .pipe(clean_css({ sourceMap: true }))
    .pipe(autoprefixer('last 2 version'))
    .pipe(concat(`${source}.min.css`))
    .pipe(gulp.dest(`${dirs.dest}/css`));
}

const build_css_index = () => build_css_source('home');
const build_css_restaurant = () => build_css_source('restaurant-details');

const build_css = gulp.series(build_css_index, build_css_restaurant);

const build_script = (filename) => {
  return browserify(`${dirs.src}/js/${filename}`)
    .transform('babelify')
    .bundle()
    .pipe(source(filename))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(`${dirs.dest}/js`));
}

const build_script_index = () => build_script('main.js');
const build_script_restaurant = () => build_script('restaurant-details.js');

const build_scripts = gulp.parallel(build_script_index, build_script_restaurant);

const copy_static = () => {
  return gulp.src([
    `${dirs.src}/**/*.json`,
    `${dirs.src}/**/*.js`,
    `${dirs.src}/images/*`,
    `${dirs.src}/sw.js`,
    `${dirs.src}/**/*.ico`,
  ], { base: dirs.src })
    .pipe(gulp.dest(`${dirs.dest}`));
};

const build_all = gulp.series(clean, build_html, build_css,copy_static);
gulp.task('watch', () => {
  gulp.watch([dirs.src], build_all)
});

gulp.task('default', gulp.series(build_all, 'watch'), () => {
  console.log('Development started');
});
// const gulp = require("gulp");
// const gulpLoadPlugins = require("gulp-load-plugins");
// const browserify = require("browserify");
// const babelify = require("babelify");
// const source = require("vinyl-source-stream");
// const browserSync = require("browser-sync").create();
// const del = require("del");
// const concat = require("gulp-concat");
// const wiredep = require("wiredep").stream;
// const runSequence = require("run-sequence");

// const $ = gulpLoadPlugins();
// const reload = browserSync.reload;

// let dev = true;


// var config = {
//   allCss: "src/css/*.css",
//   allJs: "src/js/*.js",
//   sw: "src/sw.js",
//   html: "src/*.html",
//   images: "src/images/**/*",
//   temp: ".tmp/",
//   tempCss: ".tmp/css",
//   tempJs: ".tmp/js",
//   dist: "dist",
//   distImages: "dist/images"

// };

// /**
//  * Remove all files from the build, temp, and reports folders
//  * @param  {Function} done - callback when complete
//  */
// gulp.task('clean', function (done) {
//   var delconfig = [].concat(config.temp, config.dist);
//   log('Cleaning: ' + $.util.colors.blue(delconfig));
//   del(delconfig, done);
// });

// /**
//  * Move all the css and autoprefix
//  * @return {Stream}
//  */
// gulp.task("styles", () => {
//   return gulp
//     .src(config.allCss)
//     .pipe($.if(dev, $.sourcemaps.init()))
//     .pipe(
//       $.autoprefixer({ browsers: ["> 1%", "last 2 versions", "Firefox ESR"] })
//     )
//     .pipe($.if(dev, $.sourcemaps.write()))
//     .pipe(gulp.dest(config.tempCss))
//     .pipe(reload({ stream: true }));
// });

// /**
//  * Move all the JS
//  * @return {Stream}
//  */
// gulp.task("js", () => {
//   return gulp
//     .src(["src/js/**/*.js", "!src/js/**/dbhelper.js"])
//     .pipe($.plumber())
//     .pipe($.if(dev, $.sourcemaps.init()))
//     .pipe($.babel())
//     .pipe($.if(dev, $.sourcemaps.write(".")))
//     .pipe(gulp.dest(config.tempJs))
//     .pipe(reload({ stream: true }));
// });

// /**
//  * Copy SW
//  * @return {Stream}
//  */
// gulp.task("copy-sw", () => {
//   const b = browserify({
//     debug: true
//   });

//   return b
//     .transform(babelify)
//     .require(config.sw, { entry: true })
//     .bundle()
//     .pipe(source("sw.js"))
//     .pipe(gulp.dest(config.temp));
// });


// /**
//  * Copy Dbhelper
//  * @return {Stream}
//  */
// gulp.task("copy-dbhelper", () => {
//   const b = browserify({
//     debug: true
//   });

//   return b
//     .transform(babelify)
//     .require("src/js/idbHelper.js", { entry: true })
//     .bundle()
//     .pipe(source("dbhelper.js"))
//     .pipe(gulp.dest(".tmp/js/"));
// });

// /**
//  * Minify and Copy Images
//  * @return {Stream}
//  */
// gulp.task("copy-images", () => {
//   return gulp
//     .src(config.images)
//     .pipe($.cache($.imagemin()))
//     .pipe(gulp.dest(config.distImages));
// });
// /**
//  *  Copy Icons
//  * @return {Stream}
//  */
// gulp.task("copy-icons", () => {
//   return gulp.src("src/icons/**/*").pipe(gulp.dest("dist/icons"));
// });

// /**
//  * Copy Extras
//  * @return {Stream}
//  */
// gulp.task("copy-extras", () => {
//   return gulp
//     .src(["src/*", "!src/*.html"], {
//       dot: true
//     })
//     .pipe(gulp.dest(config.dist));
// });


// gulp.task("html", ["styles", "js", "copy-sw", "copy-dbhelper"], () => {
//   return gulp
//     .src(config.html)
//     .pipe($.useref({ searchPath: [".tmp", "src", "."] }))
//     .pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true } })))
//     .pipe($.if(/\.css$/, $.cssnano({ safe: true, autoprefixer: false })))
//     .pipe(
//       $.if(
//         /\.html$/,
//         $.htmlmin({
//           collapseWhitespace: true,
//           minifyCSS: true,
//           minifyJS: { compress: { drop_console: true } },
//           processConditionalComments: true,
//           removeComments: true,
//           removeEmptyAttributes: true,
//           removeScriptTypeAttributes: true,
//           removeStyleLinkTypeAttributes: true
//         })
//       )
//     )
//     .pipe(gulp.dest(config.dist));
// });



// gulp.task("icons", () => {
//   return gulp.src("app/icons/**/*").pipe(gulp.dest("dist/icons"));
// });

// gulp.task("fonts", () => {
//   return gulp
//     .src(
//       require("main-bower-files")("**/*.{eot,svg,ttf,woff,woff2}", function (
//         err
//       ) { }).concat("app/fonts/**/*")
//     )
//     .pipe($.if(dev, gulp.dest(".tmp/fonts"), gulp.dest("dist/fonts")));
// });



// gulp.task("serve", () => {
//   runSequence(["clean"], ["styles", "js", "copy-sw"], () => {
//     browserSync.init({
//       notify: false,
//       port: 8000,
//       server: {
//         baseDir: [".tmp", "src"],

//       }
//     });

//     gulp
//       .watch([
//         "src/*.html",
//         "src/images/**/*"
//       ])
//       .on("change", reload);

//     gulp.watch(config.allCss, ["styles"]);
//     gulp.watch(config.allJs, ["js"]);
//     gulp.watch(config.sw, ["copy-sw"]);
//   });
// });

// gulp.task("serve:dist", ["default"], () => {
//   browserSync.init({
//     notify: false,
//     port: 9000,
//     server: {
//       baseDir: ["dist"]
//     }
//   });
// });


// gulp.task(
//   "build",
//   ["html", "copy-images", "copy-icons", "copy-extras"],
//   () => {
//     return gulp.src("dist/**/*").pipe($.size({ title: "build", gzip: true }));
//   }
// );

// gulp.task("default", () => {
//   return new Promise(resolve => {
//     dev = false;
//     runSequence(["clean"], "build", resolve);
//   });
// });

// /**
//  * Log a message or series of messages using chalk's blue color.
//  * Can pass in a string, object or array.
//  */
// function log(msg) {
//   if (typeof (msg) === 'object') {
//     for (var item in msg) {
//       if (msg.hasOwnProperty(item)) {
//         $.util.log($.util.colors.blue(msg[item]));
//       }
//     }
//   } else {
//     $.util.log($.util.colors.blue(msg));
//   }
// }