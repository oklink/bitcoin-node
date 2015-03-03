// 项目配置和工具方法。
var sysConfig = require("../lib/sysconfig");
var tools = require("../lib/tools");
// RPC调用bitcoind模块。
var RpcClient = require("../lib/bitcoind-rpc");

// 文件操作模块。
var fs = require("fs");
// 文件上传模块。
var formidable = require("formidable");
// pdf文件生成模块。
var PDFDocument = require("pdfkit");
// 二维码生成模块。
var qrimage = require("qr-image");

var express = require("express");
var router = express.Router();

/** 首页，已经初始化则直接进入菜单页。 */
router.get("/", function(req, res, next) {
	var userInfo = req.session.userInfo;
	if(userInfo != null && userInfo.isInit){
		res.redirect("/home");
		return false;
	}	
	res.render("index", {title: sysConfig.title});
});

/**
 * 初始化功能，ajax访问，成功返回true。
 */
router.post("/init", function(req, res, next){
	var user = req.body.rpcuser;
	var password = req.body.rpcpassword;
	var rpcip = req.body.rpcip;
	var port = req.body.rpcport;

	var userInfo = sysConfig.getUserInfo({
		user: user, 
		password: password, 
		rpcip: rpcip,
		port: port
	});
	
	var initResult = {result: "false"};
	if(userInfo == null){
		initResult.resInfo = "paramneed";
		res.send(JSON.stringify(initResult)); 
		return false;
	}	
	
	var rpc = new RpcClient(userInfo.config);
    rpc.getInfo(function(err, ret){
		if(err){
			userInfo.isInit = false;
			initResult.resInfo = "error";
			res.send(JSON.stringify(initResult));
			return false;
		}	
		userInfo.isInit = true;
		req.session.userInfo = userInfo;

		initResult.result = "true";		
		res.send(JSON.stringify(initResult));				
	});    
});

/**
 * 项目功能列表页面。展示网络信息和功能入口。
 */
router.get("/home", sysConfig.filter, function(req, res, next){	
	var userInfo = req.session.userInfo;	
	var rpc = new RpcClient(userInfo.config);
	rpc.getInfo(function(err, ret){
		if(err){			
			userInfo.isInit = false;
			res.redirect("/");
			return false;
		}				
		res.render("home", {
			title : sysConfig.title, 
			netinfo : ret.result,
			isLocal: userInfo.isLocal
		});
	});  
});

/**
 * 按组获取用户所有的钱包地址和余额。
 */
router.get("/wallets", sysConfig.filter, function(req, res, next){
	var userInfo = req.session.userInfo;	
	var rpc = new RpcClient(userInfo.config);
	rpc.listAddressGroupings(function(err, ret){
		if(err){			
			userInfo.isInit = false;
			res.redirect("/");
			return false;
		}
		
		var walletList = [];	
		var amount = 0;
		var datas_arr = ret.result;
		// 结果转换，结果数据的形式是数组中包含数组。
		for(var i = 0, len = datas_arr.length; i < len; i ++){
			var data_arr = datas_arr[i];
			for(var j = 0, jlen = data_arr.length; j < jlen; j ++){
				var temp = data_arr[j];				
				var info = {};
				info.group = i;
				info.groupSize = jlen;
				info.idx = j;
				info.address = temp[0];
				info.amount = temp[1];
				walletList.push(info);

				amount += temp[1];
			}
		}			
		res.render("wallets", {title: sysConfig.title, walletList:walletList, amount:amount});
	});
});

/** 获取新的钱包地址和密钥。 */
router.get("/newallet", function(req, res, next){
	var walletInfo = {};
	walletInfo.result = "false";
	
	var userInfo = req.session.userInfo;
	if(userInfo == null || !userInfo.isInit){
		walletInfo.resInfo = "needInit";
		res.send(JSON.stringify(walletInfo));
		return false;
	}
	
	var rpc = new RpcClient(userInfo.config);
	rpc.getNewAddress(function(err, ret){
		if(err){			
			sysConfig.isInit = false;
			walletInfo.resInfo = "needInit";
			res.send(JSON.stringify(walletInfo));
			return false;
		}				
		
		var address = ret.result;
		walletInfo.address = address;

		rpc.dumpPrivKey(address, function(err, kret){
			if(err){			
				sysConfig.isInit = false;
				walletInfo.resInfo = "needInit";
				res.send(JSON.stringify(walletInfo));
				return false;
			}

			walletInfo.result = "true";
			walletInfo.privkey = kret.result;

			res.send(JSON.stringify(walletInfo));
		});
	});
});

/**
 * 导出所选钱包的信息。
 */
router.post("/wallet/exportsel", sysConfig.filter, function(req, res, next){
	var result = {
		title: sysConfig.title,
		from: "exportsel",
		result: false		
	};
	var userInfo = req.session.userInfo;
	if(userInfo == null || !userInfo.isInit){
		result.message = "needinit";
		res.send(JSON.stringify(result));
		return false;
	}
	var ids = req.body.idsSelected;	
	var pass = req.body.pass;
	var isBip38 = req.body.bip38;

	if(ids.trim().length == 0){
		result.message = "idneeded";
		res.send(JSON.stringify(result));
		return false;
	}

	var id_arr = ids.split(",");	
	var id_len = id_arr.length;
	var todump = [];	
	for(var i = 0, len = id_len; i < len; i ++){		
		getKeyByAddress(req, id_arr[i], todump, id_len, pass, isBip38, res);
	}		
});

/**
 * 根据地址获取密钥，成功后调用后续步骤。
 */
