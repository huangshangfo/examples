/*基础数据*/
var vehicle_num = [9912, 9444, 9109, 9612];
var record_num = [60073, 65131, 73459, 87382];
var contract_num = [54717, 59744, 66899, 78717];

$(function() {
	// Set up the chart
	var chart = new Highcharts.Chart({
		chart: {
			renderTo: 'base-container',
			type: 'column',
			backgroundColor: 'transparent',
			options3d: {
				enabled: true,
				alpha: 10,
				beta: 10,
				depth: 60,
				viewDistance: 25
			}
		},
		title: {
			text: '基础数据'
		},
		subtitle: {
			text: '各月份上传数据情况'
		},
		xAxis: {
			categories: ['2016.08', '2016.09', '2016.10', '2016.11']
		},
		yAxis: {
			allowDecimals: false,
			min: 0,
			title: {
				text: '数量'
			}
		},
		tooltip: {
			headerFormat: '<b>{point.key}</b><br>',
			pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: {point.y}'
		},
		plotOptions: {
			column: {
				depth: 40
			}
		},
		series: [{
			name: '车辆数',
			data: vehicle_num,
		}, {
			name: '合同数',
			data: contract_num,
		}, {
			name: '备案数',
			data: record_num,
		}]
	});

	function showValues() {
		$('#alpha-value').html(chart.options.chart.options3d.alpha);
		$('#beta-value').html(chart.options.chart.options3d.beta);
		$('#depth-value').html(chart.options.chart.options3d.depth);
	}
	// Activate the sliders
	$('#sliders input').on('input change', function() {
		chart.options.chart.options3d[this.id] = this.value;
		showValues();
		chart.redraw(false);
	});
	showValues();
});

/*GPS数据*/
//日期选择
$('.form_datetime').datetimepicker({
	format: 'yyyy-mm',
	autoclose: true,
	startView: 3,
	minView: 3,
	startDate: '2016-08',
	endDate: '2016-11',
	forceParse: false,
	language: 'zh-CN'
});

//显示南丁尔图
var mainEl = document.getElementById('gps-pie');
var chart = echarts.init(mainEl);
var colorList = [
	'#c23531', '#2f4554', '#61a0a8'
];

var data8 = [
	{ value: 666, name: '分时租赁' },
	{ value: 780, name: '短租' },
	{ value: 987, name: '长租' }
]
var data9 = [
	{ value: 506, name: '分时租赁' },
	{ value: 570, name: '短租' },
	{ value: 984, name: '长租' }
]
var data10 = [
	{ value: 692, name: '分时租赁' },
	{ value: 571, name: '短租' },
	{ value: 1339, name: '长租' }
]
var data11 = [
	{ value: 529, name: '分时租赁' },
	{ value: 500, name: '短租' },
	{ value: 1289, name: '长租' }
]

function copy(originData) {
	var copy = [];
	for(i = 0; i < 3; i++) {
		val = originData[i].value;
		na = originData[i].name;
		copy.push({ value: val, name: na });
	}
	return copy;
}
var data = copy(data8);
var legendData = [];
echarts.util.each(data, function(item, index) {
	item.itemStyle = {
		normal: { color: colorList[index] }
	};
	legendData.push(item.name);
});
optionGPS = {
	title: {
		text: 'GPS数据',
		subtext: '各类型租赁车上传GPS量',
		x: 'center'
	},
	tooltip: {
		trigger: 'item',
		formatter: "{a} <br/>{b} : {c} ({d}%)"
	},
	legend: {
		orient: 'vertical',
		left: '10%',
		top: '20%',
		data: legendData,
		formatter: function(name) {
			return name.replace(/\n/g, ' + ');
		}
	},
	toolbox: {
		show: true,
		feature: {
			mark: { show: true },
			myTool2: {
				show: true,
				title: '还原',
				icon: 'image://img/restore.png',
				onclick: function() {
					data = getData();
					echarts.util.each(data, function(item, index) {
						item.itemStyle = {
							normal: { color: colorList[index] }
						};
						legendData.push(item.name);
					});
					chart.setOption({
						legend: { data: legendData },
						series: [{ data: data }]
					});
				}
			},
			magicType: {
				show: true,
				type: ['pie', 'funnel']
			},
			saveAsImage: { show: true }
		}
	},
	calculable: true,
	series: [{
			name: 'GPS数据量',
			type: 'pie',
			center: ['65%', '50%'],
			radius: [20, 110],
			selectedMode: 'single',
			selectedOffset: 30,
			roseType: 'radius',
			label: {
				normal: {
					show: true,
					position: 'inner'
				},
				emphasis: {
					show: true
				}
			},
			lableLine: {
				normal: {
					show: false
				},
				emphasis: {
					show: true
				}
			},
			data: data
		}

	]
};
chart.setOption(optionGPS);

