
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
   if(file.split('.')[1] === 'csv') {
      /* csv file with frequencies */
      var lines = page.split(/\n+/);
      for(var i = 0; i < lines.length; i++) {
         var line = lines[i].split(',');
         var words = line[0].split(/\s+/);
         for(var j = 0; j < words.length; j++) {
            trie.addWord(words[j], parseInt(line[1]));
         }
      }
   }
   else {
      /* text file */
      trie.addText(page);
   }
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
