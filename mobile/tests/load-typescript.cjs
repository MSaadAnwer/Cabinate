const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

module.exports = function loadTypeScript(path, modules, globals = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  runInNewContext(source, {
    ...globals,
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(modules, name), `Missing test dependency: ${name}`);
      return modules[name];
    },
  });
  return exports;
};
