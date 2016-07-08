var global = window;
var process = {
  env: {}
};

var modules = {};

function regModule (path, loader, deps) {
  modules[path] = {
    module: {
      filename: path,
      exports: {}
    },
    loader: loader,
    deps: deps
  };
}

function loadModule (resolvedFullPath) {
  var moduleDesc = modules[resolvedFullPath];
  var module = moduleDesc.module;
  if (!module.loaded && !module._loading) {
    module._loading = true;
    moduleDesc.loader(module.exports,
      function require (modulePath) {
        var resolvedFullPath = moduleDesc.deps[modulePath];
        if (resolvedFullPath) {
          return loadModule(resolvedFullPath);
        } else {
          throw('Builtin modules are unsupported or path not found');
        }
      },
      module, module.filename);

    module._loading = false;
    module.loaded = true;
  }

  return module.exports;
}

Object.keys(modulesInfo).forEach(function(modulePath) {
  var moduleInfo = modulesInfo[modulePath];
  regModule(modulePath, moduleInfo[1], moduleInfo[0]);
});

