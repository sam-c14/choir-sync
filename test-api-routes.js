const { default: routes } = require('./dist/choir-api/src/modules/songs/songs.routes');
console.log(routes.stack.map(layer => layer.route ? Object.keys(layer.route.methods)[0] + ' ' + layer.route.path : layer.name));
