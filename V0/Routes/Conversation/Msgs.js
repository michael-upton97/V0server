
//jshint ignore:start
var Express = require('express');
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');

var router = Express.Router({caseSensitive: true});

router.baseURL = '/Msgs';


router.get('/:msgId', function(req, res) {
    req.cnn.chkQry('select whenMade, email, content from message where id = ?', req.params.id,
    function(err, cnvs) {
       if (!err&& req.validator.check(cnvs.length, Tags.notFound, null, null))
          res.json(cnvs[0]);
       req.cnn.release();
    });
 });


 module.exports = router;
