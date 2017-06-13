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
var trained = parseInt(process.argv[4]) || 0;
var ocrOutDir = docDir + 'OCR_Output/';
var gtDir = docDir + 'gt/';
console.log('Loading directory:', ocrOutDir);
var fileNames = fs.readdirSync(ocrOutDir);
fileNames.sort(naturalCompare);

var totalWords = 0, totalCharacters = 0, werBefore = 0, editDistanceBefore = 0, werAfter = 0,
editDistanceAfter = 0;

for(var i = trained; i < fileNames.length; i++) {
   file = fileNames[i];

   console.log('processing', ocrOutDir + file);
   var page = fs.readFileSync(ocrOutDir + file, {
      encoding: 'utf8'
   }).toString();

   console.log('processing', gtDir + file.split('.')[0] + '.g');
   var gt = fs.readFileSync(gtDir + file.split('.')[0] + '.g', {
      encoding: 'utf8'
   }).toString();

   werBefore += getWER(gt, page);
   editDistanceBefore += editDistance(gt, page);

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

         totalCharacters += word.length;

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

      totalWords += words.length;
   }
   /* end of page correction */

   werAfter += getWER(gt, text_cor);
   editDistanceAfter += editDistance(gt, text_cor);

   var outDir = docDir + 'gt/';
   console.log('writing results to', outDir + file.split('.')[0] + '.out');
   if(!fs.existsSync(outDir)){
      require('mkdirp').sync(outDir);
   }

   fs.writeFileSync(outDir + file.split('.')[0] + '.out', text_cor, {
      encoding: 'utf8'
   });
}

if(fileNames !== 0) {
   werBefore = (1.0*werBefore) / totalWords;
   werAfter = (1.0*werAfter) / totalWords;
   editDistanceBefore = (1.0*editDistanceBefore) / totalCharacters;
   editDistanceAfter = (1.0*editDistanceAfter) / totalCharacters;
}

console.log('Done');
console.log();
console.log('CER:' , editDistanceBefore, '---------->', editDistanceAfter);
console.log('WER:' , werBefore, '---------->', werAfter);


function getWER(rPage, hPage){
   var r = rPage.split(/[\s\n]+/), h = hPage.split(/[\s\n]+/);
   var d = zeros(r.length + 1, h.length + 1);

   for(var i = 0; i < r.length + 1; ++i){
      d[i][0] = i;
   }

   for(var i = 0; i < h.length + 1; ++i){
      d[0][i] = i;
   }

   for(var i = 1; i < r.length + 1; ++i){
      for(var j = 1; j < h.length + 1; ++j){
         if(r[i-1] === h[j-1]){
            d[i][j] = d[i-1][j-1];
         }
         else {
            var substitution = d[i-1][j-1] + 1;
            var insertion    = d[i][j-1] + 1;
            var deletion     = d[i-1][j] + 1;
            d[i][j] = Math.min(substitution, insertion, deletion);
         }
      }
   }
   return d[r.length][h.length];
}

function zeros(rows, cols) {
   var array = [], row = [];
   while (cols--) row.push(0);
   while (rows--) array.push(row.slice());
   return array;
}

function editDistance(a, b) {
   a = a.split(/[\s\n]+/).join('');
   b = b.split(/[\s\n]+/).join('');

   if (a.length === 0) return b.length;
   if (b.length === 0) return a.length;

   var matrix = [];
   var i;
   for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
   }
   var j;
   for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
   }

   var n = a.length,
   m = b.length;
   for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
         if (b.charAt(i - 1) == a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
         }
         else {
            var substitution = matrix[i-1][j-1] + 1;
            var insertion    = matrix[i][j-1] + 1;
            var deletion     = matrix[i-1][j] + 1;
            matrix[i][j] = Math.min(substitution, insertion, deletion);
         }
      }
   }

   return matrix[m][n];
}

function naturalCompare(a, b) {
   var ax = [], bx = [];
   a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]); });
   b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]); });
   while(ax.length && bx.length) {
      var an = ax.shift();
      var bn = bx.shift();
      var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
      if(nn) return nn;
   }
   return ax.length - bx.length;
}
