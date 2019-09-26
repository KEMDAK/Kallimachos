const { exec } = require('child_process');
const fs = require('fs');

class LanguageModel {
   constructor(modelPath, tokenizer) {
      this.modelPath = modelPath;
      this.tokenizer = tokenizer;
   }

   correct (srcFile, normalize, callback) {
      try {
         if(!srcFile) {
            callback('The src file is required.');
            return;
         }

         var srcFileWTok = srcFile + '.wtok';
         var srcFileCTok = srcFile + '.ctok';
         var predFileCTok = srcFile + '.pred.ctok';
         var predFileWTok = srcFile + '.pred.wtok';
         var predFileNWTok = srcFile + '.pred.norm.wtok';
         var predFile = srcFile + '.pred';

         if(!this.modelPath) {
            fs.writeFileSync(predFile, fs.readFileSync(srcFile).toString(), {
               encoding: 'utf8'
            });

            callback(null, predFile);
            return;
         }

         exec('perl app/utils/tokenizer.perl -a -no-escape -l ' + this.tokenizer + ' -q  < ' + srcFile + ' > ' + srcFileWTok, (err, stdout, stderr) => {
            if(err) {
               callback(err);
            }
            else {
               exec('node app/utils/TokenizeLetters.js -sf ' + srcFileWTok + ' -of ' + srcFileCTok, (err, stdout, stderr) => {
                  if(err) {
                     callback(err);
                  }
                  else {
                     exec('python3 /opt/OpenNMT-py/translate.py -model ' + this.modelPath + ' -src ' + srcFileCTok + ' -replace_unk -output ' + predFileCTok, (err, stdout, stderr) => {
                        if(err) {
                           callback(err);
                        }
                        else {
                           exec('node app/utils/DetokenizeLetters.js -sf ' + predFileCTok + ' -of ' + predFileWTok, (err, stdout, stderr) => {
                              if(err) {
                                 callback(err);
                              }
                              else {
                                 var tokenizer = this.tokenizer;
                                 var detokenize = function (file) {
                                    exec('perl app/utils/detokenizer.perl -l ' + tokenizer + ' -q  < ' + file + ' > ' + predFile, (err, stdout, stderr) => {
                                       if(err) {
                                          callback(err);
                                       }
                                       else {
                                          var pred_lines = fs.readFileSync(predFile).toString().split(/\n+/);
                                          var skipped_lines = JSON.parse(fs.readFileSync(srcFileCTok + '.restore').toString());
                                          var out_lines = [];

                                          for(var i = 0; i < pred_lines.length; ++i) {
                                             for(var j = 0; j < skipped_lines[i]; ++j) {
                                                out_lines.push('');
                                             }
                                             out_lines.push(pred_lines[i]);
                                          }

                                          fs.writeFileSync(predFile, out_lines.join('\n'), {
                                             encoding: 'utf8'
                                          });

                                          callback(null, predFile);
                                       }
                                    });
                                 };

                                 if (normalize) {
                                    exec('node app/utils/Normalize.js -sf ' + srcFileWTok + ' -tf ' + predFileWTok + ' -of ' + predFileNWTok, (err, stdout, stderr) => {
                                       if(err) {
                                          callback(err);
                                       }
                                       else {
                                          detokenize(predFileNWTok);
                                       }
                                    });
                                 }
                                 else {
                                    detokenize(predFileWTok);
                                 }
                              }
                           });
                        }
                     });
                  }
               });
            }
         });
      }
      catch(err) {
         callback(err);
      }
   }
}

module.exports = LanguageModel;
