/**
* @module Book Controller
* @description The controller that is responsible of handling book's requests
*/

var AdmZip = require('adm-zip');
var fs     = require('fs');
var rimraf = require('rimraf');
var _      = require('underscore');
var User   = require('../models/User').User;
var Book   = require('../models/Book').Book;
var Page   = require('../models/Page').Page;
var format = require('../scripts').errorFormat;

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

         delete cur.user_id;

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

   /* Validate and sanitizing language Input */
   req.checkBody('language', 'required').notEmpty();
   req.checkBody('language', 'validity').isIn(['English', 'Latin', 'French']);
   req.sanitizeBody('language').escape();
   req.sanitizeBody('language').trim();

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
         zip.extractAllTo(dirName, /*overwrite*/ true);

         if(!(fs.existsSync(dirName + '/OCR_Output') && fs.existsSync(dirName + '/Images'))) {
            if(!errors) errors = [];

            errors.push({
               param: 'book',
               type: 'validity'
            });

            rimraf.sync(dirName);
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

   var lmDir = dirName + '/lm/', lmFileNames, lmPagesContent;
   var lmExists = fs.existsSync(lmDir);
   // if(lmExists) { // TODO: get it to work
   //    lmFileNames = fs.readdirSync(lmDir);
   //    lmFileNames.sort(naturalCompare);
   //    lmPagesContent = readContents(lmDir, lmFileNames);
   // }

   /* creating the page instaces */
   var pages = [];

   for (var i = 0; i < ocrFileNames.length; i++) {
      cur = {
         language: language,
         name: ocrFileNames[i],
         number: i,
         image: imageDir + imageFileNames[i],
         text_ocr: ocrPagesContent[i]
      };

      if(gtExists) {
         cur.text_gt = gtPagesContent[i];
      }

      pages.push(cur);
   }

   var obj = {
      language: language,
      title: title,
      pages_count: ocrFileNames.length,
      gt_exists: gtExists,
      lm_exists: lmExists,
      start_set: 0,
      end_set: Math.min(20, ocrFileNames.length - 1),
      user_id: req.user.id,
      Pages: pages
   };

   Book.create(obj, { include: [ { model: Page, as:'Pages'} ] }).then(function(book) {
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
      rimraf.sync(ocrDir);
      rimraf.sync(gtDir);
      rimraf.sync(lmDir);
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
   });
};