//根据月份获取数据
function getData() {
	var nowData;
	var month = parseInt($('#text-month').val().split("-")[1]);
	switch(month) {
		case 8:
			nowData = copy(data8);
			break;
		case 9:
			nowData = copy(data9);
			break;
		case 10:
			nowData = copy(data10);
			break;
		case 11:
			nowData = copy(data11);
			break;
		default:
			nowData = copy(data8);
			break;
	}
	return nowData;
}

//选取月份
$('#text-month').change(function() {
	data = getData();
	echarts.util.each(data, function(item, index) {
		item.itemStyle = {
			normal: { color: colorList[index] }
		};
		legendData.push(item.name);
	});
	chart.setOption({
		legend: { data: legendData },
		series: [{ data: data }]
	});
})

//拖曳重计算
var dragging;
var draggingDataIndex;
var dx;
var dy;
var zr = chart.getZr();

chart.on('mousedown', function(params) {
	draggingDataIndex = getHoveredDataIndex(params);
	if(draggingDataIndex != null) {

		var srcSector = params.event.target;
		dragging = new echarts.graphic.Sector({
			shape: echarts.util.extend({}, srcSector.shape),
			style: {
				fill: srcSector.style.fill,
				opacity: 0.5
			},
			silent: true,
			z: 10000
		});

		dx = params.event.offsetX - srcSector.shape.cx;
		dy = params.event.offsetY - srcSector.shape.cy;

		zr.add(dragging);
	}
});

chart.on('mouseup', function(params) {
	if(dragging) {
		var targetDataIndex = getHoveredDataIndex(params);
		if(targetDataIndex != null &&
			targetDataIndex !== draggingDataIndex
		) {
			data[targetDataIndex].value += data[draggingDataIndex].value;
			data[targetDataIndex].name += '\n' + data[draggingDataIndex].name;
			legendData[targetDataIndex] = data[targetDataIndex].name;
			data.splice(draggingDataIndex, 1);
			legendData.splice(draggingDataIndex, 1);
			chart.setOption({
				legend: { data: legendData },
				series: { data: data }
			});
		}
	}
});

mainEl.addEventListener('mousemove', function(e) {
	var box = mainEl.getBoundingClientRect();
	var zrX = e.clientX - box.left;
	var zrY = e.clientY - box.top;

	if(dragging) {
		dragging.setShape({
			cx: zrX - dx,
			cy: zrY - dy
		});
	}
});

document.addEventListener('mouseup', function(e) {
	if(dragging) {
		zr.remove(dragging);
		dragging = null;
	}
});

function getHoveredDataIndex(params) {
	return params.componentType === 'series' &&
		params.componentSubType === 'pie' &&
		params.dataIndex;
}
window.onresize = chart.resize;

var dom = document.getElementById('timeline-data');
var myChart = echarts.init(dom);

optionChange = null;
var base = +new Date(2014, 9, 3);
var oneDay = 24 * 3600 * 1000;
var date = [];

var testData = [Math.random() * 150];
var now = new Date(base);

function addData(shift) {
    now = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/');
    date.push(now);
    testData.push((Math.random() - 0.4) * 10 + testData[testData.length - 1]);

    if (shift) {
        date.shift();
        testData.shift();
    }

    now = new Date(+new Date(now) + oneDay);
}

for (var i = 1; i < 30; i++) {
    addData();
}

optionChange = {
	title: {
		text: 'GPS数据随时间变化曲线',
		x: 'center'
	},
    tooltip: {
        show: true,
        trigger: 'axis'
    },
    toolbox:{
    	show: true,
    	feature: {
    		saveAsImage: { show: true }
    	}
    },
    xAxis: {
        type: 'category',
        boundaryGap: false,
        data: date
    },
    yAxis: {
        boundaryGap: [0, '50%'],
        scale: true,
        type: 'value'
    },
    series: [
        {
            name:'测试',
            type:'line',
            smooth:false,
            symbol: 'none',
            stack: null,
            data: testData
        }
    ]
};

setInterval(function () {
    addData(true);
    myChart.setOption({
        xAxis: {
            data: date
        },
        series: [{
            name:'成交',
            data: testData
        }]
    });
}, 1000);;
if (optionChange && typeof optionChange === "object") {
    myChart.setOption(optionChange, true);
}

window.onresize = myChart.resize;