function getKeyByAddress(req, address, todump, id_len, pass, isBip38, res){	
	var userInfo = req.session.userInfo;
	var rpc = new RpcClient(userInfo.config);
	rpc.dumpPrivKey(address, function(err, ret){
		if(err){			
			sysConfig.isInit = false;
			result.message = "idneeded";
			res.send(JSON.stringify(result));
			return false;
		}

		var isEncrypt = false;
		if(pass.length != 0){
			isEncrypt = true;
		}
		
		var obj = {
			key : ret.result,
			addr: address,
			isBip38: isBip38
		}
		if(isEncrypt){
			obj.encryptedKey = tools.encryptKey(ret.result, address, pass, isBip38),
			obj.encryptedKeyStr = JSON.stringify(obj.encryptedKey);
			obj.keyqr = qrimage.imageSync(obj.encryptedKeyStr, sysConfig.QRConfig);			
		} else {
			obj.keyqr = qrimage.imageSync(obj.key, sysConfig.QRConfig);
		}		
		obj.addrqr = qrimage.imageSync(obj.addr, sysConfig.QRConfig);
	
		todump.push(obj);
		if(todump.length == id_len){
			dealKeyDump(todump, res, isEncrypt);			
		}
	});
}

/**
 * 进行文件生成和导出操作。
 */
function dealKeyDump(todump, res, isEncrypt){		
	var fileName = tools.getDateStr() +".pdf";
	res.setHeader("Content-disposition", "attachment; filename=" + fileName);
	res.setHeader("Content-type", "application/pdf");

	var doc = new PDFDocument();
	doc.pipe(res);

	var keyInfo = "Private Key:";
	var keyprop = "key";
	if(isEncrypt){
		keyInfo = "Encrypted Private Key:";
		keyprop = "encryptedKeyStr";
	}

	var x = 50; // pdf中的横坐标，即缩进。
	for(var i = 0, len = todump.length; i < len; i += 2){	
		if(i != 0){
			doc.addPage();
		}		
		var info1 = todump[i];
		var info2 = todump[i + 1];

		doc.moveTo(x, 40).lineTo(550, 40).stroke();

		doc.image(info1.keyqr, x, 60, sysConfig.imageSize);
		doc.text(keyInfo, 210, 60);
		doc.text("Data: " + info1[keyprop], 210, 110);
	
		doc.image(info1.addrqr, x, 210, sysConfig.imageSize);
		doc.text("Address:", 210, 210);
		doc.text("Data: " + info1.addr, 210, 250);
		 
		doc.moveTo(x, 350).lineTo(550, 350).stroke();	

		if(info2 == null || info2 == undefined){
			break;
		}

		doc.image(info2.keyqr, x, 370, sysConfig.imageSize);
		doc.text(keyInfo, 210, 370);
		doc.text("Data: " + info2[keyprop], 210, 420);

		doc.image(info2.addrqr, x, 520, sysConfig.imageSize);
		doc.text("Address:", 210, 520);
		doc.text("Data: " + info2.addr, 210, 560);
		   
		doc.moveTo(x, 660).lineTo(550, 660).stroke();		
	}
	doc.end();
}

/**
 * 钱包导出。
 */
router.post("/backup", sysConfig.filter, function(req, res, next){	
	// 检查并创建temp目录。
	var path = process.cwd() + "/temp/download";
    if(!fs.existsSync(path)){
		fs.mkdirSync(path);
		console.log("创建临时目录：" + path);
	}
	var userInfo = req.session.userInfo;
	var fileName = userInfo.config.host + "_" + tools.getDateStr() + ".data";
	console.log("备份名称：" + fileName);

	// backupWallet成功备份后返回{result:null, error:null, id:null}。	
	var rpc = new RpcClient(userInfo.config);
	rpc.backupWallet(path + fileName, function(err, ret){
		if(err){			
			userInfo.isInit = false;
			res.redirect("/");
			return false;
		}		
		// 备份成功。
		if(ret.result == null && ret.error == null){
			res.setHeader("Content-disposition", "attachment; filename=" + fileName);
			res.setHeader("Content-type", "application/octet-stream");
			var downstream = fs.createReadStream(path + fileName);
			downstream.on("data", function(filebody){
				res.write(filebody);
			});
			downstream.on("end", function(){
				res.end();
				// 备份成功后删除备份文件。
				fs.unlink(path + fileName, function(){
					console.log("已删除备份文件：" + fileName);
				});				
			});
			downstream.on("error", function(err){
				console.log(err);
			});					
		} else {
			// 传回具体信息，或者直接传回文件流。
			res.send("failure");
		}		
	});	
});

/**
 * 将用户上传的备份文件导入到bitcoin中。
 */
router.post("/import", function(req, res, next){
	var result = {
		title: sysConfig.title,
		from: "import",
		result: false
	};
	var userInfo = req.session.userInfo;
	if(userInfo == null || !userInfo.isInit){
		result.message = "needinit";
		res.render("result", result);
		return false;
	}

	var form = new formidable.IncomingForm();
	form.encoding = "utf-8";
	form.uploadDir = process.cwd() + "/temp/upload";
	form.keepExtensions = true;
	form.maxFieldsSize = 1024 * 1024 * 1024;

	form.parse(req, function(err, fields, files){
		if(err){
			res.locals.error = err;
			result.message = "uploadfail";
			res.render("result", result);
			return ;
		}
		var uploadPath = files.wallet.path;
		console.log("已上传文件：" + uploadPath);
		var rpc = new RpcClient(userInfo.config);
		rpc.importWallet(uploadPath, function(err, ret){
			if(err){			
				userInfo.isInit = false;
				result.message = "importfail";
				res.render("result", result);
				return false;
			}
			// 备份成功后删除备份文件。
			fs.unlink(uploadPath, function(){
				console.log("导入后删除备份文件：" + uploadPath);
			});	
			result.result = true;
			res.render("result", result);
		});
	});
});

module.exports = router;
