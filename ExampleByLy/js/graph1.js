   var pad = 10;
    var recheight=20;
    var x = d3.scale.linear().range([0, 300]);
    var height=4000,width=600;
    var text_width=80;
    var min=0;
    var max=15000;
    var fill=['#006837','#1a9850','#66bd63','#a6d96a','#d9ef8b','#ffffbf','#fee08b','#fdae61','#f46d43','d73027'];
    var y = d3.scale.ordinal().rangeRoundBands([pad, height - pad],0.3);
    var size = d3.scale.linear().range([4, 36]);
    var opacity=d3.scale.linear().range([0.2,1]);


    var svg =d3.select('#flow-graph').append('svg')
            .attr('height',height)
            .attr('width',width);
      var subway_graph =d3.select('#subway-graph').select('svg').append('svg'); 
      d3.selectAll('circle').attr('fill','white');
      d3.selectAll('polyline').attr('stroke','white');
      d3.selectAll('path').attr('stroke','white');
    var highlight_circle =subway_graph.append('circle')
                            .attr('r','8.5')
                            .style('stroke','#0099cc')
                            .style('stroke-width','2.5')
                            .style('fill','none')
                            .style('opacity','0');
      $('.subway').pin({containerSelector: ".subway-graph-container"});

      d3.json('dataset/unique.json',function(unique){
      d3.json('dataset/lineinfo.json',function(lineinfo){
      d3.json('dataset/detail.json',function(detail){
         detail = detail.sort(function(a,b){return a.total_in+a.total_out<b.total_in+b.total_out?1:-1});
         opacity.domain([0,d3.max(detail.map(function(d){return d.total_in+d.total_out}))]);
          x.domain([0, d3.max(detail, function (d) {return d.total_in+d.total_out })]);
          y.domain(detail.map(function(d,i){return i}));
            svg.selectAll('rect')
              .data(detail)
              .enter()
              .append('rect')
              .attr('class','flow-bar')
              .attr('x',text_width*2+pad)
              .attr('width',function(d){return x(d.total_in)})
              .attr('y',function(d,i){return y(i)-y.rangeBand()})
              .attr('height',y.rangeBand());
             svg.selectAll('text')
              .data(detail)
              .enter()
              .append('text')
              .attr('x','0')
              .attr('y',function(d,i){return y(i)})
              .text(function(d,i){return unique[d.id].name;})
              .attr('height',y.rangeBand());
             svg.selectAll('text')
              .data(detail)
              .enter()
              .append('text')
              .attr('x','0')
              .attr('y',function(d,i){return y(i)})
              .text(function(d,i){return unique[d.id].name;})
              .attr('height',y.rangeBand());
        var ticks = svg.append("g").selectAll("g")
            .data(detail)//第一次分组,依据是chord.groups
            .enter().append("g").selectAll("g")
            .data(getSubdata)
            .enter()
            .append("rect")
            .attr('class','bit-block-in')
            .attr('width',y.rangeBand()/2)
            .attr('height',y.rangeBand()/2)
            .attr('x',function(d){return d.x})
            .attr('y',function(d){return d.y1})
            .style('fill',function(d,i){return getColor(d.entrance)});
        var div2 = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 1e-6);
        var ticks = svg.append("g").selectAll("g")
            .data(detail)//第一次分组,依据是chord.groups
            .enter().append("g").selectAll("g")
            .data(getSubdata)
            .enter()
            .append("rect")
            .attr('class','bit-block-out')
            .attr('width',y.rangeBand()/2)
            .attr('height',y.rangeBand()/3)
            .attr('x',function(d){return d.x})
            .attr('y',function(d){return d.y2})
            .attr('fill',function(d,i){return  getColor(d.exit)});

            lists=d3.selectAll('.flow-bar').push();
          d3.selectAll('.flow-bar').on('mouseover',function(d,i){
              d3.select(this).style('opacity','0.4');
              div2.style('opacity','1');
              showHighLightCircle(d.id);

          }).on('mousemove',function(d,i){
               div2.text(unique[d.id].name+' total entrances:'+d.total_in+' total exits: '+d.total_out)
               
                 tooltipShowAndResize(div2);

          }).on('mouseout',function(d,i){
                 d3.select(this).style('opacity','0.1');
                 div2.style('opacity','0');
                 hideHighLightCircle();
          });

          d3.selectAll('.bit-block-in').on('mouseover',function(d,i){
               d3.select(this).style('fill','white');
                div2.style('opacity','1');
                var data_by_time = getDataByTime(i%10,detail);
                showHighLightCircle(d.id);
                resizeCircle(data_by_time,1);
                

          }).on('mousemove',function(d,i){
               div2.text(getTimeText(i%10)+unique[d.id].name +' entrance '+d.entrance)
               .style("left", (d3.event.pageX - 34) + "px")
                 .style("top", (d3.event.pageY - 32) + "px");
                 tooltipShowAndResize(div2);
          }).on('mouseout',function(d,i){
              d3.select(this).style('fill',getColor(d.entrance));
              div2.style('opacity','0');
              resizeCircle(detail,0);
              hideHighLightCircle();
          });
          d3.selectAll('.bit-block-out').on('mouseover',function(d,i){
               d3.select(this).style('fill','white');
               var data_by_time = getDataByTime(i%10,detail);
              showHighLightCircle(d.id);
               resizeCircle(data_by_time,2);
              div2.style('opacity','1');
             
              

          }).on('mousemove',function(d,i){
               div2.text(getTimeText(i%10)+unique[d.id].name+' exit '+d.exit)
               .style("left", (d3.event.pageX - 34) + "px")
                 .style("top", (d3.event.pageY - 32) + "px");
              tooltipShowAndResize(div2);
          }).on('mouseout',function(d,i){
              d3.select(this).style('fill',getColor(d.exit));
              div2.style('opacity','0');
              hideHighLightCircle();
              resizeCircle(detail,0);



          });


    
          
          var i=0;
          d3.selectAll('circle').each(function()
            {
              d3.select(this).attr('class','d'+i);
              d3.select(this).attr('index',i);
              i+=1;
            });
          //alert(d3.select('.d1').attr('cx'));
          resizeCircle(detail,0);
            bindCircleEvent();





        function getTimeText(t){
          var text='';
          if(t<=3){text+=t*2+5+'am'}else{text+=t*2+5-12+'pm'}
            text+=' to'
          if(t+1<=3||t==9){text+=((t+1)*2+5)%12+'am '}else{text+=(t+1)*2+5-12+'pm '}
            return text;
        }

    function bindCircleEvent(station)
    {
              station.on("mouseover",function(){
              
              //d3.select(this).attr("opacity",'1')
              div2.text(function()
                {
                  return unique[station.attr('index')].name;
                });
              
              tooltipShowAndResize(div2);
              showHighLightCircle(station.attr('index'));
             

            }).on("mouseout",function(){
              
 
              d3.select(this).style('fill','#ffffff');
              d3.select(this).style('fill','#ffffff');
              d3.select(this).style('fill','#ffffff');
              highlight_circle.style('opacity',0);
              tooltipHide(div2);
            });
    }
    function getColor(d)
    {
      var fill=['#006837','#1a9850','#66bd63','#a6d96a','#d9ef8b','#ffffbf','#fee08b','#fdae61','#f46d43','#d73027'];
      var mid1 = min;
      var mid2 = min+(max-min)*0.35;
      var mid3 = min;
      if(d<mid1){return fill[0]}
      if(d>mid2){return fill[fill.length-1]}
      var he = Math.floor((d-mid1)/(mid2-mid1)*fill.length)%fill.length;
      return fill[he];
    }
    function showHighLightCircle(i){

           highlight_circle.style('opacity','1')
                                .attr('cx',d3.select('.d'+i).attr('cx'))
                                .attr('cy',d3.select('.d'+i).attr('cy'));

    }
    function getDataByTime(t,data){
          d=[];
          
          for(var i=0;i<data.length;i++)
          {
              item={id:'',total_in:0,total_out:0};
              item.id=data[i].id;
              item.total_in=data[i].aver_entrances[t];
              item.total_out=data[i].aver_exits[t];
              d.push(item);
          }
          return d;

    }
    function tooltipShowAndResize(div){
          var text= div.text();
          div.style('opacity','1');
          div.style("left", (d3.event.pageX - 34) + "px")
                 .style("top", (d3.event.pageY - 32) + "px");
          if(text.length>4){
            div.style('width',(text.length-4)*6+80);
          }else{div.style('width',80);}
    }
    function tooltipHide(div){
        div.style('opacity','0');
    }
    function resizeCircle(data,flag){
      var max;
      if(data[0].aver_entrances!=null){
        max=d3.max(data.map(function(d){return d.total_in+d.total_out}));
      }else{
        max=10000;
      } 
      size.domain([0,max]);
      opacity.domain([0,max]);
      d3.select('.graph1-circle1').attr("r",size(Math.floor(Math.sqrt(max*0.01))));
      d3.select('.graph1-circle2').attr("r",size(Math.floor(Math.sqrt(max*0.1))));
      d3.select('.graph1-circle3').attr('r',size(Math.floor(Math.sqrt(max))));
    
       d3.select('.graph1-legend1').text(Math.floor(max*0.01));
       d3.select('.graph1-legend2').text(Math.floor(max*0.1));
      d3.select('.graph1-legend3').text(max);
      for(var i=0;i<data.length;i++)
      {
          var station=d3.select('.d'+data[i].id);
            var cnt = (flag==0)?data[i].total_in+data[i].total_out:(flag==1)?data[i].total_in:data[i].total_out;
             
              station.transition()
                .duration(300)
                .attr("r",Math.sqrt(size(cnt)));
              station.style("opacity",opacity(cnt));
         bindCircleEvent(station);


      }
    
    } 
    function createLegend(div,n,type,size,color,opacity){

    }
    function changeToolTipText(text){

    }
    function hideHighLightCircle(){
      highlight_circle.style('opacity','0');
    }
    function getSubdata(d,i)
  { 
    var data=[];
      var x2 =  d3.scale.ordinal().rangeRoundBands([text_width,text_width*2],0.1);
      var y2 = d3.scale.ordinal().rangeRoundBands([y(i)-y.rangeBand(), y(i)],0.1);
      y2.domain([0,1]);
      x2.domain([0,1,2,3,4,5,6,7,8,9]);
      for(var j=0;j<d.aver_entrances.length;j++)
      {
          var item={id:d.id,entrance:d.aver_entrances[j],exit:d.aver_exits[j],x:x2(j),y1:y2(0),y2:y2(1)};
          data.push(item);
      }
      return data;
  }
         
})
});
});