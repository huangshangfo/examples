void function(g,f,j,c,h,d,b){
g.alogObjectName=h,
g[h]=g[h]||function(){
(g[h].q=g[h].q||[]).push(arguments)},
g[h].l=g[h].l||+new Date,
d=f.createElement(j),
d.async=!0,
d.src=c,
b=f.getElementsByTagName(j)[0],
b.parentNode.insertBefore(d,b)
}(window,document,"script","http://img.baidu.com/hunter/alog/alog.min.js","alog");

void function(){
function c()
{return;}
window.PDC={mark:function(a,b){
alog("speed.set",a,b||+new Date);
alog.fire&&alog.fire("mark")},init:function(a){
alog("speed.set","options",a)},view_start:c,tti:c,page_ready:c}}();void function(n){var o=!1;n.onerror=function(n,e,t,c){var i=!0;return!e&&/^script error/i.test(n)&&(o?i=!1:o=!0),i&&alog("exception.send","exception",{msg:n,js:e,ln:t,col:c}),!1},alog("exception.on","catch",function(n){alog("exception.send","exception",{msg:n.msg,js:n.path,ln:n.ln,method:n.method,flag:"catch"})})}(window);
