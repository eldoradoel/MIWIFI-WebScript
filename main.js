// ==UserScript==
// @name         小米路由器增强脚本
// @namespace    https://www.pupuplay.xyz/
// @version      1.0.0
// @description  增加管理页面缺失数据
// @author       MINIO
// @include      /http:\/\/.*?\/cgi-bin\/luci\/;stok.*/
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

let token, jQuery, uw = unsafeWindow;
let deviceLock, totalLock = false;

function boot() {
	let pathName = location.pathname;

	if (/\/web\/home/.test(pathName)) {
		initHomePage();
		initEventLoop();
	}
}

function getToken() {
	if (!token)
		token = /;stok=([\da-f]+)/.exec(location.href) && RegExp.$1;

	return token;
}

function initHomePage() {
	// 替换模板
	let devicesItemTmpl = document.querySelector("#tmpldevicesitem");
	devicesItemTmpl.innerHTML =
		'\
	<tr class="device-item" data-mac="{$mac}">\
	<td>\
	<img class="dev-icon" width="60" src="{$devices_icon}" onerror="this.src=\'/img/device_list_error.png\'">\
	<div class="dev-info">\
	<div class="name">{$name} &nbsp;&nbsp;{if($isself)}<span class="muted">|&nbsp;本机</span>{/if}</div>\
	<ul class="devnetinfo clearfix">\
	<li><span class="k">已连接:</span> <span class="v online-time">{$online}</span></li>\
	<li>{for(var i=0, len=$ip.length; i<len; i++)}<p data-ip="{$ip[i]}"><span class="k">IP地址:</span> <span class="v">{$ip[i]}</span></p>{/for}</li>\
	<li><span class="k">MAC地址:</span> <span class="v">{$mac}</span></li>\
	</ul>\
	</div>\
	</td>\
	{if($d_is_ap != 8)}<td class="option">{$option}</td>{/if}\
	{if($d_is_ap == 8)}<td class="option_d01"></td>{/if}\
	{if($hasDisk)}<td class="option2">{$option2}</td>{/if}\
	</tr>';
}

function initEventLoop() {
	if (location.hash === '#devices') {
		refreshDeviceSpeed();
		refreshTotalSpeed();
	}
	if (location.hash === '#router') {
		refreshTotalSpeed();
	}
	setTimeout(initEventLoop, 1000);
}

function showDeviceSpeed(data) {
	let needFullReload = false;

	data.list.forEach((item) => {
		if (item.statistics) {
			let mac = item.mac;
			let tr = uw.$(`tr.device-item[data-mac='${mac}']`);
			if (!tr) {
				needFullReload = true;
				return;
			}

			let title = tr.find("div.name");
			let upspeed = uw.byteFormat(+item.statistics.upspeed, 100) + '/S';
			let downspeed = uw.byteFormat(+item.statistics.downspeed, 100) + '/S';
			let online = jQuery.secondToDate(+item.statistics.online);
			let ups = title.find('.up-speed');
			if (ups.length) {
				ups.html(upspeed);
				title.find('.down-speed').html(downspeed);
			} else {
				let speedTmpl = `<sub>↑<span style='color:red;' class='up-speed'>${upspeed}</span> ↓<span style='color:blue;' class='down-speed'>${downspeed}</span></sub>`;
				title.append(speedTmpl);
			}
			tr.find('.online-time').html(online);
		}
	});

	if (needFullReload) {
		console.log('发现新设备，需要完全重新加载.');
		jQuery.pub('devices:getlist');
	}
}

function showTotalSpeed(data) {
	let total = jQuery("div.total-speed");
	if (!total.length) {
		jQuery("#bd").prepend("<div class=\"total-speed\" style='padding: 10px 0;margin-bottom: -40px;font-size: 130%;color: #0a6f15;'>总速度: ↑<span\
        style='color:red;' class='up'>--</span> ↓<span style='color:blue;' class='down'>--</span> 最大速度: ↑<span\
        style='color:red;' class='maxup'>--</span> ↓<span style='color:blue;' class='maxdown'>--</span> 流量统计: ↑<span\
        style='color:red;' class='totalup'>--</span> ↓<span style='color:blue;' class='totaldown'>--</span></div>");
		total = jQuery("div.total-speed");
	}
	total.find('.up').html(uw.byteFormat(+data.wan.upspeed, 100) + "/S");
	total.find('.down').html(uw.byteFormat(+data.wan.downspeed, 100) + "/S");
	total.find('.maxup').html(uw.byteFormat(+data.wan.maxuploadspeed, 100) + "/S");
	total.find('.maxdown').html(uw.byteFormat(+data.wan.maxdownloadspeed, 100) + "/S");
	total.find('.totalup').html(uw.byteFormat(+data.wan.upload, 100) + "/S");
	total.find('.totaldown').html(uw.byteFormat(+data.wan.download, 100) + "/S");
}

function refreshDeviceSpeed() {
	if (deviceLock)
		return;
	deviceLock = true;

	let api = `/cgi-bin/luci/;stok=${getToken()}/api/misystem/devicelist`;
	jQuery.getJSON(api, {}).done(function (data) {
		if (data.code !== 0)
			return;

		showDeviceSpeed(data);
	}).fail(function () {
		setTimeout(refreshDeviceSpeed, 1000);
	}).always(function () {
		deviceLock = false;
	});
}

function refreshTotalSpeed() {
	if (totalLock)
		return;
	totalLock = true;

	let api = `/cgi-bin/luci/;stok=${getToken()}/api/misystem/status`;
	jQuery.getJSON(api, {}).done(function (data) {
		if (data.code !== 0)
			return;

		showTotalSpeed(data);
	}).fail(function () {
		setTimeout(refreshTotalSpeed, 1000);
	}).always(function () {
		totalLock = false;
	});
}


(function () {
	let val, inited;

	Object.defineProperty(unsafeWindow, "jQuery", {
		get: function () {
			return val;
		},
		set: function (v) {
			val = v;
			jQuery = v;
			if (!inited) {
				inited = true;
				boot();
			}
		},
	});
})();
