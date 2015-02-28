// 验证页码参数。
function validate(){
   var rpcuser = $("#rpcuser");
   var rpcpassword = $("#rpcpassword");
   var rpcport = $("#rpcport");   
   
   if($.trim(rpcuser.val()).length == 0){	   
	   alert("请输入RPC用户名！"); rpcuser.focus(); return false;
   }
   if($.trim(rpcpassword.val()).length == 0){	   
	   alert("请输入RPC密码！"); rpcpassword.focus(); return false;
   }   
   if($.trim(rpcport.val()).length == 0){	   
	   alert("请输入RPC端口！"); rpcport.focus(); return false;
   }
   return true;
}

// 验证页面参数，调用初始化功能。
function getInitInfo(){
   if(!validate()){
	   return false;
   }
   $.post("/init", {rpcuser: $("#rpcuser").val(), rpcpassword: $("#rpcpassword").val(), 
	   rpcip: $("#rpcip").val(), rpcport: $("#rpcport").val()}, function(data){
			var initInfo = eval("(" + data + ")");
		    if(initInfo.result == "true"){
				window.location.href = "/home";
				return true;
			}
			var message = initInfo.resInfo;
			if(message == "paramneed"){
			   alert("参数缺失，请提供所需要的数据！");
			} else if(message == "error"){
			   alert("初始化失败，请检查客户端是否启动并确认各项参数是否正确！");
			}
	   });
}

// 从系统中获取一个新的钱包和私钥。
function getNewWallet(){
	$("#showWallet").html("");
	$.get("/newallet", function(data){
		var walletInfo = eval("(" + data + ")");
		if(walletInfo.result == "true"){
			var text = "钱包地址：" + walletInfo.address + "<br />";
			text += "钱包密钥：" + walletInfo.privkey;
			$("#showWallet").html(text);	
			return true;
		}			
		var message = walletInfo.resInfo;
		if(message == "needInit"){
			alert("信息获取失败，请检查客户端是否启动并重新连接！");
			window.location = "/";
			return false;
		}
	});
}

// 页面初始化或刷新后的动作。
function init(){
	var isSelected = $("#exportPassed");
	if(isSelected.length != 0 && isSelected.get(0).checked){		
		$("#passLabel").show();
		$("#passText").show();
	} else {
		$("#passLabel").hide();
		$("#passText").hide();
	}
}

$(function(){
	init();

	// 首页初始化按钮。
	$("#getInitInfoBtn").click(function(){
		getInitInfo();
		return false;
	});
	
	// 处理home页中的切换功能。
	$("a[data-toggle='collapseCustom']").click(function(){
		var targetId = $(this).attr("aria-controls");
		var target = $("#" + targetId);
		target.addClass("in").siblings().removeClass("in");		
		return false;
	});

	// 钱包页面全选checkbox的处理。
	$("#selectAll").click(function(){
		var flag = this.checked;
		var selected = $("input:checkbox[name='walletIdSel']");
		$.each(selected, function(i, item){
			this.checked = flag;
		});				
	});
	// 每个钱包的选择checkbox的点击事件，处理全选checkbox的联动。
	$("input:checkbox[name='walletIdSel']").click(function(){		
		var flag = this.checked;
		if(flag){				
			var selected = $("input:checkbox[name='walletIdSel']");
			for(var i = 0, len = selected.length; i < len; i ++){
				if(!selected[i].checked){
					flag = false;
					break;
				}
			}			
		}		
		var allSel = $("#selectAll");
		allSel.get(0).checked = flag;
	});

	// 导出时“加密”复选框的点击事件。
	$("#exportPassed").click(function(){		
		if(this.checked){
			$("#passLabel").show();
			$("#passText").show();
		} else {
			$("#passLabel").hide();
			$("#passText").hide();
		}
	});

	// “导出已选”链接的功能。
	$("#seledToExport").click(function(){
		var selected = $("input:checkbox[name='walletIdSel']:checked");
		if(selected.length == 0){
			alert("请先选择要导出的钱包！"); return false;
		}
		var isSelected = $("#exportPassed").get(0).checked;
		var passText= $("#passText");
		if(isSelected){			
			if($.trim(passText.val()).length == 0){
				alert("请先输入加密用的密码！"); passText.focus(); return false;
			}
			$("#passHidden").val($.trim(passText.val()));
		} else {
			$("#passHidden").val("");
		}
		var ids = [];
		$.each(selected, function(i, item){
			ids.push(item.value);
		});
		$("#idsSelected").val(ids.join(","));
		$("#exportSelWallet").submit();
		return false;
	});

	// “获取新的私钥和地址”的链接。
	$("#getNewWalletBtn").click(function(){
		getNewWallet();
		return false;
	});
});
