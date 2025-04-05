
# Map Tile Downloader

The purpose of this module is to **download** or **cache** map tiles shown to the user that fall within a specified area (**bbox, polygon, wkt**) and a designated **zoom range**.

To use map services (**xyz, wms, and wmts**), you need to know the URL address of the map service you want to download. The tile URL address contains **{s} subdomains, {z} zoom level, {x}, and {y}** information, which are always present. While {s} is not mandatory, it has also been included for all scenarios. If {s} is used, don't forget to add **subdomains**.

After these operations, three different export methods are provided. You should be aware that the hierarchical folder and file structure of the downloaded tiles is in the format **zoom_levels/{z}/{x}/{y}**. Apart from this, you can **download them to the path** you define on your server or computer in zip or folder structure, or if you are going to use them within an **API**, you can access them as a **Zip Buffer Array**.

Let's illustrate these operations with a few examples..

## Installation
intall npm package
```javascript
npm install map-tile-downloader
```


## Tile Options
You can use 3 different service for tile URL, This sample for XYZ Tiles
```javascript
 // type can be url, wms, wmts
 // subdomians sometimes can be -> ['a','b','c','d']
 // min max zoom range is 0 to 22
 // format can be png, gif, pbf, jpg, jpeg

var tileOptions = {
    type: 'url',
    url: 'https://server{s}.service-domain.com/abcd/{z}/{x}/{y}.png',
    subdomains: [0, 1, 2, 3],  
    minZoom: 0,
    maxZoom: 15,
    format: 'png'
};
```
## Downloading Area Options
You can use 3 different geometry type for filtering area
### Area Options 1 - GeoJSON
```javascript
// Area Sample 1 - GeoJSON - Polygon

var areaOptions = {
    type: 'geojson',
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [27.12637, 38.42191],
            [27.15161, 38.42013],
            [27.16448, 38.44603],
            [27.14505, 38.44900],
            [27.12637, 38.42712],
            [27.12402, 38.42284],
            [27.12637, 38.42191]
          ]
        ]
      }
    }
};
```
### Area Options 2 - BBOX
```javascript
// Area Sample 1 - BBOX

var areaOptions = {
  type: 'bbox',
  data: [27.12402, 38.42013, 27.16448, 38.44900]
};
```

### Area Options 3 - WKT
```javascript
// Area Sample 1 - WKT Polygon

var areaOptions = {
    type: 'wkt',
    data: 'POLYGON ((27.126379667467944 38.42191945460772, 27.151617849934297 38.420139862716354, 27.16448932299207 38.44603848581883, 27.145055922492958 38.449003384245714, 27.126379667467944 38.42712615684721, 27.124024103770523 38.422842188698525, 27.126379667467944 38.42191945460772))'
};
```


## MapTileDownloader Module Usage
```javascript
var MapTileDownloader = require('map-tile-downloader');

var areaOptions = {
  type: 'bbox',
  data: [27.12402, 38.42013, 27.16448, 38.44900]
};

var tileOptions = {
    type: 'url',
    url: 'https://server{s}.service-domain.com/abcd/{z}/{x}/{y}.png',
    subdomains: [0, 1, 2, 3],  
    minZoom: 0,
    maxZoom: 15,
    format: 'png'
};

var options = {
  tile: tileOptions,
  area: areaOptions,
};
var downloader = new MapTileDownloader(options);


```

### Get Zip Buffer Array
When you use this method, it'll return a zip buffer array in callback parameter. Then you can use it whatever you want. 
Generaly this usage best for API respond
```javascript
downloader.getAsZip((zipFile)=>{
    //bufferArray
});
```

### Download Zip File to Defined Path
You can download zip file to any file path in your server or pc. 
```javascript
downloader.downloadZipToPath('D:/export.zip',(status)=>{
    console.log(status);
},(status)=>{
  console.log(`Progress: ${status.progress}%`);
  console.log(`Current: ${status.current}`);
  console.log(`Total: ${status.total}`);
  console.log(`Downloaded Tile: ${JSON.stringify(status.tile)}`);
  console.log(`Status: ${status.status}`);
});
```

### Generate Folder/Files to Defined Path
When you use this method tiles will download in hierarchical folders step by step
```javascript
downloader.generateToPath('D:',(status)=>{
    console.log(status);
},(status)=>{
  console.log(`Progress: ${status.progress}%`);
  console.log(`Current: ${status.current}`);
  console.log(`Total: ${status.total}`);
  console.log(`Downloaded Tile: ${JSON.stringify(status.tile)}`);
  console.log(`Status: ${status.status}`);
});
```
## Author
Sr. GIS Dev. Ali Kilic | ali.kilic@gislayer.com | https://akilic.com