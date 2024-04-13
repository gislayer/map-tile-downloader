const TilesCounter = require('map-tiles-generator');
const bboxPol = require('@turf/bbox-polygon');
const wkt = require('wkt');
const fs = require('fs');
const JSZip = require('jszip');
const axios = require('axios');

class MapTileDownloader {
  constructor(obj) {
    try {
      var requiredProps = ['tile', 'area'];
      var data = this.getFromOBJ(obj, requiredProps);
      this.tile = this.checkTile(data);
      this.area = this.checkArea(data);
      this.status = true;
    } catch (error) {
      console.error('Error :', error.message);
    }
  }

  checkArea(data) {
    var requiredAreaProps = ['type', 'data'];
    var requiredAreaTypeProps = ['bbox', 'geojson', 'wkt'];
    var area = this.getFromOBJ(data.area, requiredAreaProps);
    var areaCheck1 = this.objectValidate(area, {
      type: {
        type: 'string',
        controls: [{
          type: 'in',
          data: requiredAreaTypeProps
        }]
      },
      data: {
        type: 'any',
        controls: []
      }
    });
    if (area.type == 'bbox') {
      var areaCheck = this.objectValidate(areaCheck1, {
        type: {
          type: 'string',
          controls: [{
            type: 'in',
            data: requiredAreaTypeProps
          }]
        },
        data: {
          type: 'array',
          controls: [{
            type: 'size',
            data: 4
          }]
        }
      });
      areaCheck.data = bboxPol.default(areaCheck.data);
      return areaCheck;
    } else if (area.type == 'geojson') {
      var areaCheck = this.objectValidate(areaCheck1, {
        type: {
          type: 'string',
          controls: [{
            type: 'in',
            data: requiredAreaTypeProps
          }]
        },
        data: {
          type: 'object',
          controls: [{
            type: 'polygon',
            data: null
          }]
        }
      });
      return areaCheck;
    } else if (area.type == 'wkt') {
      var areaCheck = this.objectValidate(areaCheck1, {
        type: {
          type: 'string',
          controls: [{
            type: 'in',
            data: requiredAreaTypeProps
          }]
        },
        data: {
          type: 'string',
          controls: [{
            type: 'contains',
            data: ['POLYGON', '(', ',', ')']
          }]
        }
      });
      areaCheck.data = {
        type: 'Feature',
        properties: {},
        geometry: wkt.parse(areaCheck.data)
      };
      return areaCheck;
    } else {
      throw new Error(`Area options property is not walid!`);
    }
  }

  checkTile(data) {
    var requiredTileProps = ['type', 'url', 'subdomains', 'minZoom', 'maxZoom', 'format'];
    var tile = this.getFromOBJ(data.tile, requiredTileProps);
    var tileCheck = this.objectValidate(tile, {
      type: {
        type: 'string',
        controls: [{
          type: 'in',
          data: ['url', 'wms', 'wfs']
        }]
      },
      url: {
        type: 'string',
        controls: [{
          type: 'contains',
          data: ['{x}', '{y}', '{z}', 'http']
        }]
      },
      subdomains: {
        type: 'array',
        controls: []
      },
      minZoom: {
        type: 'integer',
        controls: [{
          type: 'range',
          min: 0,
          max: 22
        }]
      },
      maxZoom: {
        type: 'integer',
        controls: [{
          type: 'range',
          min: 0,
          max: 22
        }]
      },
      format: {
        type: 'string',
        controls: [{
          type: 'in',
          data: ['png', 'gif', 'pbf', 'jpg', 'jpeg']
        }]
      },
    });
    return tileCheck;
  }

  getFromOBJ(obj, props) {
    var ret = {};
    for (var i = 0; i < props.length; i++) {
      if (obj.hasOwnProperty(props[i])) {
        ret[props[i]] = obj[props[i]];
      } else {
        throw new Error(`Options object must have ${props.join(', ')} prop name`);
      }
    }
    return ret;
  }

  typeValidate(val, type) {
    switch (type) {
      case 'any': {
        return true;
      }
      case 'string': {
        return typeof val === 'string';
      }
      case 'integer': {
        return typeof val === 'number' && Number.isInteger(val);
      }
      case 'float': {
        return typeof val === 'number' && Number.isFinite(val);
      }
      case 'object': {
        return typeof val === 'object';
      }
      case 'array': {
        return Array.isArray(val)
      }
    }
  }

  dataControl(val, control, prop) {
    if (control.length == 0) {
      return true;
    }
    switch (control.type) {
      case 'range': {
        var min = control.min;
        var max = control.max;
        return val >= min && val <= max;
      }
      case 'polygon': {
        if (val['type'] !== 'Feature') {
          throw new Error(`GeoJSON must have type(Feature) property`);
        }
        if (val['geometry'] == undefined) {
          throw new Error(`GeoJSON must have geometry property`);
        }
        if (val.geometry['type'] !== 'Polygon') {
          throw new Error(`GeoJSON geometry must be Polygon`);
        }
        return true;
      }
      case 'in': {
        var inlist = control.data;
        return inlist.indexOf(val) !== -1
      }
      case 'contains': {
        var inlist = control.data;
        var notFound = [];
        for (var i = 0; i < inlist.length; i++) {
          if (val.indexOf(inlist[i]) === -1) {
            notFound.push(inlist[i]);
          }
        }
        if (notFound.length > 0) {
          throw new Error(`Prop ${notFound.join(', ')} Not Found`);
        } else {
          return true;
        }
      }
      case 'size': {
        var len = control.data;
        if (val.length === len) {
          return true;
        } else {
          throw new Error(`Prop ${prop} must have ${len} Items`);
        }

      }
    }
    return false;
  }

