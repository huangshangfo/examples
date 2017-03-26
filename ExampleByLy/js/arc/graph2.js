		var width = screen.width, height = 600, pad = 0, left_pad = 0,sc_height=1000,rec_height=200;
		var x = d3.scale.ordinal().rangeRoundBands([left_pad, 1500 - pad],0.3);
		var y = d3.scale.linear().range([rec_height-pad, pad]);
		var xAxis = d3.svg.axis().scale(x).orient("bottom");
		var yAxis = d3.svg.axis().scale(y).orient("left");
		var svg = d3.select("#graph2-graph").append("svg").attr("width", "100%").attr('height',1000).attr("viewBox", "0 0 1500 600");
		var data = getSum(flowtest);
		//var data = getSum(matrix);
		
		//var link_arrays = getLinkArrays(matrix);

		var links = getLinks(flowtest);
		
		console.dir(links);
		console.dir(data);
		
		
		var fill  = ['#0099cc'];
		var div = d3.select("body").append("div")
				    .attr("class", "tooltip")
				    .style("opacity", 1e-6);
		x.domain(data.map(function(d,i){return i}));
		y.domain([0, d3.max(data, function (d) { return d; })]);

		//$('.tip-right').pin({containerSelector: "#graph2"});
		/*svg.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0, "+(height-pad)+")")
			.call(xAxis);*/
		/*svg.append("g")
			.attr("class", "axis")
			.attr("transform", "translate("+(left_pad-pad)+", 0)")
			.call(yAxis);*/
			
		//每个站画矩形
		svg.selectAll('rect')
			.data(data)
			.enter()
			.append('rect')
			.style('fill','#0099cc')
			.attr('class', 'bar')
			.attr('x', function (d,i) { return x(i); })
			.attr('width', x.rangeBand())
			.attr('y', function (d) { return height-pad; })
			.transition()
			.delay(function (d,i) { return i*10; })

			.duration(800)
			.style('fill',function(d,i){
				return '#0099cc';
			})
			.attr('y',  function (d) { return height-pad; })
			.attr('height', function (d) { return (rec_height-pad - y(d))/2; });
		var arc = d3.svg.arc()
				  .innerRadius(function(d,i){return (x(d.x2)-x(d.x1))/2; })
				  .outerRadius(function(d,i){return (x(d.x2)-x(d.x1))/2+1;}) 
				  .startAngle(-Math.PI/2)
				  .endAngle(Math.PI/2)
		svg.selectAll('path')
			.data(links)
			.enter()
			.append('path')
			.attr('class','arc')
			.attr('transform',function(d){return 'translate('+((x(d.x1)+x(d.x2))/2)+','+(height-pad)+')';})
			.attr("d", arc);
		d3.selectAll('.bar').on('mouseover',function(d,i){
			d3.select(this).style('fill',d3.rgb('#0099cc').brighter(1));
			 div.transition()
		      .duration(500)
		      .style("opacity", 0.8);

			}).on('mousemove',function(d,i){



			 div
		      .text(zones[i])
		      .style("left", (d3.event.pageX - 34) + "px")
		      .style("top", (d3.event.pageY - 12) + "px");
		}).on('mouseout',function(d,i){
			d3.select(this).style('fill','#0099cc');
			 div.style("opacity",1e-6);
		});


		d3.selectAll('.arc').on('mouseover',function(d,i)
			{
					var text = '  '+d.from+' ---- '+d.to;
					//d3.selectAll('.title').text('');
					d3.select(this).style('fill','white');
					d3.select(this).style('stroke','2px solid white');
					d3.select(this).style('opacity','1');
					d3.select(this).style('z-index','2000');
				
					d3.select('.tip-right').selectAll('.title').text(text);
			    	d3.select('.tip-right')
			     		.style('height',100)
			     		.style('width',function(){if(text.length>10) return 280;});
			     	d3.select('.tip-right').select('.content').text(d.num);
			}).on('mouseout',function(d,i)
			{
				d3.select(this).style('fill','#ec4161');
				d3.select(this).style('stroke','none');
					d3.select(this).style('opacity','0.7');
				
			});
		


		

	 	function getColor(d)
		{
			var fill=['#006837','#1a9850','#66bd63','#a6d96a','#d9ef8b','#ffffbf','#fee08b','#fdae61','#f46d43','d73027'];
			var mid1 = min;
			var blue=['#0281a1','#0fafd7','#68d9f5'];
			var green =['#006837','#1a9850','#66bd63','#a6d96a'];
			var red = ['#ffffbf','#fee08b','#fdae61','#f46d43','d73027'];
			var mid2 = min+(max-min)*0.35;
			var mid3 = min;
			if(d<mid1){return fill[0]}
			if(d>mid2){return fill[fill.length-1]}
			var he = Math.floor((d-mid1)/(mid2-mid1)*fill.length)%fill.length;
			return fill[he];
		}


		function getSum(matrix)
		{
			sum = matrix.map(function(d){return 0});
			for(var i=0;i<matrix.length;i++)
			{
				for(var j=0;j<matrix.length;j++)
				{
					sum[i]+=matrix[i][j];
					sum[j]+=matrix[i][j];
				}
			}
			return sum;
		}
		/* function getLinks(matrix){
			links = []

			for(var i=0;i<matrix.length-1;i++)
			{
				for(var j=i+1;j<matrix.length;j++)
				{
					if(matrix[i][j]>600&&matrix[j][i]>600)
					{
						links.push({x1:i,x2:j,num:matrix[i][j]+matrix[j][i],from:unique[i].name,to:unique[j].name});
					}
				}
			}
			return links;
		} */
		
		function getLinks(flowtest){
			links = []

			for(var i=0;i<flowtest.length-1;i++)
			{
				for(var j=i+1;j<flowtest.length;j++)
				{
					if(flowtest[i][j]>1200&&flowtest[j][i]>1200)
					{
						links.push({x1:i,x2:j,num:flowtest[i][j]+flowtest[j][i],from:zones[i],to:zones[j]});
					}
				}
			}
			return links;
		}
		
		function getLinkArrays(matrix){
			linkArrays ={};
			for(var i=0;i<matrix.length;i++)
			{
				linkArrays[i+'']=({links:[]});
			}
			for(var i=0;i<matrix.length-1;i++)
			{
				for(var j=0;j<matrix.length;j++)
				{
					//alert(j);
					if(matrix[i][j]>600&&matrix[j][i]>600)
					{

						linkArrays[i].links.push({id:j+'',name:unique[j].name,num:matrix[i][j]+matrix[j][i]});
						//linkArrays[j].links.push({id:i,name:unique[i].name,num:matrix[i][j]+matrix[j][i]});
					}
				}
			}
			return linkArrays;

		}
		