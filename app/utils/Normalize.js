const fs = require('fs');

var src_file = null;
var trg_file = null;
var out_file = null;

for (var i = 0; i < process.argv.length; i++) {
	try {
		switch(process.argv[i]) {
			case '-sf':
			case '--src_file':
			src_file = process.argv[i++ + 1];
			break;
			case '-tf':
			case '--trg_file':
			trg_file = process.argv[i++ + 1];
			break;
			case '-of':
			case '--out_file':
			out_file = process.argv[i++ + 1];
			break;
      }
   }
   catch (e) {
      console.log('The parameters are not formatted correctly.');
      process.exit(1);
   }
}

if(!src_file || !trg_file || !out_file) {
	console.log('The soucre, target and output files are required.');
	process.exit(1);
}

var align = function (src, trg) {
   var dp = [];

   var n = src.length;
   var m = trg.length;

   for (var i = 0; i <= n; i++) {
      dp[i] = [i];
   }

   for (var j = 0; j <= m; j++) {
      dp[0][j] = j;
   }

   for (var i = 1; i <= n; i++) {
      for (var j = 1; j <= m; j++) {
         if (src.charAt(i - 1) == trg.charAt(j - 1)) {
            dp[i][j] = dp[i - 1][j - 1];
         } else {
            dp[i][j] = Math.min(
               /* substitution */ dp[i - 1][j - 1] + 1,
               /* insertion */ Math.min(dp[i][j - 1] + 1,
               /* deletion */ dp[i - 1][j] + 1));
         }
      }
   }

   var i = n;
   var j = m;
   var last = n;
   var srcN = '';
   var trgN = '';
   while(i != 0 && j != 0) {
      if(src.charAt(i - 1) == trg.charAt(j - 1)) {
         i--;
         j--;
         srcN += src.charAt(i);
         trgN += src.charAt(i);
      }
      else {
         if(dp[i][j] == dp[i - 1][j - 1] + 1) {
            /* substitution */
            i--;
            j--;
            if(trg.charAt(j) == ' ') {
               srcN += ' ';
            }
            else {
					if(src.charAt(i) == ' ') {
						srcN += '#';
					}
					else {
						srcN += src.charAt(i);
					}
            }

            trgN += trg.charAt(j);
         }
         else if(dp[i][j] == dp[i][j - 1] + 1) {
            /* insertion */
            j--;
            if(trg.charAt(j) == ' ') {
               srcN += ' ';
            }
            else {
               srcN += '#';
            }

            trgN += trg.charAt(j);
         }
         else if(dp[i][j] == dp[i - 1][j] + 1) {
            /* deletion */
            i--;
            if(src.charAt(i) == ' ') {
               srcN += '';
            }
            else {
               srcN += src.charAt(i);
            }

            trgN += '#';
         }
      }
   }

   srcN = srcN.split("").reverse().join("");
   trgN = trgN.split("").reverse().join("");

   return [srcN, trgN];
};

var editDistance = function (a, b) {
   var dp = [];

   var n = a.length;
   var m = b.length;

   for (var i = 0; i <= n; i++) {
      dp[i] = [i];
   }

   for (var j = 0; j <= m; j++) {
      dp[0][j] = j;
   }

   for (var i = 1; i <= n; i++) {
      for (var j = 1; j <= m; j++) {
         if (a.charAt(i - 1) == b.charAt(j - 1)) {
            dp[i][j] = dp[i - 1][j - 1];
         } else {
            dp[i][j] = Math.min(/* substitution */ dp[i - 1][j - 1] + 1, /* insertion */ Math.min(dp[i][j - 1] + 1, /* deletion */ dp[i - 1][j] + 1));
         }
      }
   }

   return dp[n][m];
}

var eliminateChar = function (s, ch) {
   var res = '';

   for (var i = 0; i < s.length; ++i) {
      if(s.charAt(i) == ch) continue;

      res += s.charAt(i);
   }

   return res;
};

console.log('loading source file...');
var src_lines = fs.readFileSync(src_file).toString().split(/\n+/);
console.log('loading target file...');
var trg_lines = fs.readFileSync(trg_file).toString().split(/\n+/);

if(src_lines.length !== trg_lines.length) {
	console.log(src_lines.length, trg_lines.length);
	console.log('source and target files must contain the same number of lines.');
	process.exit(1);
}

var out_lines = [];

for (var i = 0; i < src_lines.length; ++i) {
	var src = src_lines[i].trim();
	var trg = trg_lines[i].trim();

	var alignment = align(src, trg);

   var src_tokens = alignment[0].split(/\s+/);
   var trg_tokens = alignment[1].split(/\s+/);

   alignment = [];

   for (var j = 0; j < src_tokens.length; ++j) {
      if(j >= trg_tokens.length) {
         alignment.push(eliminateChar(src_tokens[j], '#'));
         continue;
      }

      var edits = editDistance(src_tokens[j], trg_tokens[j]);

		var match = src_tokens[j].length - edits;

      var threshold = 0;

      switch(src_tokens[j].length) {
         case 1:
         case 2:
         case 3: threshold = 1; break;
         case 4:
         case 5:
         case 6: threshold = 3; break;
         default: threshold = 5; break;
      }

      if(match >= threshold && trg_tokens[j].length <= 15) {
         alignment.push(eliminateChar(trg_tokens[j], '#'));
      }
      else {
         alignment.push(eliminateChar(src_tokens[j], '#'));
      }
   }

   out_lines.push(alignment.join(' '));
}

console.log('writing ' + out_file);
fs.writeFileSync(out_file, out_lines.join('\n'), {
    encoding: 'utf8'
});
