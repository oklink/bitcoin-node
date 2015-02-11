var express = require("express");
// 文件操作模块。
var fs = require("fs");
// 项目配置和工具方法。
var sysconfig = require("./sysconfig");
// 文件上传模块。
var formidable = require("formidable");
// RPC调用bitcoind模块。
var RpcClient = require("./bitcoind-rpc");
// pdf文件生成模块。
var PDFDocument = require("pdfkit");
// 二维码生成模块。
// var qrcode = require("qrcode");

var router = express.Router();
var rpc = null;

/** 首页，已经初始化则直接进入菜单页。 */
router.get('/', function(req, res, next) {	
	if(sysconfig.isInit && rpc != null){
		res.redirect("/home");
		return true;
	}
	res.render('index', {title: sysconfig.title});
});

/**
 * 初始化功能，ajax访问，成功返回true。
 */
router.post("/init", function(req, res, next){
	var user = req.body.rpcuser;
	var password = req.body.rpcpassword;
	var rpcip = req.body.rpcip;
	var port = req.body.rpcport;
	
	var initResult = {result: "false"};
	if(user.trim().length == 0 || password.trim().length == 0 || port.trim().length == 0){
		initResult.resInfo = "paramneed";
		res.send(JSON.stringify(initResult)); 
		return false;
	}	

	var config = sysconfig.config;
	config.user = user.trim();
	config.pass = password.trim();
	config.port = port.trim();
	if(rpcip.trim().length != 0){
		config.host = rpcip;
	}

	rpc = new RpcClient(config);
    rpc.getInfo(function(err, ret){
		if(err){
			sysconfig.isInit = false;
			initResult.resInfo = "error";
			res.send(JSON.stringify(initResult));
			return false;
		}	
		sysconfig.isInit = true;
		initResult.result = "true";		
		res.send(JSON.stringify(initResult));				
	});    
});

/**
 * 项目功能列表页面。展示网络信息和功能入口。
 */
router.get("/home", function(req, res, next){
	if(!sysconfig.isInit || rpc == null){
		res.redirect("/");
		return true;
	}

	rpc.getInfo(function(err, ret){
		if(err){			
			sysconfig.isInit = false;
			res.redirect("/");
			return false;
		}				
		res.render("home", {title : sysconfig.title, netinfo : ret.result});
	});  
});

/**
 * 按组获取用户所有的钱包地址和余额。
 */
