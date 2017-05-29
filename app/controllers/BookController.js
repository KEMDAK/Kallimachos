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
var Trie      = require('../Trie');
var languages = require('../../config/data/Languages.json');

/**
* This function gets a list of all books owned by the logged in user currently in the database.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.index = function(req, res, next) {
   req.user.getBooks({ where: { id: user.req.id } }).then(function(books) {
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

      req.err = 'BookController.js, Line: 109\nCouldn\'t retreive the books from the database.\n' + String(err);

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

   if(!errors) {
      dirName = './public/uploads/' + req.user.id + '/' + req.body.title;
      if(fs.existsSync(dirName)) {
         if(!errors) errors = [];

         errors.push({
            param: 'title',
            value: req.body.title,
            type: 'unique violation'
         });
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

      req.err = 'BookController.js, Line: 332\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      rimraf(dirName);

      return;
   }

   /* extracting the data from the body */
   var title = req.body.title;
   var language = req.body.language;

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
      language_id: language,
      Pages: pages,
      Corpuses: corpuses
   };

   Book.create(obj, { include: [ { model: Page, as:'Pages'}, { model: Corpus, as:'Corpuses'} ] }).then(function(book) {
      book = book.toJSON();
      delete book.user_id;
      delete book.Pages;

      res.status(200).json({
         status: 'succeeded',
         message: 'book created successfully',
         book: book
      });

      next();

      /* delete the unneeded directories */
      rimraf(ocrDir);
      rimraf(gtDir);
      rimraf(extraDir);
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
            error: errors
         });

         req.err = 'BookController.js, Line: 468\nThe book violated some database constraints.\n' + JSON.stringify(errors);
      }
      else {
         /* failed to save the book in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'BookController.js, Line: 477\nCouldn\'t save the book in the database.\n' + String(err);
      }

      next();

      rimraf(dirName);
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

      req.err = 'BookController.js, Line: 663\nSome validation errors occurred.\n' + JSON.stringify(errors);

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

         req.err = 'BookController.js, Line: 678\nThe specified Book or page is not found in the database.\n';
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

      req.err = 'BookController.js, Line: 726\nfailed to find the book or the page in the database.\n' + String(err);

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

      req.err = 'BookController.js, Line: 663\nSome validation errors occurred.\n' + JSON.stringify(errors);

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

         req.err = 'BookController.js, Line: 678\nThe specified Book or page is not found in the database.\n';

         next();
      }
      else {
         book.Pages[0].text_mc = text;

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

            req.err = 'BookController.js, Line: 726\nfailed to update the page in the database.\n' + String(err);

            next();
         });
      }
   }).catch(function(err){
      /* failed to find the book or the page in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 726\nfailed to find the book or the page in the database.\n' + String(err);

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

      req.err = 'BookController.js, Line: 663\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   /* extracting data */
   var id = req.params.id;
   var use_gt = req.params.use_gt;
   var use_extra = req.params.use_extra;
   var start_set = req.params.start_set;
   var end_set = req.params.end_set;

   Book.findById(id, { where: { user_id: req.user.id }, include: [ { model: Page, as:'Pages', where: { number: { $gte: start_set, $lte: end_set } } }, { model: Corpus, as:'Corpuses' } ] }).then(function(book) {
      if(!book) {
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 678\nThe specified Book was not found in the database.\n';

         next();
      }
      else {
         var defaultTrie = '../../config/data/Models/' + languages[book.language_id - 1].name + '/lm.json';
         var userTrie = '../../config/data/Models/' + languages[book.language_id - 1].name + '/' + req.user.id + '/' + book.id + '/lm.json';

         var trie = new Trie(require(defaultTrie));
         if(use_extra) {
            for (var i = 0; i < book.Corpuses.length; i++) {
               trie.addText(book.Corpuses[i].data);
            }
         }

         for (var i = 0; i < book.Pages.length; i++) {
            if(use_gt) {
               trie.addText(book.Pages[i].text_gt);
            }
            if(book.Pages[i].text_mc) {
               trie.addText(book.Pages[i].text_mc);
            }
            else {
               trie.addText(book.Pages[i].text_ocr);
            }
         }

         fs.writeFileSync(userTrie, JSON.stringify(trie), {
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

            req.err = 'BookController.js, Line: 726\nfailed to save the book in the database.\n' + String(err);

            next();
         });
      }
   }).catch(function(err){
      /* failed to find the book in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 726\nfailed to find the book or the page in the database.\n' + String(err);

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
