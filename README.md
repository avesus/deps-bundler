[![NPM version][npm-image]][npm-url]
[![Gitter](https://badges.gitter.im/avesus/deps-bundler.svg)](https://gitter.im/avesus/deps-bundler?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![NPM][nodei-image]][nodei-url]

# tuffbundler

Main purpose of tuffbundler is extremely, insanely, simple. It's like Browserify.
It's like webpack without config files. It takes one file (only one, we do not support
and never will be supporting multiple "vendor" entry points and multiple chunks),
finds all `import`'s and `require()`'s in it, walks thru all the dependency tree,
keeps watching over all files in the tree (when loaded as API from your dev server),
re-bundling and minifying after changes, notifying your server to tell connected
clients to get new changes.

It supports only _one_ advanced import - `.css.js` files. For those imports,
tuffbundler uses Tuff CSSinJS module to take all CSS code exported as simple strings
from those `.css.js` files, and then rewrite their main class name into something different
(on production), or just to convert your statement where you importing your `.css.js` file
straight into class name string.

The main limitation of our CSS in JS approach is that a single`.css.js` file
can have only CSS declarations for one CSS class.
You can provide tons of combinations, but a single CSS in JS must refer
only one component intended to style.

Example:
```
const branding = require('./../common/branding')
module.exports = `
.Button {
  width: 100px;
  color: ${ branding.mainButtonColor };
}
.Button.raised {
  color: ${ branding.highlightButtonsColor };
}

.Button > div {
  background: url(\'data:image/svg+xml;utf8,${ branding.logoSvg }\') no-repeat;
  width: ${ branding.logoWidth }px;
  height: ${ branding.logoHeight }px;
  background-size: ${ branding.logoWidth }px ${ branding.logoHeight }px;
}

.Button > div:first-child {
  color: blue;
}

@media (min-height: 680px), screen and (orientation: portrait) {
  .Button {
    width: 100%;
  }
  .Button > div {
    width: 100%;
    height: 100%;
  }
}

`
```

After extracting all your CSS, they get merged to extract common things, so instead of 
```
.Button {
  color: gray;
}
.EditBox {
  color: gray;
}
```
You get
```
.a {
  color: gray;
}
```
and if you have other statements, the class provided will be written as `a Button` and `a EditBox`
at the place of their use. Of course, common things extraction is an optimization step,
and it's very unlikely that your component classes will have those names after optimization: `a b` and `a c`.

# Why

In December 2017 I get tired of using webpack. A year and five months ago I was working on
a tiny dependencies bundler with integrated support for JavaScript inlined code in HTML with
perfect source maps support.

I started working on that project after my frustration from the use of webpack in watch mode
when I was working in Vim in my tiny DigitalOcean container over SSH and GNU Screen.
Webpack working continuosly was eating a lot of RAM, launch of the hot reload feature was
taking like one minute (!) and yet at those times I get tired of migration of webpack.config.js
after breaking changes between versions.

I don't know why Tobias Koppers loves to force his users to rewrite config files every 6 months,
at the time when the authors of bigger projects (nginx, Apache, PHP, even Linux!) are able
to manage almost perfect backward compatibility of _config options_!

One day before I started maintaining this awesome dependencies bundler,
I've tried webpack the last time in my life (beside of the time of maintaining of existing projects,
quickly transitioning them to deps-bundler). I've put `NODE_ENV=production` in my `.env` to
build release package of a project I was working on. Webpack produced _uncompressed unminified output_.

Despite of all my UglifyJsPlugin being at the right place. Despite of switching from v.3 to v.4 alpha1.
Nothing helped to create a production bundle.
I was left with two options to quickly deploy new version on production: downgrade webpack back to some
working previous version (find first which one without breaking the fragile config file),
or just put the unsuccessfully compressed _uncompressed_ bundle.js as input of UglifyJS2
(uglify-es, specifically, because we don't support old browsers anymore, it's almost 2018 and AIs
conquering the world).
Of course, the second option was the fastest way to implement, but I didn't want to support it anymore.

My patience was broken, finally, and I decided to resurrect my toy project which was called deps-bundler.

# What deps-bundler is? One more in the line of Browserify and webpack?..

deps-bundler is all you need to debug and deploy your modern cross-platform web and hybrid mobile
Cordova-based application. For the purposes of building an SPA with a very opinionated, but optimized for
performance and ease of use, way of packaging CSS and creating index.html entry point,
deps-bundler may completely replace webpack in your project.

deps-bundler supports the same hot reloading APIs as webpack, but provides additional "new version available"
notifications delivery over WebSocket channels. It's possible to use an existing WebSockets code, which
you already may have in your project, or use our very robust WebSockets library (it supports automatic
reconnects, server reboot detection, optimized binary messages, message types, send queue,
guaranteed messages delivery, and very simple API).

deps-bundler builds and packages all your code: CSS, HTML, JavaScript.

# Dependencies

## Tuff OOP

Objective Oriented Programming made easy.

Borrows some ideas from Python class declarations (explicit `self` as first argument of all methods),
from C++ pointers-to-members and virtual functions, and in some way from C# method delegates.

Encourages use of composition over inheritance thru delegation.
The delegation is achieved at the moment of contained object instantiation,
which gets subclassed in containing class' function on the fly with
overriding methods which are used as delegates with full access to the containing class closure.

Tuff OOP was created to better handle complex component hierarchies and was inspired heavily
by the Elm Architecture and Yassine Elouafi's article on how to use it in JavaScript easily.

## CSS Minification

We use cssnano as state of the art CSS minifier.

## JavaScript Minification

We use UglifyJS (uglify-es, specifically) to generate AST, use the AST in search of dependencies
(`require()` calls and `import` statements), to substitute imports of `.css.js` files
with generated class names, and, of course, to minify production bundle.

## Tuff Sockets

Tuff WebSockets provide great reliable way to communicate between your dynamic web apps in real time
and add huge amount of reliability and simplicity to the standard WebSockets implementation.

It uses binary protocol internally and lets to transmit binary data in very fast and optimized ways.

Has client and server components.

Project plans are very ambitious: a special ultra-high performant web server which could replace your
nginx configuration and hold all opened WebSocket connections at the time when you restart your server
or have an accidental crash / update, significantly improving user experience, was planned to develop in 2018.

A prototype can be created in JavaScript, the `uws` WebSocket library is used to handle connections
in the prototype mode, but all C++ packages have to be preserved in RAM when updating / restarting
JavaScript part. The reason is that inter-process communication between two Node.js processes
can be made fast and optimized, but the main goal was to create a single-threaded cheap virtualization
containers oriented server with small amount of RAM. Spawning two Node.js processes just to hold WebSockets
come as a not very neat idea, and without that, the requirement to support safe webpack-style hot reload
of server packages but not C++ was very limiting and errors-prone. On server side, hot reload is a tricky theme.

So it was decided to experiment more with client-server WebSocket messaging and protocols before implementing
a full C++ version of high-performant HTTP/2 and WebSockets suppporting server specially optimized for
Single Page Applications with WebSocket messaging instead of old-school REST and AJAX communication.

## Tuff Debug

Simplifies delivery of exceptions and console.logs to the server, classifies all those by connections,
uses Tuff Sockets internally, monitors your source code tree changes and delivers the changes
to clients. Integrates with the builder system to react on build complete events and notifying the client side.
On the client side simple reloading can be used then, or Tuff Hot Update to speed up changes delivery
when developing components to the lightning fast, instanteous, refresh speed.

## Tuff Updater

Delivers messages on client side that code changed (new version is available). Used in Tuff Debug
to communicate with client side to push changes. Supports refresh page and Tuff Hot Update technology,
which resembles webpack Hot Reload APIs. Optionally, provides Cordova plugins to put your new JavaScript
app versions right into your installed mobile apps without the necessety
to re-publish new versions on mobile app stores.

For web apps, provides simple APIs to react on new change, to take a reload action, and a code to inject
new version into running web app (Tuff Hot Code Patching).

## Tuff Time Sync

Client and Node.js server library helping to "synchronize" time on client and server,
enabling developers to profile round-trip intervals between events encouraging more
event-driven architectural style of your web applications.
Used by Tuff Debug to add precise timestamps to the collected console.log and exception messages
which will have the same time of occurence on server side.

# Features

### Opinionated for Single Page Web Applications

## Generation of Common Code Parts

### Theory of Common Code Parts

Common code parts may be intended for multiple different goals,
often confused by developers as being parts of one goal:

1. Sharing common code between multiple isolated HTML pages.
2. Unloading of one part of a very large web app and loading of another, but sharing common code.
3. Progressive loading of a large app's JavaScript and CSS in the background.
4. Delayed loading in the background of yet invisible parts, usually other routes, to speed up parsing of the initial page JavaScript
5. Caching of rarely changed code and parallelization of parsing.


#### 1. Sharing common code between multiple isolated HTML pages

Sharing common code between multiple isolated HTML pages and delayed loading
may be implemented using the same approach because of their virtue of
having shared common JavaScript and CSS.

#### 2. Unloading of one part of a very large web app and loading of another, but sharing common code

After your video editor is loaded, if you have some super heavy activities or dialogs,
it's higly advised to switch to those as another sub apps. That means that all JavaScript and CSS
which is not used in those heavy activities must be unloaded (only shared parts should be preserved).

After main app is loaded, to save memory it's highly advised to load all related
JavaScript and HTML assets for heavy dialogs and activities only when those are activated,
and unload those immediately after user closes them. If you have a desire to pre-cache
some dialogs to let faster return back, consider adding those dialogs as parts of your app.
You yet can use the technique #3 to postpone loading of those complex dialogs in the background
improving main page startup time.

#### 3. Progressive loading of a large app's JavaScript and CSS in the background.

Web pages are intended to be displayed gradually. A background color and a logo come first,
maybe a loaderanimation may be displayed shortly after. Then a basic frame or current page/screen route.
And all other routes may be downloaded in the background before user changes the route.

The graduality here is of two different hierarchies: a) gradual loading as a thing
(it's expected that UI will reflect those steps of this phase), and
b) invisible parts delayed loading - just to display the main app faster to avoid parsing
of the whole JavaScript and the bigger CSS at startup.

