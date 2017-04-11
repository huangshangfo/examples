$(function() {
	getCheckedValues();
	$(".progress-ra").attr("data-original-title", '25%');
	$(".progress-ha").attr("data-original-title", '50%');
	$(".progress-gd").attr("data-original-title", '75%');

	$('.progress-bar').progressbar({
		display_text: 'fill'
	});
})

$("[name='indicator']").click(function() {
	getCheckedValues();
})

//获取复选框中选中的值
function getCheckedValues() {
	var chkbs = document.getElementsByName("indicator");
	var str = "";
	for(i = 0; i < chkbs.length; i++) {
		var onChkb = chkbs[i];
		if(onChkb.checked == true) {
			if(str == "") {
				str += onChkb.value;
			} else {
				str += "," + onChkb.value;
			}
		}

	}
	console.log(str);

}

function getCompanys() {

}

//日期选择
$('.form_datetime').datetimepicker({
	format: 'yyyy-mm-dd',
	autoclose: true,
	startView: 2,
	minView: 2,
	startDate: '2016-10-01',
	endDate: '2016-10-31',
	forceParse: false,
	language: 'zh-CN'
});

var map = new BMap.Map("show-map");
map.centerAndZoom(new BMap.Point(116.404, 39.915), 11); // 初始化地图,设置中心点坐标和地图级别
map.addControl(new BMap.MapTypeControl()); //添加地图类型控件
map.setCurrentCity("北京"); // 设置地图显示的城市 此项是必须设置的
map.enableScrollWheelZoom(true); //开启鼠标滚轮缩放