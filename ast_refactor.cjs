const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const fs = require('fs');

function refactorFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  traverse(ast, {
    // Convert db.prepare(...).run/get/all(...) to await db.execute(...)
    CallExpression(path) {
      const callee = path.node.callee;
      if (
        t.isMemberExpression(callee) &&
        (callee.property.name === 'run' || callee.property.name === 'get' || callee.property.name === 'all')
      ) {
        const prepareCall = callee.object;
        if (
          t.isCallExpression(prepareCall) &&
          t.isMemberExpression(prepareCall.callee) &&
          prepareCall.callee.object.name === 'db' &&
          prepareCall.callee.property.name === 'prepare'
        ) {
          const sqlArg = prepareCall.arguments[0];
          const queryArgs = path.node.arguments;
          
          let executeArgs = t.objectExpression([
            t.objectProperty(t.identifier('sql'), sqlArg),
            t.objectProperty(t.identifier('args'), t.arrayExpression(queryArgs))
          ]);

          const executeCall = t.callExpression(
            t.memberExpression(t.identifier('db'), t.identifier('execute')),
            [executeArgs]
          );

          let replacement;
          if (callee.property.name === 'get') {
            replacement = t.memberExpression(
              t.memberExpression(t.awaitExpression(executeCall), t.identifier('rows')),
              t.numericLiteral(0),
              true
            );
          } else if (callee.property.name === 'all') {
            replacement = t.memberExpression(t.awaitExpression(executeCall), t.identifier('rows'));
          } else {
            replacement = t.awaitExpression(executeCall);
          }

          path.replaceWith(replacement);

          // Make enclosing function async
          let parentFunc = path.getFunctionParent();
          if (parentFunc) {
            parentFunc.node.async = true;
          }
        }
      }
    },
    
    // Also handle const stmt = db.prepare(...); stmt.run(...)
    VariableDeclarator(path) {
      if (
        t.isCallExpression(path.node.init) &&
        t.isMemberExpression(path.node.init.callee) &&
        path.node.init.callee.object.name === 'db' &&
        path.node.init.callee.property.name === 'prepare'
      ) {
        const stmtName = path.node.id.name;
        const sqlArg = path.node.init.arguments[0];
        
        // Find usages of this statement in the same scope
        const binding = path.scope.getBinding(stmtName);
        if (binding) {
          binding.referencePaths.forEach(refPath => {
            const parent = refPath.parentPath;
            if (t.isMemberExpression(parent.node) && t.isCallExpression(parent.parentPath.node)) {
              const method = parent.node.property.name;
              const queryArgs = parent.parentPath.node.arguments;
              
              let executeArgs = t.objectExpression([
                t.objectProperty(t.identifier('sql'), sqlArg),
                t.objectProperty(t.identifier('args'), t.arrayExpression(queryArgs))
              ]);

              const executeCall = t.callExpression(
                t.memberExpression(t.identifier('db'), t.identifier('execute')),
                [executeArgs]
              );

              let replacement;
              if (method === 'get') {
                replacement = t.memberExpression(
                  t.memberExpression(t.awaitExpression(executeCall), t.identifier('rows')),
                  t.numericLiteral(0),
                  true
                );
              } else if (method === 'all') {
                replacement = t.memberExpression(t.awaitExpression(executeCall), t.identifier('rows'));
              } else {
                replacement = t.awaitExpression(executeCall);
              }

              parent.parentPath.replaceWith(replacement);
              
              let parentFunc = parent.getFunctionParent();
              if (parentFunc) {
                parentFunc.node.async = true;
              }
            }
          });
          
          // Remove the original const stmt = db.prepare(...)
          path.remove();
        }
      }
    }
  });

  const output = generate(ast, { retainLines: true }, code);
  fs.writeFileSync(filePath, output.code);
  console.log('Successfully refactored ' + filePath);
}

refactorFile('server/index.js');
refactorFile('server/telegramBot.js');
