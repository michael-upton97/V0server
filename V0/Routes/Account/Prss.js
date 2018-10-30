var Express = require('express');
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');

var router = Express.Router({caseSensitive: true});

router.baseURL = '/Prss';


/* Much nicer versions
*/
router.get('/', function(req, res) {
   var email = req.session.isAdmin() && req.query.email ||
   !req.session.isAdmin() && req.session.email;

   var handler = function(err, prsArr) {
      res.json(prsArr);
      req.cnn.release();
   };

   if (email)
      req.cnn.chkQry('select id, email from Person where email = ?', [email],
       handler);
   else
      req.cnn.chkQry('select id, email from Person', handler);
});



//jshint ignore:start
router.put('/:id', function(req, res) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;
   var id = req.params.id;
   var admin= req.session.isAdmin();

   async.waterfall([
      function(cb) {
         if (vld.checkPrsOK(id, cb) && vld.hasOnlyFields(body, ["firstName", "lastName", "oldPassword", "password", "role"], cb)
         && vld.chain(!("password" in body) || body.password, Tags.badValue, ['password']).chain(!("role" in body) || admin && body.role === 1, Tags.badValue, ['role']
         ).check(!("password" in body) || admin || ("oldPassword" in body), Tags.noOldPwd, null, cb))
         {
            console.log("\nstep 1\n");
            cnn.chkQry('select password from Person where id = ?', id, cb);
         }
      },
      function(result, fields, cb) {
         if(vld.check(result.length, Tags.notFound, null, cb) && 
         (admin || !("password" in body) || vld.check(result[0].password === body.oldPassword, Tags.oldPwdMismatch, null, cb)))
         {
            delete body.oldPassword;
            if(Object.keys(body).length){
               console.log("\nstep 2\n");
               cnn.chkQry('update Person set ? where id = ?', [body, id], cb);
            }
            else
               cb();
         }
      },
      function(result, fields, cb) {
         res.status(200).end();
         cb();
      }
   ],
   function(err) {
      cnn.release();
   });
});


router.post('/', function(req, res) {
   var vld = req.validator;  // Shorthands
   var body = req.body;
   var admin = req.session && req.session.isAdmin();
   var cnn = req.cnn;

   if (admin && !body.password)
      body.password = "*";                       // Blocking password
   body.whenRegistered = new Date();

   async.waterfall([
   function(cb) { // Check properties and search for Email duplicates
      if (vld.hasFields(body, ["email", "password", "role"], cb) &&
       vld.chain(body.role === 0 || admin, Tags.noPermission)
       .chain(body.termsAccepted || admin, Tags.noTerms)
       .check(body.role >= 0, Tags.badValue, ["role"], cb)) {
         cnn.chkQry('select * from Person where email = ?', body.email, cb)
      }
   },
   function(existingPrss, fields, cb) {  // If no duplicates, insert new Person
      if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb)) {
         body.termsAccepted = body.termsAccepted && new Date();
         cnn.chkQry('insert into Person set ?', body, cb);
      }
   },
   function(result, fields, cb) { // Return location of inserted Person
      res.location(router.baseURL + '/' + result.insertId).end();
      cb();
   }],
   function(err) {
      cnn.release();
   });
});


router.get('/:id', function(req, res) {
   var vld = req.validator;

   async.waterfall([
   function(cb) {
     if (vld.checkPrsOK(req.params.id, cb))
        req.cnn.chkQry('select id, firstName, lastName, email, whenRegistered, termsAccepted, role from Person where id = ?', [req.params.id],
         cb);
   },
   function(prsArr, fields, cb) {
      if (vld.check(prsArr.length, Tags.notFound, null, cb)) {
         res.json(prsArr);
         cb();
      }
   }],
   function(err) {
      req.cnn.release();
   });
});

/*/
router.get('/:id', function(req, res) {
   var vld = req.validator;

   if (vld.checkPrsOK(req.params.id)) {
      req.cnn.query('select * from Person where id = ?', [req.params.id],
      function(err, prsArr) {
         if (vld.check(prsArr.length, Tags.notFound))
            res.json(prsArr);
         req.cnn.release();
      });
   }
   else {
      req.cnn.release();
   }
});
/*/

router.delete('/:id', function(req, res) {
   var vld = req.validator;

   if (vld.checkAdmin())
      req.cnn.query('DELETE from Person where id = ?', [req.params.id],
      function (err, result) {
         if (!err || vld.check(result.affectedRows, Tags.notFound))
            res.status(200).end();
         req.cnn.release();
      });
   else {
      req.cnn.release();
   }
});

module.exports = router;
