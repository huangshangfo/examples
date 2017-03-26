
var mainEl = document.getElementById('test');
var chart = echarts.init(mainEl);
var colorList = [
	'#c23531', '#2f4554', '#61a0a8',
	'#d48265', '#91c7ae', '#749f83',
	'#ca8622', '#bda29a', '#6e7074',
	'#546570', '#c4ccd3'
];

var data = [
	{ value: 535, name: 'Chrome' },
	{ value: 310, name: 'Firefox' },
	{ value: 234, name: 'Safari' },
	{ value: 235, name: 'IE9+' },
	{ value: 1035, name: 'IE8' },
	{ value: 1305, name: 'IE7' },
	{ value: 948, name: 'IE6-' }
];
var legendData = [];

echarts.util.each(data, function(item, index) {
	item.itemStyle = {
		normal: { color: colorList[index] }
	};
	legendData.push(item.name);
});

chart.setOption({
	title: {
		text: "浏览器占比",
		x: 'center'
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
		left: 'left',
		feature: {
			dataView: {},
			saveAsImage: {}
		}
	},
	tooltip: {
		trigger: 'item',
		formatter: "{a} <br/>{b} : {c} ({d}%)"
	},
	series: [{
		name: '浏览器占比',
		type: 'pie',
		radius: ['30%', '70%'],
		selectedMode: 'single',
		selectedOffset: 30,
		clockwise: true,
		label: {
			normal: {
				textStyle: {
					fontSize: 18,
					color: '#333'
				}
			}
		},
		labelLine: {
			normal: {
				lineStyle: {
					color: '#333'
				}
			}
		},
		data: data
	}]
});

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