var crypto = require('crypto');
var Bip38 = require("bip38");

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

/**
 * 获取客户端IP。
 */
function getClientIp(req) {
    var ipAddress;
    var forwardedIpsStr = req.header('x-forwarded-for'); 
    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
};

/**
 * AES256进行加密。
 */
function aes256Encrypt(content, password){
	var result = {
		"cipher": "aes", 
		"ks": 256, 
		"mode": "ecb", 
		"code": "hex",
		"encrypted": ""
	};

	var cipher = crypto.createCipher("aes-256-ecb", password);
	var crypted = cipher.update(content, "utf8", "hex");
	crypted += cipher.final("hex");
	
	result.encrypted = crypted;
	return result;
}

/**
 * AES256进行解密。
 */
function aes256Decipher(encrypted, password){
	var decipher = crypto.createDecipher("aes-256-ecb", password);
	var decrypted = decipher.update(encrypted, "hex", "binary");
	decrypted += decipher.final("binary");
	return decrypted;
}

/**
 * 使用addr和pass生成Bip38格式的key。
 */
function getBip38Key(key, addr, pass){
	var bip38 = new Bip38();
	var encrypted = bip38.encrypt(key, pass, addr);

	var result = {
		"cipher": "bip38", 
		"encrypted": encrypted
	};
	return result;
}

/**
 * 使用pass对key进行加密。isBip38为1时生成Bip38格式，否则只进行AES加密。
 */
function encryptKey(key, addr, pass, isBip38){
	if(isBip38 == 1 || isBip38 == "1"){
		return getBip38Key(key, addr, pass);
	} else {
		return aes256Encrypt(key, pass);
	}
}

module.exports = {
	getDateStr: getDateStr,
	getClientIp: getClientIp,
	encryptKey: encryptKey
};