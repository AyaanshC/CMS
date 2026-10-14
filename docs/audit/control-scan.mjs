// Candidate scanner only: ancestor forms, links and component triggers require review.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []);
}
for (const file of walk("src")) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(n) {
    if (ts.isJsxElement(n) && ["Button", "button"].includes(n.openingElement.tagName.getText(source))) {
      const attrs = n.openingElement.attributes.properties.map(a => a.name?.getText(source));
      const text = n.children.filter(ts.isJsxText).map(c => c.text.trim()).filter(Boolean).join(" ");
      if (text && !attrs.includes("onClick") && !attrs.includes("type") && !attrs.includes("render")) {
        const line = source.getLineAndCharacterOfPosition(n.getStart()).line + 1;
        process.stdout.write(`${file}:${line}: ${text}\n`);
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
