/**
* This function configures the book routes of the application.
* @param  {express} app An instance of the express app to be configured.
*/
module.exports = function(app) {
   var BookController = require('../../controllers/BookController');
   var visitor        = require('../../middlewares/VisitorMiddleware');
   var auth           = require('../../middlewares/AuthMiddleware');
   var upload         = require('multer')({
      dest: 'public/uploads/' // The distenation of the uploaded files in the local system
   });

   /**
   * A GET route responsible for indexing the books of the user
   * @var /api/book GET
   * @name /api/book GET
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route returns as a response an object in the following format
   * {
   * 	status: succeeded/failed (String),
   * 	message: String showing a descriptive text (String),
   * 	books:
   * 	[
   * 	  {
   * 	     id: the book's id (Integer),
   * 	     language: the book's language (String),
   * 	     title: the book's title (String),
   * 	     pages_count: The book's number of pages (Integer),
   * 	     gt_exists: The state  of existance of the ground truth (Boolean),
   * 	     extra_exists: The state  of existance of the lanuage model (Boolean),
   * 	     start_set The number of the start page of the training set (Integer),
   * 	     end_set The number of the end page of the training set (Integer),
   * 	     created_at: The date of the book's creation (DateTime),
   * 	     updated_at: the data of the book's last update (DateTime)
   * 	  }, {...}, ...
   * 	]
   * }
   */
   app.get('/api/book', auth, BookController.index);

   /**
   * A POST route responsible for storing a given book in the database (registiration).
   * @var /api/book POST
   * @name /api/book POST
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route expects a body Object in the following format
   * {
   *    title: String,   [required]
   *    laguage_id: Integer, [required]
   *    file: (.zip) file with the following structure of folders nad file formats with correspondent names: [required]
   *        (
   *           .├── gt          [optional]
   *            │   ├── 10.g    (all the ground truth file)
   *           .├── extra       [optional]
   *            │   ├── 1.e    (extra corpus files for the Book)
   *            ├── Images      [required]
   *            │   ├── 10.png  (all the pages images file)
   *            └── OCR_Output  [required]
   *                ├── 10.p    (all the ocr_output pages of the book)
   *        )
   * }
   * @example The route returns as a response an object in the following format
   * {
   *  status: succeeded/failed (String),
   *  message: String showing a descriptive text (String),
   * 	book:
   * 	{
   * 	     id: the book's id (Integer),
   * 	     language: the book's language (String),
   * 	     title: the book's title (String),
   * 	     pages_count: The book's number of pages (Integer),
   * 	     gt_exists: The state  of existance of the ground truth (Boolean),
   * 	     extra_exists: The state  of existance of the lanuage model (Boolean),
   * 	     start_set The number of the start page of the training set (Integer),
   * 	     end_set The number of the end page of the training set (Integer),
   * 	     created_at: The date of the book's creation (DateTime),
   * 	     updated_at: the data of the book's last update (DateTime)
   * 	},
   *  error:
   *  [
   *    {
   *       param: the field that caused the error (String),
   *       value: the value that was provided for that field (String),
   *       type: the type of error that was caused ['required', 'invalid', 'unique violation'] (String)
   *    }, {...}, ...
   *  ]
   * }
   */
   app.post('/api/book', auth, upload.single('file'), BookController.store);

   /**
   * A GET route to get a specific page of a book
   * @var /api/book/{id}/page/{page_number} GET
   * @name /api/book/{id}/page/{page_number} GET
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route respond with a json Object having the following format
   * {
   *     status: succeeded/failed (String),
   *     message: String showing a descriptive text (String),
   *     page:
   *     {
   *        text: the page text (String),
   *        image: the url of the page image (String)
   *     }
   *     error:
   *     [
   *        {
   *           param: the field that caused the error (String),
   *           value: the value that was provided for that field (String),
   *           type: the type of error that was caused ['required', 'invalid'] (String)
   *        }, {...}, ...
   *     ]
   * }
   */
   app.get('/api/book/:id/page/:page_number', auth, BookController.getPage);

   /**
   * A PUT route to update a specific page of a book
   * @var /api/book/{id}/page/{page_number} PUT
   * @name /api/book/{id}/page/{page_number} PUT
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route expects a body Object in the following format
   * {
   *     text: String [required]
   * }
   * @example The route respond with a json Object having the following format
   * {
   *     status: succeeded/failed (String),
   *     message: String showing a descriptive text (String)
   *     error:
   *     [
   *        {
   *           param: the field that caused the error (String),
   *           value: the value that was provided for that field (String),
   *           type: the type of error that was caused ['required', 'invalid'] (String)
   *        }, {...}, ...
   *     ]
   * }
   */
   app.put('/api/book/:id/page/:page_number', auth, BookController.updatePage);

   /**
   * A POST route to update a specific page of a book
   * @var /api/book/{id}/train POST
   * @name /api/book/{id}/train POST
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route expects a body Object in the following format
   * {
   *     use_gt: Boolean, [required]
   *     use_extra: Boolean, [required]
   *     start_set: Integer, [required]
   *     end_set: Integer [required]
   * }
   * @example The route respond with a json Object having the following format
   * {
   *     status: succeeded/failed (String),
   *     message: String showing a descriptive text (String)
   *     error:
   *     [
   *        {
   *           param: the field that caused the error (String),
   *           value: the value that was provided for that field (String),
   *           type: the type of error that was caused ['required', 'invalid'] (String)
   *        }, {...}, ...
   *     ]
   * }
   */
   app.post('/api/book/:id/train', auth, BookController.train);

   /**
   * A GET route to get the training status of a book
   * @var /api/book/{id}/status GET
   * @name /api/book/{id}/status GET
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route respond with a json Object having the following format
   * {
   *     status: succeeded/failed (String),
   *     isTrained: the training status (Boolean)
   *     error:
   *     [
   *        {
   *           param: the field that caused the error (String),
   *           value: the value that was provided for that field (String),
   *           type: the type of error that was caused ['required', 'invalid'] (String)
   *        }, {...}, ...
   *     ]
   * }
   */
   // app.get('/api/book/:id/status', auth, BookController.status);

   /**
   * A GET route to evaluate the training efficincy of a book.
   * @var /api/book/{id}/evaluate GET
   * @name /api/book/{id}/evaluate GET
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route respond with a json Object having the following format
   * {
   *     status: succeeded/failed (String),
   *     stats:
   *     {
   *        werBefore: word error rate before training (Integer),
   *        werAfter: word error rate after training (Integer),
   *        editDistanceBefore: edit distance between the ocr_output and the ground truth before training (Integer),
   *        editDistanceAfter: edit distance between the ocr_output and the ground truth after training (Integer),
   *        ocrErrorBefore: character error rate before training (Integer),
   *        ocrErrorAfter: character error rate after training (Integer)
   *     }
   *     error:
   *     [
   *        {
   *           param: the field that caused the error (String),
   *           value: the value that was provided for that field (String),
   *           type: the type of error that was caused ['required', 'invalid'] (String)
   *        }, {...}, ...
   *     ]
   * }
   */
   // app.get('/api/book/:id/evaluate', auth, BookController.evaluate);

   /**
   * A POST route to get the suggestions to correct a given text based on the taining
   * @var /api/book/{id}/correct POST
   * @name /api/book/{id}/correct POST
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route expects a body Object in the following format
   * {
   *     action: String ['get_incorrect_words', 'get_suggestions'], [required]
   *     text: String, [required if the action is 'get_incorrect_words']
   *     word: String, [required if the action is 'get_suggestions']
   * }
   * @example The route respond with a json Object having the following format TODO
   * {
   *     status: succeeded/failed (String),
   *     message: String showing a descriptive text (String)
   *     error:
   *     [
   *        {
   *           param: the field that caused the error (String),
   *           value: the value that was provided for that field (String),
   *           type: the type of error that was caused ['required', 'invalid'] (String)
   *        }, {...}, ...
   *     ]
   * }
   */
   app.post('/api/book/:id/correct', auth, BookController.correct);
};
