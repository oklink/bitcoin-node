/**
 * 以“Dyyyy-MM-dd_Thh.mm.ss”格式返回当前日期字符串。
 */ 
var getDateStr = function(fdate){	
	var current = null;
	if(fdate != undefined && fdate != null){
		current = new Date(fdate);
	} else {
		current = new Date();
	}

	var result = "D" + current.getFullYear().toString() + "-";
	result += (current.getMonth() + 1).toString() + "-";
	result += current.getDate().toString();

	result += "_T" + current.getHours().toString() + ".";
	result += current.getMinutes().toString() + ".";
	result += current.getSeconds().toString();
	return result;
}

var sysconfig = {
	title : "Bitcoin-Node",
	isInit : false,
	config : {
		protocol: 'http',
		user: 'rpcusername',
		pass: 'rpcpassword',
		host: '127.0.0.1',
		port: '8332',
	},
	// 生成二维码时使用的配置。
	qrconfig : {
		ec_level: 'H',
		type: 'png', 
		size: 3,
		margin: 1
	}, 
	// pdf中二维码图片的大小。
	imagesize : {
		width : 120,
		height : 120
	},
	getDateStr:getDateStr
}

module.exports = sysconfig;