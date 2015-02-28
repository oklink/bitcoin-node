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

module.exports = {
	getDateStr: getDateStr,
	getClientIp: getClientIp
};