  objectValidate(obj, rules) {
    var ret = {};
    for (var prop in rules) {
      var data = obj[prop];
      var checkType = this.typeValidate(data, rules[prop].type);
      if (checkType == false) {
        throw new Error(`Data type is not valid ${prop}`);
      }
      for (var i = 0; i < rules[prop].controls.length; i++) {
        var ctrl = rules[prop].controls[i];
        var controls = this.dataControl(data, ctrl, prop);
        if (controls == false) {
          throw new Error(`${prop} property data did not pass in ${ctrl.type} control`);
        }
      }
      ret[prop] = data;
    }
    return ret;
  }

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateTile(url, subdomains, x, y, z) {
    var rnd = this.random(0, subdomains.length) % subdomains.length;
    var sname = subdomains[rnd];
    if (url.indexOf('{s}') !== -1) {
      while (url.indexOf('{s}') != -1) {
        url = url.replace('{s}', sname);
      }
    }
    if (url.indexOf('{z}') !== -1) {
      while (url.indexOf('{z}') != -1) {
        url = url.replace('{z}', z);
      }
    }
    if (url.indexOf('{y}') !== -1) {
      while (url.indexOf('{y}') != -1) {
        url = url.replace('{y}', y);
      }
    }
    if (url.indexOf('{x}') !== -1) {
      while (url.indexOf('{x}') != -1) {
        url = url.replace('{x}', x);
      }
    }
    return url;
  }

  downloadList(zip, i, arr, type, path, callback) {
    if (i < arr.length) {
      var item = arr[i];
      axios({
          method: 'get',
          url: item.url,
          responseType: 'stream'
        })
        .then(response => {
          if (type == 'zip') {
            zip.file(`zoom_levels/${item.z}/${item.x}/${item.y}`, response.data);
            i++;
            this.downloadList(zip, i, arr, type, path, callback);
          } else if (type == 'folder') {
            const chunks = [];
            response.data.on('data', chunk => chunks.push(chunk));
            response.data.on('end', () => {
              const fileBuffer = Buffer.concat(chunks);
              fs.writeFileSync(`${path}zoom_levels/${item.z}/${item.x}/${item.y}`, fileBuffer);
              i++;
              this.downloadList(zip, i, arr, type, path, callback);
            });
            response.data.on('error', error => {
              i++;
              this.downloadList(zip, i, arr, type, path, callback);
              throw new Error(`Download Error!`);
            });
          }
        })
        .catch(error => {
          i++;
          this.downloadList(zip, i, arr, type, path, callback);
          throw new Error(`Download Error!`);
        });

    } else {
      if (type == 'zip') {
        zip.generateAsync({
          type: "nodebuffer"
        }).then((content) => {
          callback(content);
        });
      } else if (type == 'folder') {
        callback(`${path}zoom_levels`);
      }

    }
  }

  downloadZipToPath(path, callback) {
    this.getAsZip((zipFile) => {
      fs.writeFile(path, zipFile, (err) => {
        if (err) {
          callback(false)
        } else {
          callback(true)
        }
      });
    })
  }


  getAsZip(callback) {
    if (this.status) {
      var format = this.tile.format;
      const zip = new JSZip();
      zip.folder('zoom_levels');
      const generator = new TilesCounter(this.area.data);
      var tiles = generator.getTilesFromZoomRange(this.tile.minZoom, this.tile.maxZoom);
      var downloadlist = [];
      for (var level in tiles.zoom) {
        zip.folder(`zoom_levels/${level}`);
        for (var i = 0; i < tiles.zoom[level].length; i++) {
          var x = tiles.zoom[level][i].x;
          var y = tiles.zoom[level][i].y;
          zip.folder(`zoom_levels/${level}/${x}`);
          var z = tiles.zoom[level][i].z;
          var tile = this.generateTile(this.tile.url, this.tile.subdomains, x, y, z);
          var yname = `${y}.${format}`;
          downloadlist.push({
            url: tile,
            z: z,
            x: x,
            y: yname
          });
        }
      }
      this.downloadList(zip, 0, downloadlist, 'zip', '', callback);
    } else {
      throw new Error(`Object status is not active!`);
    }
  }

  generateToPath(path, callback) {
    if (this.status) {
      var format = this.tile.format;
      if (!fs.existsSync(`${path}zoom_levels`)) {
        fs.mkdirSync(`${path}zoom_levels`);
      }
      const generator = new TilesCounter(this.area.data);
      var tiles = generator.getTilesFromZoomRange(this.tile.minZoom, this.tile.maxZoom);
      var downloadlist = [];
      for (var level in tiles.zoom) {
        if (!fs.existsSync(`${path}zoom_levels/${level}`)) {
          fs.mkdirSync(`${path}zoom_levels/${level}`);
        }
        for (var i = 0; i < tiles.zoom[level].length; i++) {
          var x = tiles.zoom[level][i].x;
          var y = tiles.zoom[level][i].y;
          if (!fs.existsSync(`${path}zoom_levels/${level}/${x}`)) {
            fs.mkdirSync(`${path}zoom_levels/${level}/${x}`);
          }
          var z = tiles.zoom[level][i].z;
          var tile = this.generateTile(this.tile.url, this.tile.subdomains, x, y, z);
          var yname = `${y}.${format}`;
          downloadlist.push({
            url: tile,
            z: z,
            x: x,
            y: yname
          });
        }
      }
      this.downloadList({}, 0, downloadlist, 'folder', path, callback);
    } else {
      throw new Error(`OBject status is not active!`);
    }
  }

}


module.exports = MapTileDownloader;
