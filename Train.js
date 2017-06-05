
if(!process.argv[2]){
   console.log('Please enter the training language as a parameter.');
   return;
}

var _         = require('underscore');
var Trie      = require('./app/Trie');
var fs        = require('fs');

var language = process.argv[2].toLowerCase();

var dir = 'config/data/Corpuses/' + language + '/';
console.log('Loading directory:', dir);
var fileNames = fs.readdirSync(dir);

var trie = new Trie();

_.each(fileNames, function(file) {
   console.log('processing', dir + file);
   var page = fs.readFileSync(dir + file, {
      encoding: 'utf8'
   }).toString();
   trie.addText(page);
});

var defaultTrie = 'config/data/Models/' + language + '/';
console.log('writing results to', defaultTrie);
if(!fs.existsSync(defaultTrie)){
   require('mkdirp').sync(defaultTrie);
}

fs.writeFileSync(defaultTrie + 'lm.json', JSON.stringify(trie), {
   encoding: 'utf8'
});

console.log('Done');
