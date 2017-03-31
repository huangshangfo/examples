/**********************租赁时长特征************************/
rtlOption = {
	title: {
		text: '租赁时长',
		x: 'center'
	},
	tooltip: {
		trigger: 'axis'
	},
	toolbox: {
		feature: {
			restore: {
				show: true
			},
			saveAsImage: {
				show: true
			}
		}
	},
	legend: {
		data: ['累计占比', '合同数'],
		x: '10%',
		y: 10
	},
	xAxis: [{
		type: 'category',
		axisTick: {
			alignWithLabel: true
		}
	}],
	yAxis: [{
		type: 'value',
		name: '累计占比',
		position: 'right',
		splitLine: false,
		axisLabel: {
			formatter: '{value} %'
		}
	}, {
		type: 'value',
		name: '合同数',
		position: 'left'
	}],
	series: [{
		name: '合同数',
		type: 'bar',
		yAxisIndex: 1,
		itemStyle: {
			normal: {
				color: '#3398DB'
			}
		}
	}, {
		name: '累计占比',
		type: 'line',
		stack: '合同数',
		label: {
			normal: {
				show: true,
				position: 'top',
			}
		},
		lineStyle: {
			normal: {
				color: '#C4383F',
				width: 3,
				shadowColor: 'rgba(0,0,0,0.4)',
				shadowBlur: 10,
				shadowOffsetY: 10
			}
		}
	}, ]
};

/******长租租赁时长******/
var rtlChangZuChart = echarts.init(document.getElementById('rtl-changzu'));
rtlChangZuChart.setOption(rtlOption);
rtlChangZuChart.setOption({
	title: {
		subtext: '长租类型车辆租赁时长统计图',
	},
	xAxis: [{
		data: changzuXAis
	}],
	yAxis: [{}, {
		min: 0,
		max: 4500,
		interval: 500,
	}],
	series: [{
		data: changzuContract
	}, {
		data: changzuPercentage
	}]
})

/******短租租赁时长******/
var rtlDuanZuChart = echarts.init(document.getElementById('rtl-duanzu'));
rtlDuanZuChart.setOption(rtlOption);
rtlDuanZuChart.setOption({
	title: {
		subtext: '短租类型车辆租赁时长统计图',
	},
	xAxis: [{
		data: duanzuXAis
	}],
	series: [{
		data: duanzuContract
	}, {
		data: duanzuPercentage
	}]
});

/******分时租赁时长******/
var rtlFenShiChart = echarts.init(document.getElementById('rtl-fenshi'));
rtlFenShiChart.setOption(rtlOption);
rtlFenShiChart.setOption({
	title: {
		subtext: '短租类型车辆租赁时长统计图',
	},
	xAxis: [{
		data: fenshiXAis
	}],
	series: [{
		data: fenshiContract
	}, {
		data: fenshiPercentage
	}]
});

/**********************使用强度特征************************/

/********柱状图*********/
useIntensityBarOption = {
	title: {
		text: '使用强度',
		x: 'center'
	},
	tooltip: {
		trigger: 'axis',
		axisPointer: {
			type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
		}
	},
	toolbox: {
		feature: {
			myBar: {
				show: true,
				title: '切换为柱状图',
				icon: 'image://img/bar.png',
				onclick: changeToBar
			},
			myPie: {
				show: true,
				title: '切换为饼图',
				icon: 'image://img/pie.png',
				onclick: changeToPie
			},
			restore: {
				show: true
			},
			saveAsImage: {
				show: true
			}
		}
	},
	legend: {
		data: ['长租', '短租', '分时'],
		itemGap: 5,
		x: 'left',
		y: 10
	},
	grid: {
		left: '5%',
		right: '4%',
		bottom: '5%',
		containLabel: true
	},
	xAxis: [{
		type: 'category',
		data: useIntensityXAis
	}],
	yAxis: [{
		type: 'value',
		name: '车辆数/辆',
		axisLabel: {
			formatter: '{value}'
		}
	}],
	series: [{
		name: '长租',
		type: 'bar',
	}, {
		name: '短租',
		type: 'bar',
	}, {
		name: '分时',
		type: 'bar',
	}]
};

