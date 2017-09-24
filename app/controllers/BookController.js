/**
* @module Book Controller
* @description The controller that is responsible of handling book's requests
*/

var AdmZip    = require('adm-zip');
var fs        = require('fs');
var rimraf    = require('rimraf');
var _         = require('underscore');
var User      = require('../models/User').User;
var Book      = require('../models/Book').Book;
var Page      = require('../models/Page').Page;
var Corpus    = require('../models/Corpus').Corpus;
var format    = require('../scripts').errorFormat;
var languages = require('../../config/data/Languages.json');
var LanguageModel = require('../utils/LanguageModel');

/**
* This function gets a list of all books owned by the logged in user currently in the database.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.index = function(req, res, next) {
   req.user.getBooks().then(function(books) {
      var result = [];

      for(var i = 0; i < books.length; i++) {
         var cur = books[i].toJSON();

         cur.language = languages[cur.language_id - 1].name;

         delete cur.user_id;
         delete cur.language_id;

         result.push(cur);
      }

      res.status(200).json({
         status:'succeeded',
         books: result
      });

      next();
   }).catch(function(err) {
      /* failed to find the books in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 52\nCouldn\'t retreive the books from the database.\n' + String(err);

      next();
   });
};

/**
* This function stores the provided book in the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.store = function(req, res, next) {
   /* Validate and sanitizing title Input */
   req.checkBody('title', 'required').notEmpty();
   req.checkBody('title', 'validity').isString();
   req.sanitizeBody('title').escape();
   req.sanitizeBody('title').trim();

   /* Validate and sanitizing language_id Input */
   req.checkBody('language_id', 'required').notEmpty();
   req.sanitizeBody('language_id').escape();
   req.sanitizeBody('language_id').trim();
   req.checkBody('language_id', 'validity').isInt({ min: 1, max: languages.length });
   req.sanitizeBody('language_id').toInt();

   var errors = req.validationErrors();
   errors = format(errors);

   /* Validating the uploded book */
   var dirName;
   if(!req.file) {
      if(!errors) errors = [];

      errors.push({
         param: 'file',
         type: 'required'
      });
   }

   var unique = true;
   if(!errors) {
      dirName = './public/uploads/' + req.user.id + '/' + req.body.title;
      if(fs.existsSync(dirName)) {
         if(!errors) errors = [];

         errors.push({
            param: 'title',
            value: req.body.title,
            type: 'unique violation'
         });

         unique = false;
      }
      else {
         var zip = new AdmZip(req.file.path);
         zip.extractAllTo(dirName, /*overwrite*/ false);

         if(!(fs.existsSync(dirName + '/OCR_Output') && fs.existsSync(dirName + '/Images'))) {
            if(!errors) errors = [];

            errors.push({
               param: 'book',
               type: 'validity'
            });

         }
      }
   }

   /* removing the uploaded zip file */
   if(req.file){
      rimraf.sync(req.file.path);
   }

   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 134\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      if(unique){
         rimraf.sync(dirName);
      }

      return;
   }

   /* extracting the data from the body */
   var title = req.body.title;
   var language_id = req.body.language_id;

   /* reading the OCR_Output files */
   var ocrDir = dirName + '/OCR_Output/';
   var ocrFileNames = fs.readdirSync(ocrDir);
   ocrFileNames.sort(naturalCompare);
   var ocrPagesContent = readContents(ocrDir, ocrFileNames);

   /* reading the images */
   var imageDir = dirName + '/Images/';
   var imageFileNames = fs.readdirSync(imageDir);
   imageFileNames.sort(naturalCompare);

   /* reading the ground truth files */
   var gtDir = dirName + '/gt/', gtFileNames, gtPagesContent;
   var gtExists = fs.existsSync(gtDir);
   if(gtExists) {
      gtFileNames = fs.readdirSync(gtDir);
      gtFileNames.sort(naturalCompare);
      gtPagesContent = readContents(gtDir, gtFileNames);
   }

   var extraDir = dirName + '/extra/', extraFileNames, extraPagesContent;
   var extraExists = fs.existsSync(extraDir);
   if(extraExists) {
      extraFileNames = fs.readdirSync(extraDir);
      extraPagesContent = readContents(extraDir, extraFileNames);
   }

   /* creating the page instaces */
   var pages = [];

   for (var i = 0; i < ocrFileNames.length; i++) {
      var cur = {
         name: ocrFileNames[i],
         number: i,
         image: imageDir.substring(16) + imageFileNames[i],
         text_ocr: ocrPagesContent[i]
      };

      if(gtExists) {
         cur.text_gt = gtPagesContent[i];
      }

      pages.push(cur);
   }

   /* creating the extra corpus */
   var corpuses = [];

   if(extraExists) {
      for (var i = 0; i < extraFileNames.length; i++) {
         var cur = {
            data: extraPagesContent[i],
         };

         corpuses.push(cur);
      }
   }

   var obj = {
      title: title,
      pages_count: ocrFileNames.length,
      gt_exists: gtExists,
      extra_exists: extraExists,
      start_set: 0,
      end_set: Math.min(20, ocrFileNames.length - 1),
      user_id: req.user.id,
      language_id: language_id,
      Pages: pages,
      Corpuses: corpuses
   };

   Book.create(obj, { include: [ { model: Page, as:'Pages'}, { model: Corpus, as:'Corpuses'} ] }).then(function(book) {
      book = book.toJSON();

      book.language = languages[language_id - 1].name;

      delete book.user_id;
      delete book.language_id;
      delete book.Pages;
      delete book.Corpuses;

      res.status(200).json({
         status: 'succeeded',
         message: 'book created successfully',
         book: book
      });

      next();

      /* delete the unneeded directories */
      rimraf.sync(ocrDir);
      rimraf.sync(gtDir);
      rimraf.sync(extraDir);
   }).catch(function(err) {
      if (err.message === 'Validation error') {
         /* The book violated database constraints */
         var errors = [];
         for (var i = 0; i < err.errors.length; i++) {
            var curError = err.errors[i];

            if(curError.path === 'user_id') continue;

            errors.push({
               param: curError.path,
               value: curError.value,
               type: curError.type
            });
         }

         res.status(400).json({
            status:'failed',
            errors: errors
         });

         req.err = 'BookController.js, Line: 263\nThe book violated some database constraints.\n' + JSON.stringify(errors);
      }
      else {
         /* failed to save the book in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'BookController.js, Line: 272\nCouldn\'t save the book in the database.\n' + String(err);
      }

      next();

      rimraf.sync(dirName);
   });
};

/**
* This function gets a specific page of the book.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.getPage = function(req, res, next) {
   /*Validate and sanitizing ID Input*/
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','validity').isInt();
   req.sanitizeParams('id').toInt();

   /*Validate and sanitizing page_number Input*/
   req.checkParams   ('page_number','required').notEmpty();
   req.sanitizeParams('page_number').escape();
   req.sanitizeParams('page_number').trim();
   req.checkParams   ('page_number','validity').isInt();
   req.sanitizeParams('page_number').toInt();

   var errors = req.validationErrors();
   errors = format(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 311\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   /* extracting data */
   var id = req.params.id;
   var pageNumber = req.params.page_number;

   Book.findById(id, { where: { user_id: req.user.id }, include: [ { model: Page, as:'Pages', where: { number: pageNumber } } ] }).then(function(book) {
      if(!book || !book.Pages) {
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 329\nThe specified Book or page is not found in the database.\n';
      }
      else {
         res.status(200).json({
            status: 'succeeded',
            page: {
               text: (book.Pages[0].text_mc || book.Pages[0].text_ocr),
               image: 'http://' + process.env.DOMAIN + ':' + process.env.PORT + book.Pages[0].image
            }
         });
      }

      next();
   }).catch(function(err){
      /* failed to find the book or the page in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 349\nfailed to find the book or the page in the database.\n' + String(err);

      next();
   });
};

/**
* This function updates the text of a specific page of the book.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.updatePage = function(req, res, next) {
   /*Validate and sanitizing ID Input*/
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','validity').isInt();
   req.sanitizeParams('id').toInt();

   /*Validate and sanitizing page_number Input*/
   req.checkParams   ('page_number','required').notEmpty();
   req.sanitizeParams('page_number').escape();
   req.sanitizeParams('page_number').trim();
   req.checkParams   ('page_number','validity').isInt();
   req.sanitizeParams('page_number').toInt();

   /* validating the text input */
   req.checkBody('text', 'required').notEmpty();
   req.checkBody('text', 'validity').isString();

   var errors = req.validationErrors();
   errors = format(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 389\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   /* extracting data */
   var id = req.params.id;
   var pageNumber = req.params.page_number;
   var text = req.body.text;

   Book.findById(id, { where: { user_id: req.user.id }, include: [ { model: Page, as:'Pages', where: { number: pageNumber } } ] }).then(function(book) {
      if(!book || !book.Pages) {
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 408\nThe specified Book or page is not found in the database.\n';

         next();
      }
      else {
         book.Pages[0].text_mc = text; // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< TODO

         book.Pages[0].save().then(function() {
            res.status(200).json({
               status: 'succeeded',
               message: 'Page updated successfully',
            });

            next();
         }).catch(function(err){
            /* failed to update the page in the database */
            res.status(500).json({
               status:'failed',
               message: 'Internal server error'
            });

            req.err = 'BookController.js, Line: 429\nfailed to update the page in the database.\n' + String(err);

            next();
         });
      }
   }).catch(function(err){
      /* failed to find the book or the page in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 441\nfailed to find the book or the page in the database.\n' + String(err);

      next();
   });
};

/**
* This function trains the the language model adding using the new given corpus.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.train = function(req, res, next) {
   /*Validate and sanitizing ID Input*/
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','validity').isInt();
   req.sanitizeParams('id').toInt();

   /* validating and senatizing use_gt input */
   req.checkBody     ('use_gt', 'required').notEmpty();
   req.sanitizeBody  ('use_gt').escape();
   req.sanitizeBody  ('use_gt').trim();
   req.checkBody     ('use_gt', 'validity').isBoolean();
   req.sanitizeBody  ('use_gt').toBoolean();

   /* validating and senatizing use_extra input */
   req.checkBody     ('use_extra', 'required').notEmpty();
   req.sanitizeBody  ('use_extra').escape();
   req.sanitizeBody  ('use_extra').trim();
   req.checkBody     ('use_extra', 'validity').isBoolean();
   req.sanitizeBody  ('use_extra').toBoolean();

   /*Validate and sanitizing start_set Input*/
   req.checkBody   ('start_set','required').notEmpty();
   req.sanitizeBody('start_set').escape();
   req.sanitizeBody('start_set').trim();
   req.checkBody   ('start_set','validity').isInt();
   req.sanitizeBody('start_set').toInt();

   /*Validate and sanitizing end_set Input*/
   req.checkBody   ('end_set','required').notEmpty();
   req.sanitizeBody('end_set').escape();
   req.sanitizeBody('end_set').trim();
   req.checkBody   ('end_set','validity').isInt();
   req.sanitizeBody('end_set').toInt();

   var errors = req.validationErrors();
   errors = format(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 498\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   /* extracting data */
   var id = req.params.id;
   var use_gt = req.body.use_gt;
   var use_extra = req.body.use_extra;
   var start_set = req.body.start_set;
   var end_set = req.body.end_set;

   Book.find({ where: { id: id, user_id: req.user.id }, include: [ { model: Page, as:'Pages', where: { number: { $gte: start_set, $lte: end_set } } }, { model: Corpus, as:'Corpuses' } ] }).then(function(book) {
      if(!book) {
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 519\nThe specified Book was not found in the database.\n';

         next();
      }
      else {
         var defaultTrie = 'config/data/Models/' + languages[book.language_id - 1].name.toLowerCase() + '/lm.json';
         var userTrie = 'config/data/Models/' + languages[book.language_id - 1].name.toLowerCase() + '/' + req.user.id + '/' + book.id + '/';

         var trie;
         if(fs.existsSync(defaultTrie)){
            trie = new Trie(require('../../' + defaultTrie));
         }
         else{
            trie = new Trie();
         }

         if(use_extra) {
            for (var i = 0; i < book.Corpuses.length; i++) {
               trie.addText(book.Corpuses[i].data);
            }
         }

         for (var i = 0; i < book.Pages.length; i++) {
            if(use_gt) {
               trie.addText(book.Pages[i].text_gt);
            }
            else if(book.Pages[i].text_mc) {
               trie.addText(book.Pages[i].text_mc);
            }
            else {
               trie.addText(book.Pages[i].text_ocr);
            }
         }

         if(!fs.existsSync(userTrie)){
            require('mkdirp').sync(userTrie);
         }

         fs.writeFileSync(userTrie + 'lm.json', JSON.stringify(trie), {
            encoding: 'utf8'
         });
         book.start_set = start_set;
         book.end_set = end_set;

         book.save().then(function() {
            res.status(200).json({
               status: 'succeeded',
               message: 'book trained successfully'
            });

            next();
         }).catch(function(err){
            /* failed to save the book in the database */
            res.status(500).json({
               status:'failed',
               message: 'Internal server error'
            });

            req.err = 'BookController.js, Line: 577\nfailed to save the book in the database.\n' + String(err);

            next();
         });
      }
   }).catch(function(err){
      /* failed to find the book in the database or failed to build the dictionory */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 589\nfailed to find the book in the database or failed to build the dictionory.\n' + String(err);

      next();
   });
};

/**
* This function gives suggestions on how to correct a wrd ot text.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.correct = function(req, res, next) {
   /* Validate and sanitizing ID Input */
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','validity').isInt();
   req.sanitizeParams('id').toInt();

   /* Validate and sanitizing action input */
   req.checkBody('action', 'required').notEmpty();
   req.sanitizeBody('action').escape();
   req.checkBody('action', 'invalid').isIn(['get_incorrect_words', 'get_suggestions']);

   var errors = req.validationErrors();

   if(!errors) {
      if(req.body.action == 'get_incorrect_words') {
         /* Validate and sanitizing text Input */
         req.checkBody('text[]', 'required').notEmpty();
         req.checkBody('text[]', 'validity').isString();
         req.sanitizeBody('text[]').escape();
         req.sanitizeBody('text[]').trim();
      }
      else {
         /* Validate and sanitizing word Input */
         req.checkBody('word', 'required').notEmpty();
         req.checkBody('word', 'validity').isString();
         req.sanitizeBody('word').escape();
         req.sanitizeBody('word').trim();
      }
   }

   errors = req.validationErrors();
   errors = format(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 642\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   var id = req.params.id;

   Book.find({ where: { id: id, user_id: req.user.id } }).then(function(book) {
      if(!book) {
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 658\nThe specified Book was not found in the database.\n';

         next();

         return;
      }

      var defaultModel = 'config/data/Models/' + languages[book.language_id - 1].name.toLowerCase() + '/lm.pt';
      var userModel = 'config/data/Models/' + languages[book.language_id - 1].name.toLowerCase() + '/' + req.user.id + '/' + book.id + '/lm.pt';

      var lm;
      if(fs.existsSync(userModel)){
         lm = new LanguageModel(userModel, languages[book.language_id - 1].tokenizer);
      }
      else if(fs.existsSync(defaultModel)){
         lm = new LanguageModel(defaultModel, languages[book.language_id - 1].tokenizer);
      }

      var action = req.body.action;
      var srcDir = './public/uploads/' + req.user.id + '/' + book.title + '/test/';
      rimraf.sync(srcDir);
      fs.mkdirSync(srcDir);

      if (action == 'get_incorrect_words') {
         var text = req.body['text[]'];
         var srcFile = srcDir + 'page.src';

         fs.writeFileSync(srcFile, text, {
            encoding: 'utf8'
         });

         lm.correct(srcFile,/*normalization*/ true, function(err, predFile) {
            if(err) {
               /* failed to run OpenNMT-py */
               res.status(500).json({
                  status:'failed',
                  message: 'Internal server error'
               });

               req.err = 'BookController.js, Line: 697\nFailed to run OpenNMT-py.\n' + String(err);
            }
            else {
               var wrong = [];
               var correct = {};

               var src_lines = text.split(/\n/);
               var pred_lines = fs.readFileSync(predFile).toString().split(/\n/);

               for(var i = 0; i < pred_lines.length - 1; ++i) {
                  var src_tokens = src_lines[i].split(/\s+/);
                  var trg_tokens = align(pred_lines[i], src_lines[i]);

                  for(var j = 0; j < src_tokens.length; ++j) {
                     if(getEditDistance(src_tokens[j], trg_tokens[j]) > 0) {
                        wrong.push(src_tokens[j]);
                        correct[src_tokens[j]] = trg_tokens[j];
                     }
                  }
               }

               res.status(200).json({
                  correct: [correct],
                  incorrect: [wrong]
               });
            }

            next();
         });
      }
      else if (action == 'get_suggestions') {
         var word = req.body.word;
         var edit = Math.min(Math.floor((word.length / 5)), 4);
         edit = Math.max(1, edit);
         var result = lm.suggestions(word, edit);

         var sortable = [];
         for (var w in result) {
            sortable.push([w, result[w]]);
         }

         sortable.sort(function(a, b) {
            return b[1] - a[1];
         });

         var finalResult = [];
         for(var j = 0; j < 5 && j < sortable.length; j++) {
            finalResult.push(sortable[j][0]);
         }

         res.status(200).json(finalResult);

         next();
      }
   }).catch(function(err){
      /* failed to find the book in the database or failed to spell check */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 778\nfailed to find the book in the database.\n' + String(err);

      next();
   });
};

/**
* This function gives evaluates on how to correct a wrd ot text.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.evaluate = function(req, res, next) {
   /* Validate and sanitizing ID Input */
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','validity').isInt();
   req.sanitizeParams('id').toInt();

   var errors = req.validationErrors();
   errors = format(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 807\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   var id = req.params.id;

   Book.find({ where: { id: id, user_id: req.user.id, gt_exists: true } }).then(function(book) {
      if(!book) {
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 823\nThe specified Book was not found in the database.\n';

         next();

         return;
      }

      book.getPages({ where: { number: { $or: { $gt: book.end_set, $lt: book.start_set } } } }).then(function (pages) {
         var defaultTrie = 'config/data/Models/' + languages[book.language_id - 1].name.toLowerCase() + '/lm.json';
         var userTrie = 'config/data/Models/' + languages[book.language_id - 1].name.toLowerCase() + '/' + req.user.id + '/' + book.id + '/lm.json';

         var trie;
         if(fs.existsSync(userTrie)){
            trie = new Trie(require('../../' + userTrie));
         }
         else if(fs.existsSync(defaultTrie)){
            trie = new Trie(require('../../' + defaultTrie));
         }
         else {
            trie = new Trie();
         }

         var Regex = require('../Regex');
         var totalWords = 0, totalCharacters = 0, werBefore = 0, editDistanceBefore = 0, werAfter = 0,
         editDistanceAfter = 0;

         for (var i = 0; i < pages.length; i++) {

            werBefore += getWER(pages[i].text_gt, pages[i].text_ocr);
            editDistanceBefore += getEditDistance(pages[i].text_gt, pages[i].text_ocr);

            /* page correction */
            var lines = pages[i].text_ocr.split(/\n+/);
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

            werAfter += getWER(pages[i].text_gt, text_cor);
            editDistanceAfter += getEditDistance(pages[i].text_gt, text_cor);
         }

         console.log(werBefore, werAfter, editDistanceBefore, editDistanceAfter, pages.length, totalWords, totalCharacters);
         if(pages.length !== 0) {
            werBefore = (1.0*werBefore) / totalWords;
            werAfter = (1.0*werAfter) / totalWords;
            editDistanceBefore = (1.0*editDistanceBefore) / totalCharacters;
            editDistanceAfter = (1.0*editDistanceAfter) / totalCharacters;
         }
         console.log(werBefore, werAfter, editDistanceBefore, editDistanceAfter, pages.length, totalWords, totalCharacters);

         res.status(200).json({
            status: 'succeeded',
            evaluation: {
               werBefore: werBefore,
               werAfter: werAfter,
               editDistanceBefore: editDistanceBefore,
               editDistanceAfter: editDistanceAfter
            }
         });

         next();
      }).catch(function(err){
         /* failed to find the pages in the database or failed to spell check */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'BookController.js, Line: 957\nfailed to find the pages in the database or failed to spell check.\n' + String(err);

         next();
      });
   }).catch(function(err){
      /* failed to find the book in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 968\nfailed to find the book in the database.\n' + String(err);

      next();
   });
};

function readContents(dir, files){
   var pages = [];
   _.each(files, function(file) {
      var page = readPageFromDisk(dir + file);
      pages.push(page);
   });

   return pages;
}

function readPageFromDisk(path){
   var page = fs.readFileSync(path, {
      encoding: 'utf8'
   }).toString();
   return page;
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

function getEditDistance(a, b) {
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
         } else {
            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
         }
      }
   }
   return matrix[m][n];
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
            dp[i][j] = Math.min(/* substitution */ dp[i - 1][j - 1] + 1, /* insertion */ Math.min(dp[i][j - 1] + 1, /* deletion */ dp[i - 1][j] + 1));
         }
      }
   }

   // for (var i = 0; i <= n; i++) {
   //    var line = "";
   //    for (var j = 0; j <= m; j++) {
   //       line += dp[i][j] + " ";
   //    }
   //    console.log(line);
   // }

   var i = n;
   var j = m;
   var last = n;
   var arr = [];
   var str = '';
   while(i != 0 && j != 0) {
      if(src.charAt(i - 1) == trg.charAt(j - 1)) {
         if(src.charAt(i - 1) == ' ') {
            arr.push(src.substring(i, last));
            last = i - 1;
         }
         i--;
         j--;
      }
      else {
         if(dp[i][j] == dp[i - 1][j - 1] + 1) {
            /* substitution */
            if(trg.charAt(j - 1) == ' ') {
               arr.push(src.substring(i, last));
               last = i - 1;
            }
            i--;
            j--;
         }
         else if(dp[i][j] == dp[i][j - 1] + 1) {
            /* insertion */
            if(trg.charAt(j - 1) == ' ') {
               arr.push(src.substring(i, last));
               last = i;
            }
            j--;
         }
         else if(dp[i][j] == dp[i - 1][j] + 1) {
            /* deletion */
            i--;
         }
      }
   }

   arr.push(src.substring(0, last));
   return arr.reverse();
};