router.get("/wallets", function(req, res, next){
	if(!sysconfig.isInit || rpc == null){
		res.redirect("/");
		return true;
	}

	rpc.listAddressGroupings(function(err, ret){
		if(err){			
			sysconfig.isInit = false;
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
		res.render("wallets", {title: sysconfig.title, walletList:walletList, amount:amount});
	});
});

/** 获取新的钱包地址和密钥。 */
router.get("/newallet", function(req, res, next){
	var walletInfo = {};
	walletInfo.result = "false";

	if(!sysconfig.isInit || rpc == null){
		walletInfo.resInfo = "needInit";
		res.send(JSON.stringify(walletInfo));
		return false;
	}

	rpc.getNewAddress(function(err, ret){
		if(err){			
			sysconfig.isInit = false;
			walletInfo.resInfo = "needInit";
			res.send(JSON.stringify(walletInfo));
			return false;
		}				
		
		var address = ret.result;
		walletInfo.address = address;

		rpc.dumpPrivKey(address, function(err, kret){
			if(err){			
				sysconfig.isInit = false;
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
router.post("/wallet/exportsel", function(req, res, next){
	var result = {
		title: sysconfig.title,
		from: "exportsel",
		result: false		
	};
	if(!sysconfig.isInit || rpc == null){
		result.message = "needinit";
		res.send(JSON.stringify(result));
		return false;
	}
	var ids = req.body.idsSelected;
	console.log(ids);
	if(ids.trim().length == 0){
		result.message = "idneeded";
		res.send(JSON.stringify(result));
		return false;
	}
	var id_arr = ids.split(",");	
	var id_len = id_arr.length;
	var todump = [];
	for(var i = 0, len = id_len; i < len; i ++){		
		getKeyByAddress(id_arr[i], todump, id_len, res);
	}		
});
/**
 * 根据地址获取密钥，成功后调用后续步骤。
 */
function getKeyByAddress(address, todump, id_len, res){	
	rpc.dumpPrivKey(address, function(err, ret){
		if(err){			
			sysconfig.isInit = false;
			result.message = "idneeded";
			res.send(JSON.stringify(result));
			return false;
		}		
		// 先放置假的图片。
		var obj = {
			key : ret.result,
			addr: address,
			keyqr: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKwAAACsCAYAAADmMUfYAAAABmJLR0QA/wD/AP+gvaeTAAAEaklEQVR4nO3dQW4jIRAF0PFo7n9lzzbqRRCiCvj2e9u4253kC5VoKF7v9/v9B0L8Pf0AMENgiSKwRBFYoggsUQSWKAJLFIElisASRWCJIrBEEViiCCxRBJYoAksUgSWKwBJFYIkisET5V33D1+tVfctfjbakPZ/n+fnRz2fN3m/17zX7+9z2/5llhCWKwBJFYIlSXsM+VdcwoxrsdM26+vnu5x1936ruGtkISxSBJYrAEqW9hn2arXG6a8zqmmv2eXfP+87eb2R3azYjLFEEligCS5TtNexps+/WZz8/e7/Z63fPM9/GCEsUgSWKwBLl62rY6vWq3fOe3etp0xhhiSKwRBFYomyvYXfPC47mKUc17er1s8/3VD1PvPo8pxlhiSKwRBFYorTXsLfPE66+i1/tC3C6r8Dt/58nIyxRBJYoAkuU8hr29Dxed81XvT622mzNncYISxSBJYrAEuV4X4LT/VNP98Za7QOw+/rZ+1czwhJFYIkisERpP+NgtL50dP1Tdw23ev/umrv7frf1+noywhJFYIkisER5vYuLjN17kEa65wVP76E63TdhRA3LVxNYoggsUa5fD7t6lmz356vndatr0ur7nT671ghLFIElisASZXtfgtkacPZ+s5+v7s/a3cdg9vmeVtcDn2aEJYrAEkVgiXLdGQe7z51a3fNVXeOu3r9b99qFESMsUQSWKAJLlPL1sMMvLF4vW91/ddbqnrLV+81+X/Xf88meLvhBYIkisETZvqfr6XSNNbJ7T9ju/q3dfQ/UsHw1gSWKwBIlbi3Baq+r6vW3p/swdPcNqF6fvMoISxSBJYrAEqW9hq2uSbv7l1b//PSeqdnnm+3nu5sRligCSxSBJcrHrYdd/f6R3X0Nqs9gGLl9LYYRligCSxSBJUr7OV3VTp/TVb2WIa0X1+k+CUZYoggsUQSWKO17uk6fQ7V7n//uPgmn52F3rzUwwhJFYIkisERpP6eruz/qqu6atNrpPWbd874jRliiCCxRBJYo29cSdL/7n71+9fMju8/erf7+030XnoywRBFYoggsUbbv6RrZveerer1n956o2/oc7GaEJYrAEkVgiXLdnq7qffyj60dOr6ddvV83awngFwJLFIElynXzsKtu20d/eo/X7XvEZhlhiSKwRBFYolw3Dzur+t3/6f6nt/XKOl0DPxlhiSKwRBFYomw/p2vV6bNaq9/dr9bY3TV397zxLCMsUQSWKAJLlPYa9qm75uqu0XbXdN018shtS02MsEQRWKIILFG217C7zZ6Ttfru/vSZC6PvO70+eJURligCSxSBJcrH1bCrNdvqPOys1bUJt/Uh6F5bYIQlisASRWCJsr2G3X3u1qzT/WK7e4utOr22wAhLFIElisASpb2Gvf3d9GrN2L3Hq/rdf/fzmYeFHwSWKAJLlI/rD8tnM8ISRWCJIrBEEViiCCxRBJYoAksUgSWKwBJFYIkisEQRWKIILFEEligCSxSBJYrAEkVgiSKwRPkPWT7LmXeavQIAAAAASUVORK5CYII=",
			addrqr: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKwAAACsCAYAAADmMUfYAAAABmJLR0QA/wD/AP+gvaeTAAAEaklEQVR4nO3dQW4jIRAF0PFo7n9lzzbqRRCiCvj2e9u4253kC5VoKF7v9/v9B0L8Pf0AMENgiSKwRBFYoggsUQSWKAJLFIElisASRWCJIrBEEViiCCxRBJYoAksUgSWKwBJFYIkisET5V33D1+tVfctfjbakPZ/n+fnRz2fN3m/17zX7+9z2/5llhCWKwBJFYIlSXsM+VdcwoxrsdM26+vnu5x1936ruGtkISxSBJYrAEqW9hn2arXG6a8zqmmv2eXfP+87eb2R3azYjLFEEligCS5TtNexps+/WZz8/e7/Z63fPM9/GCEsUgSWKwBLl62rY6vWq3fOe3etp0xhhiSKwRBFYomyvYXfPC47mKUc17er1s8/3VD1PvPo8pxlhiSKwRBFYorTXsLfPE66+i1/tC3C6r8Dt/58nIyxRBJYoAkuU8hr29Dxed81XvT622mzNncYISxSBJYrAEuV4X4LT/VNP98Za7QOw+/rZ+1czwhJFYIkisERpP+NgtL50dP1Tdw23ev/umrv7frf1+noywhJFYIkisER5vYuLjN17kEa65wVP76E63TdhRA3LVxNYoggsUa5fD7t6lmz356vndatr0ur7nT671ghLFIElisASZXtfgtkacPZ+s5+v7s/a3cdg9vmeVtcDn2aEJYrAEkVgiXLdGQe7z51a3fNVXeOu3r9b99qFESMsUQSWKAJLlPL1sMMvLF4vW91/ddbqnrLV+81+X/Xf88meLvhBYIkisETZvqfr6XSNNbJ7T9ju/q3dfQ/UsHw1gSWKwBIlbi3Baq+r6vW3p/swdPcNqF6fvMoISxSBJYrAEqW9hq2uSbv7l1b//PSeqdnnm+3nu5sRligCSxSBJcrHrYdd/f6R3X0Nqs9gGLl9LYYRligCSxSBJUr7OV3VTp/TVb2WIa0X1+k+CUZYoggsUQSWKO17uk6fQ7V7n//uPgmn52F3rzUwwhJFYIkisERpP6eruz/qqu6atNrpPWbd874jRliiCCxRBJYo29cSdL/7n71+9fMju8/erf7+030XnoywRBFYoggsUbbv6RrZveerer1n956o2/oc7GaEJYrAEkVgiXLdnq7qffyj60dOr6ddvV83awngFwJLFIElynXzsKtu20d/eo/X7XvEZhlhiSKwRBFYolw3Dzur+t3/6f6nt/XKOl0DPxlhiSKwRBFYomw/p2vV6bNaq9/dr9bY3TV397zxLCMsUQSWKAJLlPYa9qm75uqu0XbXdN018shtS02MsEQRWKIILFG217C7zZ6Ttfru/vSZC6PvO70+eJURligCSxSBJcrH1bCrNdvqPOys1bUJt/Uh6F5bYIQlisASRWCJsr2G3X3u1qzT/WK7e4utOr22wAhLFIElisASpb2Gvf3d9GrN2L3Hq/rdf/fzmYeFHwSWKAJLlI/rD8tnM8ISRWCJIrBEEViiCCxRBJYoAksUgSWKwBJFYIkisEQRWKIILFEEligCSxSBJYrAEkVgiSKwRPkPWT7LmXeavQIAAAAASUVORK5CYII="
		}
//		qrcode.toDataURL(ret.result, function(err, url){
//			obj.keyqr = url;
			
//			qrcode.toDataURL(addr, function(err, url){
//				obj.addrqr = url;
				
//				todump.push(obj);				
//				if(todump.length == id_len){
//					dealKeyDump(todump, res);			
//				}	
//			});
//		});
	
		todump.push(obj);
		if(todump.length == id_len){
			dealKeyDump(todump, res);			
		}
	});
}

/**
 * 进行文件生成和导出操作。
 */
function dealKeyDump(todump, res){	
	var path = process.cwd() + "/temp/download/";
	var fileName = sysconfig.getDateStr() +".pdf";
	
	var doc = new PDFDocument();	
	var writableStream = doc.pipe(fs.createWriteStream(path + fileName));	
	var x = 30; // pdf中的横坐标，即缩进。
	for(var i = 0, len = todump.length; i < len; i += 2){	
		if(i != 0){
			doc.addPage();
		}		
		var info1 = todump[i];
		var info2 = todump[i + 1];

		doc.moveTo(x, 40).lineTo(540, 40).stroke(); // text(sep, x, 40);
		doc.image(info1.addrqr, x, 50);
		doc.text("Address: " + info1.addr, 210, 120);

		doc.image(info1.keyqr, x, 190);
		doc.text("Key:" + info1.key, 210, 250);
		 
		doc.moveTo(x, 350).lineTo(540, 350).stroke();	

		if(info2 == null || info2 == undefined){
			break;
		}

		doc.image(info2.addrqr, x, 360);
		doc.text("Address: " + info2.addr, 210, 420);

		doc.image(info2.keyqr, x, 500);
		doc.text("Key:" + info2.key, 210, 560);
		   
		doc.moveTo(x, 660).lineTo(540, 660).stroke();		
	}
	doc.end();

	writableStream.on("finish", function(){	
		res.setHeader("Content-disposition", "attachment; filename=" + fileName);
		res.setHeader("Content-type", "application/pdf");
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

		// 删除生成的各个二维码文件。

	});
}

/**
 * 钱包导出。
 */
router.post("/backup", function(req, res, next){
	if(!sysconfig.isInit || rpc == null){
		res.redirect("/");
		return true;
	}	
	
	// 检查并创建temp目录。
	var path = process.cwd() + "/temp/download";
    if(!fs.existsSync(path)){
		fs.mkdirSync(path);
		console.log("创建临时目录：" + path);
	}
	var fileName = sysconfig.config.host + "_" + sysconfig.getDateStr() + ".data";
	console.log("备份名称：" + fileName);

	// backupWallet成功备份后返回{result:null, error:null, id:null}。
	rpc.backupWallet(path + fileName, function(err, ret){
		if(err){			
			sysconfig.isInit = false;
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
		title: sysconfig.title,
		from: "import",
		result: false
	};
	if(!sysconfig.isInit || rpc == null){
		result.message = "needinit";
		res.render("result", result);
		return true;
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
		rpc.importWallet(uploadPath, function(err, ret){
			if(err){			
				sysconfig.isInit = false;
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
