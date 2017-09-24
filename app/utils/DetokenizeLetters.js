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
var src_lines = fs.readFileSync(src_file).toString().split(/\n+/);

console.log('detokenizing the text...');
var out_lines = [];
for (var i = 0; i < src_lines.length; ++i) {
	var src = src_lines[i];

	src = src.trim().split(' ').join('').split('<SPACE>').join(' ');

	out_lines.push(src);
}

console.log('writing ' + out_file);
fs.writeFileSync(out_file, out_lines.join('\n'), {
    encoding: 'utf8'
});