/********饼图*********/
var showCenter=0;
useIntensityPieOption = {
	title: {
		text: '使用强度',
		subtext: '各模式日出行次数占比（工作日）',
		x: 'center'
	},
	tooltip: {
		trigger: 'item',
		formatter: "{a} <br/>{b} : {c} ({d}%)"
	},
	toolbox: {
		show: true,
		x: 500,
		feature: {
			myBar: {
				show: true,
				title: '切换为柱状图',
				icon: 'image://img/bar.png',
				onclick: changeToBar
			},
			myPie: {
				show: true,
				title: '切换为饼图',
				icon: 'image://img/pie.png',
				onclick: changeToPie
			},
			restore: {
				show: true
			},
			saveAsImage: {
				show: true
			}
		}
	},
	legend: {
		orient: 'vertical',
		x: 10,
		y:'15%',
		data: useIntensityXAis,
	},
	series: [{
			name: '长租',
			type: 'pie',
			radius: ['10%','30%'],
			center: ['30%', '60%'],
			label: {
				normal: {
					show: false,
					position: 'outside',
				},
				emphasis: {
					show: true
				}
			},
			data: pieWeekdayChangzu,
			itemStyle: {
				emphasis: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			}
		},
		{
			name: '短租',
			type: 'pie',
			radius: ['10%','30%'],
			center: ['50%', '35%'],
			label: {
				normal: {
					show: false,
					position: 'outside'
				},
				emphasis: {
					show: true
				}
			},
			data: pieWeekdayDuanzu,
			itemStyle: {
				emphasis: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			}
		},
		{
			name: '分时',
			type: 'pie',
			radius: ['10%','30%'],
			center: ['70%', '60%'],
			label: {
				normal: {
					show: false,
					position: 'outside'
				},
				emphasis: {
					show: true
				}
			},
			data: pieWeekdayFenshi,
			itemStyle: {
				emphasis: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			}
		}
	]
};

var useIntensityWeekdayChart = echarts.init(document.getElementById('useIntensity-weekday'));
var useIntensityWeekendChart = echarts.init(document.getElementById('useIntensity-weekend'));

changeToBar(); //首先画柱状图

//转为柱状图图
function changeToBar() {
	useIntensityWeekdayChart.clear();
	useIntensityWeekdayChart.setOption(useIntensityBarOption);
	useIntensityWeekdayChart.setOption({
		title: {
			subtext: '各模式日出行次数分布（工作日）'
		},
		series: [{
			data: weekdayChangzu
		}, {
			data: weekdayDuanzu
		}, {
			data: weekdayFenshi
		}]
	});
	useIntensityWeekendChart.clear();
	useIntensityWeekendChart.setOption(useIntensityBarOption);
	useIntensityWeekendChart.setOption({
		title: {
			subtext: '各模式日出行次数分布（双休日）'
		},
		series: [{
			data: weekendChangzu
		}, {
			data: weekendDuanzu
		}, {
			data: weekendFenshi
		}]
	});
}

//转为饼图
function changeToPie() {
	//转换为饼图
	useIntensityWeekdayChart.clear();
	useIntensityWeekdayChart.setOption(useIntensityPieOption);
	useIntensityWeekendChart.clear();
	useIntensityWeekendChart.setOption(useIntensityPieOption);
	useIntensityWeekendChart.setOption({
		title: {
			subtext: '各模式日出行次数占比（双休日）'
		},
		series: [{
			data: pieWeekendChangzu
		}, {
			data: pieWeekendDuanzu
		}, {
			data: pieWeekendFenshi
		}]
	});
}

window.onresize = function() {
	rtlChangZuChart.resize();
	rtlDuanZuChart.resize();
	rtlFenShiChart.resize();
}