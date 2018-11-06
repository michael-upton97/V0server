
//jshint ignore:start
var Express = require('express');
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');

var router = Express.Router({caseSensitive: true});

router.baseURL = '/Msgs';


router.get('/:msgId', function(req, res) {
   req.cnn.chkQry('select m.whenMade, p.email, m.content from Message m join Person p on p.id = m.prsId where m.id = ?', req.params.msgId,
   function(err, cnvs) {
      if (!err && req.validator.check(cnvs.length, Tags.notFound, null, null)){
         console.log("\n\t\t\tRetrieved MSG time = " + cnvs[0].whenMade.getTime() + "\n");
         cnvs[0].whenMade = cnvs[0].whenMade.getTime();
         res.json(cnvs[0]);
      }
      req.cnn.release();
   });
 });


 module.exports = router;
