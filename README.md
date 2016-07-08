[![NPM version][npm-image]][npm-url]
[![Gitter](https://badges.gitter.im/avesus/deps-bundler.svg)](https://gitter.im/avesus/deps-bundler?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![NPM][nodei-image]][nodei-url]

# deps-bundler
Simplest javascript web bundler based on module-deps. Supports file changes watch and auto page reload. Also bundles all assets into a HTML file and creates wonderful debbugable source maps.

# Documentation

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

