/*
  RESTFest 2014 BakeOff Server
  to-do for negotiated media types
  supports Cj and HALj 
 */

var fs = require('fs');
var http = require('http');
var querystring = require('querystring');

var g = {};
g.host = '';
g.port = (process.env.PORT ? process.env.PORT : 8484);

/* internal test data */
g.list = [];
g.list[0] = {todoid:0,todoTitle:'this is some item',todoDateDue:'2014-09-25',todoComplete:"no"};
g.list[1] = {todoid:1,todoTitle:'this is another item',todoDateDue:'2014-09-25',todoComplete:"no"};
g.list[2] = {todoid:2,todoTitle:'this is one more item',todoDateDue:'2014-09-25',todoComplete:"no"};
g.list[3] = {todoid:3,todoTitle:'this is possibly an item',todoDateDue:'2014-09-25',todoComplete:"no"};

// main entry point
function handler(req, res) {

  var m = {};
  m.item = {};
  m.filter = '';
  m.url = '';
  m.id = '';
  
  // internal urls
  m.homeUrl = '/';
  m.listUrl = '/tasks/';
  m.itemUrl = '/tasks/item/';
  m.filterUrl = '/tasks/search';
  m.completeUrl = '/tasks/complete/';

  // media-type identifiers
  m.appCj  = {'content-type':'application/vnd.collection+json'};
  m.appJSON = {'content-type':'application/json'};
  m.appHj = {'content-type':'application/hal+json'};
  m.ctype = '';
  m.cflag=false;
  m.accept = '';
  
  // add support for CORS
  m.headers = {
    'Content-Type' : 'application/json',
    'Access-Control-Allow-Origin' : '*',
    'Access-Control-Allow-Methods' : 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers' : '*'
  };

  main();

  /* process requests */
  function main() {

    g.root = 'http://'+req.headers.host;
    m.url = '';
    m.filter = '';

    m.cflag = false;
    m.ctype='';
    m.accept = req.headers.accept.toLowerCase();
    if(m.accept.indexOf(m.appCj["content-type"])!==-1) {
      m.ctype = m.appCj;
      m.cflag=true;
    }
    if(m.cflag===false && m.accept.indexOf(m.appJSON["content-type"])!==-1) {
      m.ctype = m.appCj;
      m.cflag=true;
    }
    if(m.cflag===false && m.accept.indexOf(m.appHj["content-type"])!==-1) {
      m.ctype = m.appHj;
      m.cflag = true;
    }
    if(m.cflag===false) {
      m.ctype = m.appCj;
      m.cflag = true;
    }
    
    // check for a search query
    if(req.url.indexOf(m.filterUrl)!==-1) {
      m.url = m.filterUrl;
      m.filter = req.url.substring(m.filterUrl.length,255).replace('?text=','');
    }

    // check for item query
    if(req.url.indexOf(m.itemUrl)!==-1) {
      m.url = m.itemUrl;
      m.id = req.url.substring(m.itemUrl.length,255);
    }

    // else...
    if(m.url==='') { 
      m.url = req.url;
    }

    // handle CORS OPTIONS call
    if(req.method==='OPTIONS') {
        var body = JSON.stringify(m.headers);
        showResponse(req, res, body, 200);
    }

    // process request
    switch(m.url) {
      case m.listUrl:
        switch(req.method) {
          case 'GET':
            sendList();
            break;
          case 'POST':
            addToList();
            break;
          default:
            showError(405, 'Method not allowed');
            break;
        }
        break;
      case m.filterUrl:
        switch(req.method) {
          case 'GET':
            searchList();
            break;
          default:
            showError(405, 'Method not allowed');
            break;
        }
        break;
      case m.itemUrl:
        switch(req.method) {
          case 'GET':
            sendItem(m.id);
            break;
          case 'PUT':
            updateItem(m.id);
            break;  
          default:
            showError(405, 'Method not allowed');
            break; 
        }
        break;
      case m.completeUrl:
        switch(req.method) {
          case 'POST':
            completeItem();
            break;
          default:
            showError(405, 'Method not allowed');
            break;
        }
        break;
      default:
        showError(404, 'Page not found');
        break;
    }
  }

  /* 
    show list of items
    /tasks/
 
  */
  function sendList() {
    var msg;

    msg = represent(m.ctype["content-type"],g.list);
    
    res.writeHead(200, 'OK', m.headers);
    res.end(JSON.stringify(msg,null,2));
  }

  /* 
     search the list
     /tasks/search?title={title} 

  */
  function searchList() {
    var list, i, x, msg;

    list = [];
    for(i=0,x=g.list.length;i<x;i++) {
      if(g.list[i].todoTitle.indexOf(m.filter)!==-1) {
        list.push(g.list[i]);
      }
    }

    msg = represent(m.ctype["content-type"],list);

    res.writeHead(200, 'OK', m.headers);
    res.end(JSON.stringify(msg, null, 2));
  }

  /*
    return a single item
    /tasks/items/{id}
  */
  function sendItem(id) {
    var list, i, x, msg;

    list = [];
    for(i=0,x=g.list.length;i<x;i++) {
      if(g.list[i].todoid==id) {
        list.push(g.list[i]);
      }  
    }

    msg = represent(m.ctype["content-type"],list);
    
    res.writeHead(200, 'OK', m.headers);
    res.end(JSON.stringify(msg, null, 2));    
  }

  /*
      update an item
      /tasks/items/{id}
  */
  function updateItem(id) {
    var body = '';

    req.on('data', function(chunk) {
      body += chunk.toString();
    });

    req.on('end', function() {
      t = JSON.parse(body);

      item = {};
      for(i=0,x=t.template.data.length;i<x;i++) {
        n = t.template.data[i].name;
        v = t.template.data[i].value;
        item[n]=v;
      }      
      sendUpdate(id,item);
    });
     
  }
  function sendUpdate(id,item) {
    var list, i, x, msg;

    list = [];
    for(i=0,x=g.list.length;i<x;i++) {
      if(g.list[i].todoid==id) {
        g.list[i] = item;
      }
      list.push(g.list[i]);
    }

    msg = represent(m.ctype["content-type"],g.list);

     
    res.writeHead(200, 'OK', m.headers);
    res.end(JSON.stringify(msg, null, 2));    
  }
  
  /* 
     add item to list

     /tasks/
     text={text} 

  */
  function addToList() {
    var body = '';
    var t, item, i, x,n,v;

    req.on('data', function(chunk) {
      body += chunk.toString();
    });

    req.on('end', function() {
      t = JSON.parse(body);

      item = {};
      for(i=0,x=t.template.data.length;i<x;i++) {
        n = t.template.data[i].name;
        v = t.template.data[i].value;
        item[n]=v;
      }      
      sendAdd(item);
    });
  }
  function sendAdd(t) {
    var item;

    item = t;
    item.todid = g.list.length;
    g.list.push(item);

    res.writeHead(204, "No content");
    res.end();
  }

  /* 
     complete single item

     /tasks/complete/
     id={id} 

  */
  function completeItem() {
    var body = '';
    var t, item, i, x,n,v;

    req.on('data', function(chunk) {
      body += chunk.toString();
    });

    req.on('end', function() {
      m.item = querystring.parse(body);
      sendComplete();
    });
  }
  function sendComplete() {
    var tlist, i, x;

    //build new list
    tlist = [];
    for(i=0,x=g.list.length;i<x;i++) {
      if(g.list[i].id!=m.item.id) {
        tlist.push(g.list[i]);
      }
    }
    g.list = tlist.slice(0);

    res.writeHead(204, "No content");
    res.end();
  }

  /* handle representation */
  function represent(t,list) {
    var msg;
    switch(t) {
      case m.appCj["content-type"]:
        msg = makeCj(list);
        break;
      case m.appHj["content-type"]:
        msg = makeHj(list);
        break;
      default:
        msg = makeCj(list);
        break;
    }
    return msg;
  }

  /* compose HALjson body */
  function makeHj(list, error) {
    var msg, coll, item, i, x;

    msg = {};

    if(list.length===1) {
      msg = makeHjItem(list[0]);
    }
    else {
      msg._embedded = {};
      msg._embedded.todos = [];
      for(i=0,x=list.length;i<x;i++) {
        item = makeHjItem(list[i]);
        msg._embedded.todos.push(item);
      }
    }

    return msg;
  }
  function makeHjItem(list) {
    var item;

    item = {};
    item.todoid = list.todoid;
    item.todoTitle = list.todoTitle;
    item.todoDateDue = list.todoDateDue;
    item.todoComplete = list.todoComplete;
    item._links = {};
    item._links.self = {};
    item._links.self.href = g.root+m.itemUrl + list.todoid;
    item._links.profile = {};
    item._links.profile.href = g.root+"/alps.xml";         

    return item;    
  }
  
  /* compose Cj body */
  function makeCj(list, error) {
    var msg, item, i, x;

    msg = {};
    msg.collection = {};
    msg.collection.version="1.0";
    msg.collection.href=m.url;

    msg.collection.links = [];
    msg.collection.links.push({rel:"home, todoList",href:g.root+m.listUrl});

    if(list.length>0) {
      msg.collection.queries = [];
      msg.collection.queries.push({rel:"search, todoSearch",href:g.root+m.filterUrl,name:"Search", data:[{name:"text",value:"",prompt:"Title"}]});
    }

    msg.collection.items = [];
    for(i=0,x=list.length;i<x;i++) {
      item = {};
      item.href = g.root+m.itemUrl + list[i].todoid;
      item.rel = "item, todoRead, todoDelete";
      item.data = [];
      item.data.push({name:"todoid", value:list[i].todoid, prompt:"ID"});
      item.data.push({name:"todoTitle", value:list[i].todoTitle, prompt:"Title"});
      item.data.push({name:"todoDateDue",value:list[i].todoDateDue,prompt:"Due"});
      item.data.push({name:"todoComplete",value:list[i].todoComplete,prompt:"Complete"});
      msg.collection.items.push(item);
    }

    if(error) {
      msg.collection.error = error;
    }
    else {
      msg.collection.template = {};
      msg.collection.template.rel = "createForm, todoComplete, todoCreate, todoEdit, todoEditDateDue";
      msg.collection.template.data = [];
      msg.collection.template.data.push({name:"todoTitle",value:"",prompt:"Title"})
      msg.collection.template.data.push({name:"todoDateDue",value:"",prompt:"Due"})
      msg.collection.template.data.push({name:"todoComplete",value:"",prompt:"Complete"})
    }
    return msg;

  }
  /* show html page */
  function showHtml() {
    fs.readFile('home.html', 'ascii', sendHtml);
  }
  function sendHtml(err, data) {
    if (err) {
      showError(500, err.message);
    }
    else {
      res.writeHead(200, "OK",m.textHtml);
      res.end(data);
    }
  }

  /* show script file */
  function showScript() {
    fs.readFile('cj.js', 'ascii', sendScript);
  }
  function sendScript(err, data) {
    if (err) {
      showError(500, err.message);
    }
    else {
      res.writeHead(200, "OK",m.appJS);
      res.end(data);
    }
  }

  /* show css file */
  function showCss() {
    fs.readFile('cj.css', 'ascii', sendCss);
  }
  function sendCss(err, data) {
    if (err) {
      showError(500, err.message);
    }
    else {
      res.writeHead(200, "OK", m.textCss);
      res.end(data);
    }
  }

  /* show error page */
  function showError(status, text) {
    var msg, error;
    
    error = {};
    error.title = text;
    error.code = status;
    error.message = "Error handling request, please try again.";
    
    msg = makeCj([],error);

    res.writeHead(status, text, m.headers);
    res.end(JSON.stringify(msg,null,2));
  }

  // return response to caller
  function showResponse(req, res, body, code) {
      //console.log(JSON.stringify(m.headers));
      res.writeHead(code,m.headers);
      res.end(body);
  }

}

// return response to caller
function showResponse(req, res, body, code) {
    //console.log(JSON.stringify(m.headers));
    res.writeHead(code,m.headers);
    res.end(body);
}

// listen for requests
http.createServer(handler).listen(g.port, g.host);

// ***** END OF FILE *****

