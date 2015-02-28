/**
 * 对当前用户进行校验。 
 */
var authorize = function(req, res, next){
	// 如果session为空或系统未初始化则返回首页。
	var userInfo = req.session.userInfo;	
	if(userInfo == null || !userInfo.isInit){
		res.redirect("/");
		return true;
	} else {
		next();
	}
}

/**
 * 根据传入的信息组织session所需保存的用户信息。 
 */ 
var getUserInfo = function(prop){
	if(prop == null || prop.user.trim().length == 0 || prop.password.trim().length == 0 
		|| prop.port.trim().length == 0){
		return null;
	}

	var userInfo = {
		isInit: false,
		isLocal: false,
		config: {
			protocol: 'http',
			user: prop.user,
			pass: prop.password,
			host: '127.0.0.1',
			port: prop.port,
		}
	};
	if(prop.rpcip.trim().length != 0){
		userInfo.config.host = prop.rpcip;
	}
	// 如果IP地址指向本机，则isLocal设为true。
	if(userInfo.config.host == "127.0.0.1" || userInfo.config.host.toUpperCase() == "LOCALHOST"){
		userInfo.isLocal = true;
	}
	return userInfo;
}

var sysConfig = {
	title: "Bitcoin-Node",	
	// 生成二维码时使用的配置。
	QRConfig: {
		ec_level: 'H',
		type: 'png', 
		size: 3,
		margin: 1
	}, 
	// pdf中二维码图片的大小。
	imageSize: {
		width: 120,
		height: 120
	},
	filter: authorize,
	getUserInfo: getUserInfo
}

module.exports = sysConfig;