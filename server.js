var http = require("http"),
    url = require("url"),
    path = require("path"),
    httpProxy = require('http-proxy'),
    fs = require("fs")
    proxy = httpProxy.createProxyServer({})
    prefix = '/service'
    staticDir = './'
    port = process.argv[2] || 8000;

http.createServer(function(request, response) {

  console.log(request);

  if (request.url.indexOf(prefix) === 0) {
    proxy.web(request, response, { target: 'https://127.0.0.1:7071', secure: false });
  } else {

    var uri = url.parse(request.url).pathname
      , filename = path.join(process.cwd(), uri);

    fs.exists(filename, function(exists) {
      if(!exists) {
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
        return;
      }

      if (fs.statSync(filename).isDirectory()) filename += '/index.html';

      fs.readFile(filename, "binary", function(err, file) {
        if(err) {
          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write(err + "\n");
          response.end();
          return;
        }

        response.writeHead(200);
        response.write(file, "binary");
        response.end();
      });
    });
  }
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