#### 4. Delayed loading in the background of yet invisible parts, usually other routes, to speed up parsing of the initial page JavaScript

JavaScript and CSS for all other routes must be downloaded here for the core app.
If your app is too huge, like an video editor, parts not visible at startup may be loaded
in the background, but intention here is to load all core part of your app.
Switch to super heavy dialogs and activities must be implemented as a switch between apps,
instead of loading of even more assets. The switch is performed by other technique (#2).

#### 5. Caching of rarely changed code and parallelization of parsing

This is a core technique even for very simple apps.
Put all your framework and library code into one JS,
CSS resets and rarely changed CSS into a corresponding CSS file,
then put all your app code into its own JS and CSS, correspondingly.
The load time over modern HTTP/2 will be not compromized, and parsing will happen faster,
as our tests showed, even on slow Android devices.

Note that in some cases, when library / framework code changes very frequently,
the technique is yet feasible because browsers somehow parallelize parsing of JavaScript.

The problem here is when a part of your app (for example, a root view) is changed rarely,
but depends on a frequently changed view code, then the rarely changed code should
wait when that frequently changed part of code will be loaded.
The best approach here is to use the technique #3 to gradually display the view in such a way
that the view contained in your frequently changed code will register itself in the already presented parent view.

Note that it's in principle impossible to implement that using another technique,
because, logically, your root view is already there and ready to be displayed.
And it will render all components which rarely change because those will be available
in the same bundle next to the root view.

But a frequently changing child view is nothing but progressively available component,
and it definitely may be loaded in the background to improve caching.

From other case, if a child view is a rarely changed component, its code will be loaded and parsed,
and will stay there and wait until its parent will activate it, so no special postponed imports
will be necessary in that case.

### Common Code Parts Generation Support

Programmatic control of progressively loaded or postponed resources is available in all modern browsers:
https://pie.gd/test/script-link-events/

The bundler may be configured to reach each of the specified goals separately.

#### Opinions Description

deps-bundler is a very opinionated bundler to keep all features highly optimized and my target users
absolutely satisfied. We will *never* support multiple entry points and common chunks or other common
code extractors, cached vendor package bundles, new cool cached optimized web standards promoted
`<script type="module">` and `import` in the browser-side code.
Things do change very frequently in all code parts, and networks are fast enough to transfer your bundle
over packaged with React, Tuff, or other trendy framework, instead of loading only your cool updated code.

Loading is fast.
You don't need to load many small files in parallel, because performance bottleneck is not in the network.
But we do design with the idea in mind that slow connections sometimes happen.

The problem HTTP/2 is trying to address just not so important vs simplicity of your solution.
We don't care about optimization of unnecessary data transfers depending on which page your user is.
It's just wrong part to solve that on the level of HTTP/2 and HTML. Because when you have SPA,
for huge, enterprise-grade apps, you can dynamically `import().then()` your complex
parts, but that's outside of the scope of deps-bundler. The builder is highly optimized for fast mobile-enabling
web and hybrid mobile apps. If you have feeling that your app is too huge and requires multiple parts
to be loaded and parsed only when user accesses them, or maybe in the background to preload them for
readyness, consider to split your app to several web and mobile apps doing different things.
Address marketing and promotion part instead. Anyway, it will significantly improves usability.
Even when you're building a video editor in browser.

Which benefits really are in the option to avoid the transfer over network all code,
when only one byte was changed in your code base (with high probability, in your client app code)
when a full bundle with all libs and framework code will be retransmitted and re-parsed?

We've measured the parsing speed using HTTP/2 protocol when "vendor" file was cached permanently
using hashed persistent caching, and client app js was downloaded each time page accessed,
and _compared_ the performance with just one single "bundle". We also compared different client code
sizes comparing to the "vendor" part.

We've discovered that reading from cache on mobile devices is ridiculously slow, about 1 ms per KB.

2 big js from cache: 350 - 450 - 525 - 575 ms (but sometimes it can take up to 5(!!!) seconds just to read a file from mobile cache)
2 big js from network: 550 - 575 - 625 - 650 - 800 ms
a byte was changed in the smaller file: 380 - 430 - 550 - 575 - 600 ms

One big file: 650 - 675 - 700 - 850 ms (no magic here, expectable result - the same as 2 split files, because mobile is slow!)
A byte was changed: 600 ms (obviously. the work of network compression, but we expect the same result).
One big file from cache: 425 (from RAM cache) - 475 (disk cache) - 550 - 575 ms

Doing web app startup time performance measurements, we've discovered that one big JavaScript file
is loaded and parsed slower than a pair of js files.
If only one of the files was changed, the app loads faster.

Another "feature" was stated by HTTP/2 and browser developers that many content-types are delayed
when those are all bundled in one file and cannot be processed in parallel.
Again, it assumes that the parallel processing will be faster on your specific device, which is
not true for mobile. The transfer time itself doesn't matter too much.

Moreover, we even transfer CSS as a string inside of JavaScript, because our measurements showed
that page is displayed faster if you have that string and insert it in your JavaScript,
rather than CSS is referenced as additional `<link>` in your `<head>`.

But, despite of all those reasons, the main reason was to encourage developers to build compact,
fast starting, and smoothly working, web and hybrid mobile apps, and to make sure that when your
JavaScript code is started, it already has all required parts in browser, so navigation between
different views will be lightning fast.

Another reason is that when you have one monolyth bundle, it can be optimized much better,
tons of unnecessary code can be thrown away automatically.

### Integration with Cordova
Builder creates files

### Perfect source maps support
### Inlined in index.html JavaScript for 

### API-first
No global webpack executable. No command line interface. It's a wrong way to do things in 2018.
Instead, deps-bundler works in two very smart modes of operation: a) script invocation, and
b) watching mode.

