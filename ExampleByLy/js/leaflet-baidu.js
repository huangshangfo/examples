
<!DOCTYPE html>
<html>
    <head>
        <title>Baidu Map with leaflet-stable</title>

        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <link rel="stylesheet" href="https://rawgit.com/Leaflet/Leaflet/stable/dist/leaflet.css" />
        <script type="text/javascript" src="https://rawgit.com/Leaflet/Leaflet/stable/build/deps.js"></script>
        <script src="https://rawgit.com/Leaflet/Leaflet/stable/debug/leaflet-include.js"></script>
 
        <script src="http://api.map.baidu.com/api?v=1.5&ak=Gt0BG62R7T5GDvuPSj65MBl4"></script>
        <script src="../layer/tile/leaflet-baidu.js"></script>
    </head>
    <body>
        <div style="width:768px; height:512px" id="map"></div>
        <!-- <div style="width:2100px; height:2100px" id="map"></div> -->
        <script type='text/javascript'>
            map = new L.map(
                'map',
                {
                    'crs': L.CRS.BEPSG3857,
                    // Coordinate of Tian'an Men of Baidu Coordinate
                    // 'center': [39.915, 116.404],
                    // 'zoom': 18,
                    // zoomAnimation: false
                }
            );
            // map.setView([0, 0], 3);
            // map.setView([64.117802, 75.355328], 3);
            map.setView([39.915, 116.404], 19);
            L.control.scale().addTo(map);
            var baiduLayer = new L.TileLayer.BaiduLayer();
            map.addLayer(baiduLayer);
            L.marker(map.getCenter()).bindPopup('I\'m a popup!').addTo(map);
        </script>
    </body>
</html>
