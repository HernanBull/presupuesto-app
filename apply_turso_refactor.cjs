const fs = require('fs');

function refactor(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Make all app.get/post/put/delete handlers async
  code = code.replace(/app\.(get|post|put|delete)\s*\(\s*(['`"].*?['`"])\s*,\s*(?:require[A-Za-z]+,\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{/g, (match) => {
    if (!match.includes('async')) {
      return match.replace(/((?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{)/, 'async $1');
    }
    return match;
  });

  // Also make middleware async if they contain db calls
  code = code.replace(/const\s+(require[A-Za-z]+)\s*=\s*\([^)]*\)\s*=>\s*\{/g, (match) => {
    return match.replace('(', 'async (');
  });

  // Transform const stmt = db.prepare(...); stmt.run(...)
  // We'll replace it by await db.execute(...)
  // Note: we can map the arguments as well.
  
  // To keep it simple, let's just use a powerful regex
  // db.prepare(SQL).get(ARGS) -> await db.execute({ sql: SQL, args: [ARGS] }).then(r => r.rows[0])
  // db.prepare(SQL).all(ARGS) -> await db.execute({ sql: SQL, args: [ARGS] }).then(r => r.rows)
  // db.prepare(SQL).run(ARGS) -> await db.execute({ sql: SQL, args: [ARGS] })

  // Let's replace db.prepare(SQL).all/get/run(ARGS)
  // We'll use a replacer function
  code = code.replace(/db\.prepare\s*\(([\s\S]*?)\)\s*\.(get|all|run)\s*\(([\s\S]*?)\)/g, (match, sql, method, args) => {
    let newArgs = args.trim() ? `[${args}]` : `[]`;
    if (method === 'get') {
      return `(await db.execute({ sql: ${sql.trim()}, args: ${newArgs} })).rows[0]`;
    } else if (method === 'all') {
      return `(await db.execute({ sql: ${sql.trim()}, args: ${newArgs} })).rows`;
    } else {
      return `await db.execute({ sql: ${sql.trim()}, args: ${newArgs} })`;
    }
  });

  // Transform split queries:
  // const insert = db.prepare(SQL);
  // insert.run(ARGS);
  
  code = code.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*db\.prepare\s*\(([\s\S]*?)\)\s*;\s*\1\.(run|get|all)\s*\(([\s\S]*?)\);/g, (match, varName, sql, method, args) => {
    let newArgs = args.trim() ? `[${args}]` : `[]`;
    if (method === 'get') {
      return `const ${varName} = (await db.execute({ sql: ${sql.trim()}, args: ${newArgs} })).rows[0];`;
    } else if (method === 'all') {
      return `const ${varName} = (await db.execute({ sql: ${sql.trim()}, args: ${newArgs} })).rows;`;
    } else {
      return `await db.execute({ sql: ${sql.trim()}, args: ${newArgs} });`;
    }
  });
  
  // Transform db.prepare('...').get() without arguments where it might be broken
  // Sometimes people write db.prepare(SQL).run()
  code = code.replace(/db\.prepare\s*\(\s*(['`"].*?['`"])\s*\)\.(run|get|all)\(\)/g, (match, sql, method) => {
    if (method === 'get') {
      return `(await db.execute(${sql})).rows[0]`;
    } else if (method === 'all') {
      return `(await db.execute(${sql})).rows`;
    } else {
      return `await db.execute(${sql})`;
    }
  });

  fs.writeFileSync(file, code);
  console.log(`Refactored ${file}`);
}

refactor('server/index.js');
refactor('server/telegramBot.js');
