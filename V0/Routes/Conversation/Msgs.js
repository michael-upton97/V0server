
//jshint ignore:start
var Express = require('express');
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');

var router = Express.Router({caseSensitive: true});

router.baseURL = '/Msgs';


router.get('/:msgId', function(req, res) {
    req.cnn.chkQry('select m.whenMade, p.email, m.content from message m join conversation c on m.cnvId = c.id join person p on p.id = c.ownerId where m.id = ?', req.params.msgId,
    function(err, cnvs) {
       if (!err && req.validator.check(cnvs.length, Tags.notFound, null, null))
          res.json(cnvs[0]);
       req.cnn.release();
    });
 });


 module.exports = router;
