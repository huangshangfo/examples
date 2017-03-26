sub_initial=function (unique) {
	d3.selectAll('circle').attr("r",'2.8');
	var i=0;
	d3.selectAll('circle').each(function()
	{
		d3.select(this).attr('class',i);
		i+=1;
	});
	d3.selectAll("circle").on("mouseover",function(){
		
		//d3.select(this).attr("opacity",'1');
		var station = d3.select(this);
		d3.select('h2').text(function()
			{
				return unique[station.attr('class')].name
			});
		d3.select(this).attr('r','6');
		d3.select(this).style('fill','#0099cc');
		d3.select(this).style('z-index','500');
	}).on("mouseout",function(){
		$(this).attr("opacity",'0.45');
		d3.select(this).attr('r',"2.8");
		d3.select(this).style('fill','#999999');
	});
}