/**********************租赁时长特征************************/
rtlOption={
	title: {
        text: '租赁时长',
        x:'center'
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
        x:'10%',
        y:10
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
        itemStyle:{
        	normal:{
        		color: '#3398DB'
        	}
        }
    	},{
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
            	color:'#C4383F',
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
        subtext:'长租类型车辆租赁时长统计图',
    },
    xAxis:[{
    	data:changzuXAis
    }],
    yAxis: [{
    }, {
        min: 0,
        max: 4500,
        interval:500,
    }],
    series:[{
    	data:changzuContract
    },{
    	data:changzuPercentage
    }]
})

/******短租租赁时长******/
var rtlDuanZuChart = echarts.init(document.getElementById('rtl-duanzu'));
rtlDuanZuChart.setOption(rtlOption);
rtlDuanZuChart.setOption({
	title: {
        subtext:'短租类型车辆租赁时长统计图',
    },
    xAxis:[{
    	data:duanzuXAis
    }],
    series:[{
    	data:duanzuContract
    },{
    	data:duanzuPercentage
    }]
});

/******分时租赁时长******/
var rtlFenShiChart = echarts.init(document.getElementById('rtl-fenshi'));
rtlFenShiChart.setOption(rtlOption);
rtlFenShiChart.setOption({
	title: {
        subtext:'短租类型车辆租赁时长统计图',
    },
    xAxis:[{
    	data:fenshiXAis
    }],
    series:[{
    	data:fenshiContract
    },{
    	data:fenshiPercentage
    }]
});
window.onresize = function(){
	rtlChangZuChart.resize();
	rtlDuanZuChart.resize();
	rtlFenShiChart.resize();
}