var Express = require('express');
var Tags = require('../Validator.js').Tags;
var router = Express.Router({caseSensitive: true});
var async = require('async');

router.baseURL = '/Cnvs';

router.get('/', function(req, res) {
   if(req.validator.check(true, null, null, null)){
      if(!req.query.owner){
         req.cnn.chkQry('select * from Conversation', null,
         function(err, cnvs) {
            if (!err){
               for (var x in cnvs){
                  if (cnvs[x].lastMessage) cnvs[x].lastMessage = cnvs[x].lastMessage.getTime();
               }
               res.json(cnvs).end();
            }
         });
      }
      else {
         req.cnn.chkQry('select * from Conversation where ownerId = ?', req.query.owner,
         function(err, cnvs) {
            if (!err){
               for (var x in cnvs){
                  if (cnvs[x].lastMessage) cnvs[x].lastMessage = cnvs[x].lastMessage.getTime();
               }
               res.json(cnvs).end();
            }
         });
      }
   }
   req.cnn.release();
});

router.get('/:id', function(req, res) {
   req.cnn.chkQry('select * from Conversation where id = ?', req.params.id,
   function(err, cnvs) {
      if (!err && req.validator.check(cnvs.length, Tags.notFound, null, null)){
         if (cnvs[0].lastMessage) cnvs[0].lastMessage = cnvs[0].lastMessage.getTime();
         res.json(cnvs[0]);
      }
      req.cnn.release();
   });
});

router.post('/', function(req, res) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;

   async.waterfall([
   function(cb) {
      if(vld.check(body.title, Tags.missingField, ["title"], cb))
         cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
   },
   function(existingCnv, fields, cb) {
      if (vld.check(!existingCnv.length, Tags.dupTitle, null, cb)) {
         body.ownerId = req.session.id;
         cnn.chkQry("insert into Conversation set ?", body, cb);
      }
   },
   function(insRes, fields, cb) {
      res.location(router.baseURL + '/' + insRes.insertId).end();
      cb();
   }],
   function() {
      cnn.release();
   });
});

router.put('/:cnvId', function(req, res) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;
   var cnvId = req.params.cnvId;

   async.waterfall([
   function(cb) {
      cnn.chkQry('select * from Conversation where id = ?', cnvId, cb);
   },
   function(cnvs, fields, cb) {
      if (vld.chain (("title" in body) && body.title, Tags.missingField, ["title"]).check(cnvs.length, Tags.notFound, null, cb) &&
       vld.checkPrsOK(cnvs[0].ownerId, cb))
         cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
   },
   function(sameTtl, fields, cb) {
      if (vld.check(!sameTtl.length, Tags.dupTitle, cb))
         cnn.chkQry("update Conversation set title = ? where id = ?",
          [body.title, cnvId], cb);
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      req.cnn.release();
   });
});

router.delete('/:cnvId', function(req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
   function(cb) {
      cnn.chkQry('select * from Conversation where id = ?', cnvId, cb);
   },
   function(cnvs, fields, cb) {
      if (vld.check(cnvs.length, Tags.notFound, null, cb) &&
       vld.checkPrsOK(cnvs[0].ownerId, cb))
         cnn.chkQry('delete from Conversation where id = ?', cnvId, cb);
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      cnn.release();
   });
});

router.get('/:cnvId/Msgs', function(req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;
   var query = 'select m.id, whenMade, email, content from Conversation c' +
    ' join Message m on cnvId = c.id' 
   var params = [];
   var limit = 0;

   // And finally add a limit clause and parameter if indicated.
   
   if (req.query.dateTime) {
      query += ' and whenMade <= ?';
      params.push(new Date(parseInt(req.query.dateTime)));
   }

   query += ' join Person p on prsId = p.id where c.id = ? order by whenMade';
   params.push(cnvId);

   if (req.query.num) {
      //query += ' limit = ?;';
      //params.push(req.query.num);
      limit = req.query.num;
   }

   async.waterfall([
   function(cb) {  // Check for existence of conversation
      
      cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
   },
   function(cnvs, fields, cb) { // Get indicated messages
      console.log("\nQUERY:\t" + query + "\n");
     // console.log("\nPARAMS:\t" + params + "\n");
      console.log("\nCNVS-LENGTH:\t" + cnvs.length + "\n");
      if (vld.check(cnvs.length, Tags.notFound, null, cb)){
         console.log("\nIF STATEMENT PASSED\n");
         cnn.chkQry(query, params, cb);
      }
   },
   function(msgs, fields, cb) { // Return retrieved messages
      console.log("\nMSG:\t" + msgs + "\n");
      if(msgs)
         for (var x in msgs){
            console.log(msgs[0].whenMade); 
            msgs[x].whenMade = msgs[x].whenMade.getTime();
         }
      if(limit){
         res.json(msgs.slice(0, limit)).end();
         cb();
      }
      else {
         res.json(msgs).end();
         cb();
      }
   }],
   function(err){
      console.log("\ngot here\n");
      cnn.release();
   });
});

router.post('/:cnvId/Msgs', function(req, res){
   var vld = req.validator;
   var cnn = req.cnn;
   var cnvId = req.params.cnvId;
   var now;

   async.waterfall([
   function(cb) {
      if(vld.check(req.body.content, Tags.missingField, "content", cb))
         cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
   },
   function(cnvs, fields, cb) {
      if (vld.check(cnvs.length, Tags.notFound, null, cb)){
            cnn.chkQry('Insert into Message set ?',
             {cnvId: cnvId, prsId: req.session.id,
             whenMade: now = new Date(), content: req.body.content}, cb);
            console.log("\n\t\t\tMSG time = " + now.getTime() + "\n");
      }
   },
   function(insRes, fields, cb) {
      //console.log("\n" + Object.keys(insRes) + "\n" + insRes.insertId + "\n");
      res.location('/Msgs/' + insRes.insertId);
      cnn.chkQry("update Conversation set lastMessage = ? where id = ?", [now, cnvId], cb);
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      cnn.release();
   });
});

module.exports = router;
