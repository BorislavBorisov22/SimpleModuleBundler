const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const babel = require('babel-core');

const { entry, output } = require('./bundler.config.js');

function* idGenerator() {
    let id = 0;
    while (true) {
        yield id++;
    }
}

const ID = idGenerator();

function createAsset(filename) {
    const content = fs.readFileSync(filename, 'utf-8');

    const ast = babylon.parse(content, {
        sourceType: 'module'
    });

    const dependencies = [];

    traverse(ast, {
        ImportDeclaration: ({ node }) => {
            dependencies.push(node.source.value);
        }
    });

    const { code } = babel.transformFromAst(ast, null, {
        presets: ['env']
    });

    return {
        id: ID.next().value,
        filename, 
        dependencies,
        code
    };
}

function createGraph(entry) {
    const mainAsset = createAsset(entry);

    const queue = [mainAsset];

    const graph = [];

    for (const asset of queue) {
        const { filename, dependencies, id } = asset;
        const dirname = path.dirname(asset.filename);
        
        asset.mapping = {};

        asset.dependencies.forEach(relativePath => {
            const absolutePath = path.join(dirname, relativePath);

            const childAsset = createAsset(absolutePath);
            asset.mapping[relativePath] = childAsset.id;

            queue.push(childAsset);
        });
    }

    return queue;
}

function bundle(graph) {
    
    let modules = '';

    graph.forEach((mod) => {
        modules += `
            ${mod.id}: [
                function(require, module, exports) {
                    ${mod.code}
                },
                ${JSON.stringify(mod.mapping)}
            ],
        `
    });

    console.log(modules);
    const result = `
        (function(modules){
            function require(id) {
                const [fn, mapping] = modules[id];

                function localRequire(relativePath) {
                    return require(mapping[relativePath]);
                }

                const module = { exports: {} };
                fn(localRequire, module, module.exports);

                return module.exports;
            }

            require(0);
        })({${modules}});
    `;

    return result;
}

const graph = createGraph(entry);
const result = bundle(graph);

fs.writeFileSync(output, result);
console.log('Files bundled!');
