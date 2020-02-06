var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var users = require('./user.json') // 引入模拟数据的
var session = require("express-session"); // 引入session模块
var bodyParser  =  require("body-parser");  

app.use(bodyParser.urlencoded({ extended: false }));  // 中间件 

app.use(require('express').static('./public'))
 // 设置官方文档提供的中间件
app.use(session({
  　　secret: 'keyboard cat',
  　　esave: true,
  　　saveUninitialized: true
}))

app.post('/login', function (req, res) {
   if(req.body.account && req.body.pwd) {
    // 校验用户名密码是否为空
      var user = checkUser(req.body.account, req.body.pwd)
      if(user) {
        req.session.user = user // 将当前用户信息赋值给session信息
        res.json({ code: 0, msg: '验证成功', user }) // 将数据进行相应
        return
      }
      res.json({ code: 1, msg: '用户名或者密码不正确' })
   }
})
//  获取用户信息
app.get('/getUserInfo', function(req, res) {
  res.json({ user:  req.session.user })
})
// 用来存放 用户id 和 socketid
// 
var userSockets = {
  
}
var peoples = [] // 当前人
// 聊天室
io.on('connection', function(socket){
  var accountId = socket.request._query.account // 获取用户id
  if(accountId) {
     userSockets[accountId] = socket.id  // 用户个人信息
     var people = getUserByAccount(accountId)
     peoples.push(people) // 添加人群
     socket.emit("allpeople", peoples) // 当前所有人
    //  io.emit("peopleIn", people) // 有人进入
     sendOtherAll(socket.id, "peopleIn", people ) // 告诉其他人 我进来了

  }
  socket.on('disconnect', function(){
    console.log('user disconnected');
    var account = getAccountBySocketID(socket.id)
    io.emit("peopleOut", getAccountBySocketID(socket.id)) // 有人退出
    peoples = peoples.filter(item =>item.account != account)
  });

  socket.on('message-private', function(account,msg){
    var toID = getSocketIDByAccount(account)
    socket.broadcast.to(toID).emit("message-private",account, msg) // 给某人指定发消息
  });
});

http.listen(3000, '0.0.0.0', function(){
  console.log('老高简易聊天系统启动成功, 访问地址 http://localhost:3000');
});
// 检查user
function  checkUser (account , pwd) {
 var user =  users.find(item => item.account == account && item.pwd == pwd)
 return user 
}
// 根据用户id获取 用户信息
function getUserByAccount (account){
  return  users.find(item => item.account == account )
}
// 根据socket获取用户ID
function getAccountBySocketID (socketid) {
  var account 
   Object.keys(userSockets).forEach(function(item){
     if(userSockets[item] === socketid) {
      account = item
     }
   })
   return account
}
// 根据用户ID获取 socketID
function getSocketIDByAccount (accountID){
   return userSockets[accountID]
}
// 给除自己之外的人发消息
function sendOtherAll (id,type, ...params) {
 var others = io.sockets.sockets
 Object.keys(others).map(function(key){
    if(id !==key) {
      others[key].emit(type, ...params)
    }
 })
}