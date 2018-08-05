const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;

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

    return {
        id: ID.next(),
        filename, 
        dependencies
    };
}

function createGraph(entry) {
    const mainAsset = createAsset(entry);

    const queue = [mainAsset];

    for (const asset of queue) {
        const { filename, dependencies, id } = asset;
        const absolutePath = path.dirname(asset.filename);

        const dependencyPath = path.join(absolutePath, asset.filename);
        console.log(dependencyPath);
    }
}

const graph = createGraph('./example-project/entry.js');