#### Script Invocation Mode
It was inspired by Python way of script invocation. It automatically detects whether main deps-bundler
file was executed directly, or `require()`'d to a `.js` file.
What it doing is using your config file to launch all bundling stages in the following order:

##### 1. Compiling SPA Entry Point (index.html)
deps-bundler doesn't support web applications with multiple html files,
but in theory, it's possible to build those and configure correspondingly.
We'll provide possible solutions in support tickets. Just file an issue if you need that functionality.
Advised nginx config is provided to ensure that caching will work perfectly, and API endpoints will be accessed seamlessly.

It gets `index.html` template (we're highly recommend using our standard template),
gets `preloader.css` code, gets `preloader.js` code (awesome tool to establish a WebSocket connection
as fast as possible and get `load` event instantly - of course it can break some old web search engines,
so use with caution).

#### 2. Bundling main assets

#### Watching Mode

# deps-bundler
Simplest javascript web bundler based on module-deps. Supports file changes watch and auto page reload. Also bundles all assets into a HTML file and creates wonderful debbugable source maps.

#### Hot Reloading
The API to enable hot code replacement is the same as in webpack, plus additional extension to notify your
production users about new version available, and also downloading of that new version in a Cordova mobile app.

# Documentation

## CSS opinionated way

CSS works on the level of Component Classes. You can put any declarations in your CSS, and can use
a naming convention, for convenience.

One opinion: our modular CSS doesn't allow to change a style of another component.

Our CSS loader detects `require()` with `.css.js` extension. That `.js` doesn't get imported in the same
way as all CommonJS modules, but `require()`'d by compiler at compile time.
The contents are ordinary CSS in JS. You just export a text string containing CSS definitions.
The compiler parses the exported string to consider _one_ default class name which will be used
in development mode and displayed in your browser's devtools.
In production mode, the compiler replaces it with sequentially generated class name, starting from `a`,
like `a`, `b`, `c`, ..., `a1`, `a2`, ... , `aa`, `ab`, ... `aa1`, ... `aaa`, etc.

What goes in the JavaScript file where your `.css.js` was `import`'ed or `require()`'d is
just that simple text string value.

Of course, you can import any `.js` files in your `.css.js` files to parametrize those at compile time.

Another strong opinion: we do not support parametrization of CSS at runtime.
We highly advise you to combine style classes (you can import as many `.css.js` files in your
component's file as necessary to refer and combine different CSS class names, for example,

```
import style_Button from './Button.css.js'
import style_Raised from './../common/HighlightedComponent.css.js'

<Button className=`${ style_Button } ${ style_Raised }` />
 
```

All imports get replaced with `const` declarations containing CSS class name string.

Generated code, though, concatenates all CSS and highly optimizes those providing
source maps for all your `.css.js` files!
The concatenated CSS is packaged in the bundle (to prevent browsers from creating another TCP connection),
and inserted each time your JavaScript module containing `require()` of a `.css.js` file
imported in any other JavaScript module, so, lazily injecting new CSS declarations.


Another opinion: NPM modules are JavaScript modules. Not ES2037+ modules. Not TypeScript modules.
Not CoffeeScript or ClojureScript.

So, if you're an author of an NPM package, your main index.js and all files it depends
better should be transpiled to JavaScript supported by modern browsers and Node.js,
or even to ES5, if your code is supposed to cover everybody in the world with old cheap devices.

The bundler works only with those JavaScript files. The only one, single, sensitive, ugly, exception
was made to allow including `.css.js` files. But if you forget to include the preparser, those
will be imported anyway, generate class name as their module.exports value, and adds runtime code
to inject CSS to your styles, so nothing will be broken in plain old JavaScript `require()`.

The preparsing of `.css.js` files implemented by an extension of the bundler, which sets callback
on each `.css.js` file found to collect all CSS from your project. Then it generates CSS inserting code
which puts your CSS into DOM. Then bundler bundles everything together (it has that special post step,
letting a bundling extension to supply an additional dependency).

CSS in JS as a string: 250 - 350 - 700 ms
Small CSS in JS as a string: 175 (RAM) - 250 - 275 - 300 - 350 ms (both first and all subsequent loads)
Small CSS as a reference from HTML: 175 (RAM) - 200 - 225 - 250 - 325 ms (can timeout for one of the assets!)

Big CSS in JS as a string: 300 (rare) - 350 - 375 (often) - 425 - 450 - 575 - 600 - 675 ms
Big CSS as a reference from HTML: 275 - 325 (cached) - 375 ms



Note: Work in progress, alpha-stability.

## Usage

`node ./node_modules/deps-bundler --watch --output index.html entry.js`

## API
WIP

## NPM packages source mapping

Packages written not in JavaScript supported by modern browsers and Node should contain source maps to allow debug your code when you use modules written in such languages.
Supplying:

 - Source maps near compiled js in the same folder
 - Inlined source maps
 - No source maps at all

[npm-url]: https://www.npmjs.com/package/deps-bundler
[npm-image]: https://img.shields.io/npm/v/deps-bundler.svg
[nodei-image]: https://nodei.co/npm/deps-bundler.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/deps-bundler

# Other Tools

## Tuff SVG Launch Image Generator

Takes your branded logo image (SVG, of course!) and creates PNG files to generate your mobile app's
launch screens suitable to use in Cordova.
Helps to have branded logo image on preloader in cross-platform way. On mobile, the bundle JavaScript
is already there in most cases, but WebView initializes a while, so, a launch image helps a lot
to make it feel like an app is doing things (at least, showing the logo).
On web, we advise you to include the logo SVG directly into your HTML, so, in case of slow networks
or some caching issues with modern browsers, while your main bundle JavaScript is loaded,
your logo will be presented to your users.

## Tuff Branded Logo Timer

Keeps your logo presented exact amount of milliseconds determined by your designers, marketers, and UX experts,
rather by technology limitations and slowiness of connections.
On web, it just counts time from the moment when the logo was displayed.
On mobile, it uses special system APIs from Cordova plugins to get your app's launch time.

You can initiate a smooth animated transition from your branded logo to your rendered UI.

Tuff Web Framework enables UI layouts and help to connect to existing DOM and animate transition into
new layout.

We not advise you to focus on those branded logo to UI transitions for any screens beside of
the first start (with login page or things like that), because on mobile it's assumed that your
app will restore its state on the screen where user was before exit. But you can design smooth
animated transitions from your logo screens to more than one screen, if you want.

Without Tuff Web Framework, you can 

# Author
Brian Haak, (C) 2016, 2017.
License: MIT

