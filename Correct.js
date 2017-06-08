if(!process.argv[2]){
   console.log('Please enter the path to the language model as the first parameter.');
   return;
}

if(!process.argv[3]){
   console.log('Please enter the directory of the documents as the second parameter.');
   return;
}

var _         = require('underscore');
var Trie      = require('./app/Trie');
var fs        = require('fs');
var Regex = require('./app/Regex');


var languageModelDir = process.argv[2];
console.log('Loading language model:', languageModelDir);
var trie = new Trie(require(languageModelDir));

var docDir = process.argv[3];
var ocrOutDir = docDir + 'OCR_Output/';
console.log('Loading directory:', ocrOutDir);
var fileNames = fs.readdirSync(ocrOutDir);

for(var i = 0; i < fileNames.length; i++) {
   file = fileNames[i];

   console.log('processing', ocrOutDir + file);
   var page = fs.readFileSync(ocrOutDir + file, {
      encoding: 'utf8'
   }).toString();

   /* page correction */
   var lines = page.split(/\n+/);
   var text_cor = '';

   for(var j = 0; j < lines.length; j++) {
      var line = lines[j];
      var words = line.split(/\s+/);

      for(var k = 0; k < words.length; k++) {
         var valid = true;
         var bef = "";
         var word = words[k];
         var aft = "";

         if(Regex.numberWithPuncs.test(word)) {
            valid = false;
         }
         else if(word.length > 1) {
            for (var l = 0; l < word.length; l++) {
               if(Regex.punctuation.test(word.charAt(l))) {
                  bef += word.charAt(l);
               }
               else{
                  word = word.substring(l);
                  break;
               }
            }

            for (var l = word.length - 1; l >= 0; l--) {
               if(!Regex.punctuation.test(word.charAt(l))) {
                  aft = word.substring(l + 1);
                  word = word.substring(0, l + 1);
                  break;
               }
            }
         }

         if(word.length <= 1) valid = false;
         var best = '';
         if(valid) {
            var edit = Math.min(Math.floor((word.length / 5)), 4);
            edit = Math.max(1, edit);
            var result = trie.suggestions(word, edit);

            var max = 0;
            for (var w in result) {
               if(result[w] > max) {
                  max = result[w];
                  best = w;
               }
            }
         }

         if(best) {
            text_cor += bef + best + aft;
         }
         else{
            text_cor += bef + word + aft;
         }

         text_cor += ' ';
      }

      text_cor += '\n';
   }
   /* end of page correction */

   var outDir = docDir + 'gt/';
   console.log('writing results to', outDir + file.split('.')[0] + '.out');
   if(!fs.existsSync(outDir)){
      require('mkdirp').sync(outDir);
   }

   fs.writeFileSync(outDir + file.split('.')[0] + '.out', text_cor, {
      encoding: 'utf8'
   });
}

console.log('Done');
