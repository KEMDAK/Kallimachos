const fs = require('fs');

var src_file = null;
var out_file = null;

for (var i = 0; i < process.argv.length; i++) {
	try {
		switch(process.argv[i]) {
			case '-sf':
			case '--src_file':
			src_file = process.argv[i++ + 1];
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

if(!src_file || ! out_file) {
	console.log('The soucre and output files are required.');
	process.exit(1);
}

console.log('loading source file...');
var src_lines = fs.readFileSync(src_file).toString().split(/\n/);

console.log('tokenizing the text...');
var output = [];
var skipped_lines = [];
var c = 0;

for (var i = 0; i < src_lines.length; i++) {
   var line = "";
	src_lines[i] = src_lines[i].trim();
	if(!src_lines[i]) {
		c++;
		continue;
	}
	else {
		skipped_lines.push(c);
		c = 0;
	}

   for (var j = 0; j < src_lines[i].length - 1; j++) {
      if(src_lines[i].charAt(j) === ' ') {
         line += "<SPACE>" + " ";
      }
      else {
         line += src_lines[i].charAt(j) + " ";
      }
   }

   line += src_lines[i].charAt(src_lines[i].length - 1);

   output.push(line);
}

console.log('writing ' + out_file);
fs.writeFileSync(out_file, output.join('\n'), {
    encoding: 'utf8'
});

console.log('writing ' + out_file + '.restore');
fs.writeFileSync(out_file + '.restore', JSON.stringify(skipped_lines), {
    encoding: 'utf8'
});