/**
* This function updates a book's information in the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.upload = function(req, res, next) {
   var id  =  req.file.id ;
   var newExt ;
   var newURL ;
   if(req.file){
      newExt = path.extname(req.file.filename);
      newURL = path.resolve('/'+id,req.file.filename);
   }else{
      var defaultURL ;
      if(req.file.gender == 'Male'){
         defaultURL = '/general/male.jpg';
      }else
      {
         defaultURL = '/general/female.jpg';
      }
      newExt = '.jpg';
      newURL = path.resolve(defaultURL);
   }

   Media.findOne({where :{book_id :id,type:'Image'}}).then(function(profilePicture){

      if(profilePicture){
         var oldExt = path.extname(profilePicture.url);

         if(oldExt != newExt || (!req.file && (defaultURL != profilePicture.url))){
            var deletePath = path.resolve( './public/images'+profilePicture.url);
            fse.remove(deletePath,function(err){
            });
         }
      }

      Media.upsert({ url:newURL, book_id :id, type:'Image' },
      {where :{book_id :id,type:'Image'}}).then(function(Upicture){
         res.status(200).json({
            status: 'succeeded',
            message: 'book successfully updated'
         });
         next();
      }).catch(function(err){
         /* failed to update the book in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'BookController.js, Line: 535\nCouldn\'t update the book in the database.\n' + String(err);

         next();
      });
   });
};

/**
* This function updates a book's information in the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.update = function(req, res, next) {
   // /*Validate Old Password Input*/
   req.checkBody('old_password', 'required').notEmpty();

   var obj = {};
   /*Validate New Password Input*/
   if (req.body.new_password) {
      req.assert('new_password', 'validity').len(6, 20);
      obj.password = req.body.new_password;
   }

   /*Sanitizing IEEE membership ID Input*/
   if (req.body.IEEE_membership_ID) {
      req.checkBody('IEEE_membership_ID', 'validity').isString();
      req.sanitizeBody('IEEE_membership_ID').escape();
      req.sanitizeBody('IEEE_membership_ID').trim();
      obj.IEEE_membership_ID = req.body.IEEE_membership_ID;
   }

   /*Sanitizing Phone Number Input*/
   if (req.body.phone_number) {
      req.sanitizeBody('phone_number').escape();
      req.sanitizeBody('phone_number').trim();
      req.checkBody('phone_number', 'validity').isPhoneNumber();
      obj.phone_number = req.body.phone_number;
   }


   var errors = req.validationErrors();
   errors = format(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'BookController.js, Line: 585\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      return;
   }

   if (!req.file.validPassword(req.body.old_password)) {
      res.status(403).json({
         status: 'failed',
         message: 'The provided credentials are not correct'
      });

      req.err = 'BookController.js, Line: 598\nThe old password doesn\'t match the password in the database.';

      next();

      return;
   }



   var id  =  req.file.id ;


   Book.update(obj, { where : { id : req.file.id } }).then(function(affected) {
      if (affected[0] == 1) {
         res.status(200).json({
            status: 'succeeded',
            message: 'book successfully updated'
         });
      }
      else {
         res.status(404).json({
            status:'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'BookController.js, Line: 623\nThe requested book was not found in the database.\n';
      }

      next();
   }).catch(function(err) {
      /* failed to update the book in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 634\nCouldn\'t update the book in the database.\n' + String(err);

      next();
   });

};

/**
* This function deletes a book from the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.delete = function(req, res, next) {
   /*Validate and sanitizing ID Input*/
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','validity').isInt();

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

   var id = req.params.id ;
   Book.findById(id).then(function(book){
      if(!book ){
         res.status(404).json({
            status: 'failed',
            message: 'The request route was not Found'
         });

         req.err = 'BookController.js, Line: 678\nThe specified Book is not found in the database.\n';

         next();
      }else{
         if(book.type != 'Admin' && (book.type != 'Upper Board' || req.file.type =='Admin')){
            book.destroy().then(function(){
               var deletePath = path.resolve( './public/images/'+id);
               fse.remove(deletePath,function(err){
                  delete req.file ;
                  delete req.identity;
                  res.status(200).json({
                     status:  'succeeded',
                     message: 'The Book has been deleted.'
                  });
                  next();
               });

            }).catch(function(err){
               /* failed to delete the book from the database */
               res.status(500).json({
                  status:'failed',
                  message: 'Internal server error'
               });

               req.err = 'BookController.js, Line: 702\nCan not delete the Book from the database.\n' + String(err);

               next();
            });

         }else{
            res.status(403).json({
               status:'failed',
               message: 'Access Denied'
            });

            req.err = 'BookController.js, Line: 713\ncan not delete an admin or (upper board if req.file is upperboard)\n';

            next();
         }

      }
   }).catch(function(err){
      /* failed to find the book in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'BookController.js, Line: 726\nCan not find the Book in the database.\n' + String(err);

      next();
   });


};


/**
* This function updates the specific book's information in the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.updateAuth = function(req, res, next) {
   var obj ={};
   /*Validate and sanitizing email Input*/
   if(req.body.email){
      req.checkBody('email', 'validity').isEmail();
      req.sanitizeBody('email').escape();
      req.sanitizeBody('email').trim();
      req.sanitizeBody('email').normalizeEmail({ lowercase: true });
      obj.email = req.body.email ;
   }

   /*Validate and sanitizing type Input*/
   if(req.body.type){
      req.checkBody('type', 'required').notEmpty();
      req.checkBody('type', 'validity').isIn(['Upper Board', 'High Board', 'Member']);
      req.sanitizeBody('type').escape();
      req.sanitizeBody('type').trim();
      obj.type = req.body.type ;
   }

   var rest = function() {
      var errors = req.validationErrors();
      errors = format(errors);
      if (errors) {
         /* input validation failed */
         res.status(400).json({
            status: 'failed',
            errors: errors
         });

         req.err = 'BookController.js, Line: 771\nSome validation errors occurred.\n' + JSON.stringify(errors);

         next();

         return;
      }

      var id = req.params.id ;
      Book.findById(id).then(function(book){
         if(!book ){
            res.status(404).json({
               status: 'failed',
               message: 'The requested route was not found.'
            });

            req.err = 'BookController.js, Line: 786\nThe specified Book is not found in the database.\n';

            next();
         }else{

            if(book.type != 'Admin' && (book.type != 'Upper Board' || req.file.type =='Admin')){
               book.update(obj).then(function(){
                  res.status(200).json({
                     status: 'succeeded',
                     message: 'book successfully updated'
                  });
                  next();
               }).catch(function(err){
                  /* failed to update the book  */
                  res.status(500).json({
                     status:'failed',
                     message: 'Internal server error'
                  });

                  req.err = 'BookController.js, Line: 805\nCan not find the Book in the database.\n' + String(err);

                  next();
               });

            }else{
               /* can't update an admin or (upper board if req.file is upperboard) */
               res.status(403).json({
                  status:'failed',
                  message: 'Access Denied'
               });

               req.err = 'BookController.js, Line: 817\ncan not update an admin or (upper board if req.file is upperboard) \n';

               next();
               return ;
            }

         }
      }).catch(function(err){
         /* failed to find the book in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'BookController.js, Line: 831\nCan not find the Book in the database.\n' + String(err);

         next();
      });
   };

   /*Validate and sanitizing ID Input*/
   if(req.body.committee_id){
      req.sanitizeBody('committee_id').escape();
      req.sanitizeBody('committee_id').trim();
      req.checkBody('committee_id', 'validity').isInt();
      Committee.findById(req.body.committee_id).then(function(committee) {
         req.checkBody('committee_id', 'validity').equals((committee)? String(committee.id) : null);
         obj.committee_id = req.body.committee_id ;
         rest();
      }).catch(function(err){
         /* failed to find the committee in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'BookController.js, Line: 853\nfailed to find the committee in the database.\n' + String(err);

         next();
      });
   }
   else{
      rest();
   }
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
    a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
    b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
    while(ax.length && bx.length) {
        var an = ax.shift();
        var bn = bx.shift();
        var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if(nn) return nn;
    }
    return ax.length - bx.length;
}
