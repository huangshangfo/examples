(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.mapv = global.mapv || {})));
}(this, (function (exports) { 'use strict';

var version = "2.0.10";

var conf = {
    longitudeLatitudeScale: 100
};

var Camera = function Camera(gl) {

    this.gl = gl;
    this.radius = 400;

    this.lon = 90;
    this.lat = 45;

    this.transX = 100 * conf.longitudeLatitudeScale;
    this.transY = 30 * conf.longitudeLatitudeScale;

    var canvas = gl.canvas;

    gl.viewport(0, 0, canvas.width, canvas.height);
    var pMatrix = mat4.create();
    mat4.perspective(pMatrix, 45, canvas.width / canvas.height, 1, 100000.0);
    gl.uniformMatrix4fv(gl.uPMatrix, false, pMatrix);

    this.computerXYZ();
    this.render();
    this.init();
};

Camera.prototype.init = function () {
    this.drag();
};

Camera.prototype.render = function () {
    var mvMatrix = mat4.create();
    mat4.lookAt(mvMatrix, [this.x, this.y, this.z], [0, 0, 0], [0, 0, 1]);
    this.mvMatrix = mat4.translate(mat4.create(), mvMatrix, [-this.transX, -this.transY, 0]);
};

Camera.prototype.drag = function () {
    var self = this;
    var canvas = this.gl.canvas;

    var startX = 0;
    var startY = 0;
    var which = 1;
    var startLon = 0;
    var startTransX = 0;
    var startTransY = 0;
    var startLat = 0;
    var canDrag = false;

    canvas.addEventListener('mousewheel', function (e) {
        self.radius -= event.deltaY;
        self.radius = Math.max(10, self.radius);
        self.radius = Math.min(100000, self.radius);
        self.computerXYZ();
        self.render();
    });

    canvas.addEventListener('mousedown', function (e) {
        startX = e.offsetX;
        startY = e.offsetY;
        startLon = self.lon;
        startLat = self.lat;
        which = e.which;
        startTransX = self.transX;
        startTransY = self.transY;
        canDrag = true;
        window.event.returnValue = false;
        return false;
    });

    canvas.addEventListener('contextmenu', function () {
        window.event.returnValue = false;
        return false;
    });

    window.addEventListener('mousemove', function (e) {
        if (canDrag) {
            var dX = e.offsetX - startX;
            var dY = e.offsetY - startY;
            if (e.which === 1) {
                var dLon = dX / 1;
                var dLat = dY / 1;
                self.lon = (startLon + dLon) % 360;
                self.lat = startLat + dLat;
                self.lat = Math.min(90, self.lat);
                self.lat = Math.max(-90, self.lat);
                self.lat = Math.max(10, self.lat);
                // console.log(self.lat, self.lon)
            } else {
                self.transX = startTransX - dX * conf.longitudeLatitudeScale / 10;
                self.transY = startTransY + dY * conf.longitudeLatitudeScale / 10;
            }
            self.computerXYZ();
            self.render();
        }
    });

    window.addEventListener('mouseup', function (e) {
        startX = 0;
        startY = 0;
        canDrag = false;
    });
};

Camera.prototype.computerXYZ = function () {
    var self = this;
    self.z = self.radius * Math.sin(self.lat * Math.PI / 180);
    var smallRadius = self.radius * Math.cos(self.lat * Math.PI / 180);
    self.x = smallRadius * Math.cos(self.lon * Math.PI / 180);
    self.y = -smallRadius * Math.sin(self.lon * Math.PI / 180);
};

//get the context
function getWebGLContext(canvas, err) {
    // bind err
    if (canvas.addEventListener) {
        canvas.addEventListener("webglcontextcreationerror", function (event) {
            console.log(event.statusMessage);
        }, false);
    }
    //create context
    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    var context = null;
    for (var ii = 0; ii < names.length; ++ii) {
        try {
            context = canvas.getContext(names[ii], err);
        } catch (e) {}
        if (context) {
            break;
        }
    }
    return context;
}

//init shader
function initShaders(gl, vshader, fshader) {
    var program = createProgram(gl, vshader, fshader);
    if (!program) {
        console.log('Failed to create program');
        return false;
    }
    gl.useProgram(program);
    gl.program = program;

    // init shader variable
    gl.uPMatrix = gl.getUniformLocation(program, "uPMatrix");
    gl.uMVMatrix = gl.getUniformLocation(program, "uMVMatrix");

    gl.aPosition = gl.getAttribLocation(gl.program, 'aPosition');
    gl.aColor = gl.getAttribLocation(gl.program, 'aColor');
    return true;
}

//create program
function createProgram(gl, vshader, fshader) {
    console.log('create');
    // Create shader object
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    // Create a program object
    var program = gl.createProgram();
    if (!program) {
        return null;
    }
    // Attach the shader objects
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    // Link the program object
    gl.linkProgram(program);
    // Check the result of linking
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        var error = gl.getProgramInfoLog(program);
        console.log('Failed to link program: ' + error);
        gl.deleteProgram(program);
        gl.deleteShader(fragmentShader);
        gl.deleteShader(vertexShader);
        return null;
    }
    return program;
}

//loadShader
function loadShader(gl, type, source) {
    // Create shader object
    var shader = gl.createShader(type);
    if (shader == null) {
        console.log('unable to create shader');
        return null;
    }
    // Set the shader program
    gl.shaderSource(shader, source);
    // Compile the shader
    gl.compileShader(shader);
    // Check the result of compilation
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        var error = gl.getShaderInfoLog(shader);
        console.log('Failed to compile shader: ' + error);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function colorTransform(colorStr) {
    var color = [0, 0, 0];
    if (typeof colorStr == 'string') {
        if (colorStr.indexOf('#') !== -1) {
            var _color = colorStr.substring(1);
            if (_color.length == 3) {
                color = [];
                for (var i = 0; i < _color.length; i++) {
                    var key = _color.charAt(i);
                    color.push(parseInt(key + key, 16) / 255);
                }
            } else if (_color.length == 6) {
                color = [];
                for (var i = 0; i < _color.length; i += 2) {
                    var key = _color.charAt(i);
                    var key2 = _color.charAt(i + 1);
                    color.push(parseInt(key + key2, 16) / 255);
                }
            }
        }
    }
    return color;
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Plane = function () {
    function Plane(GL, obj) {
        classCallCheck(this, Plane);

        this.GL = GL;
        this.gl = GL.gl;
        this.obj = obj = obj || {};
        this.width = obj.width || 10.0;
        this.height = obj.height || 10.0;
        this.operate = [];
        this.opearteID = 0;
        this.opearteBuild = {};
        var color = this.color = colorTransform(obj.color);

        this.verticesColors = new Float32Array([-this.width / 2, +this.height / 2, 0.0, color[0], color[1], color[2], +this.width / 2, +this.height / 2, 0.0, color[0], color[1], color[2], +this.width / 2, -this.height / 2, 0.0, color[0], color[1], color[2], -this.width / 2, -this.height / 2, 0.0, color[0], color[1], color[2]]);

        this.indices = new Uint8Array([0, 1, 2, 0, 2, 3]);
    }

    createClass(Plane, [{
        key: 'translate',
        value: function translate(x, y, z) {
            var id = this.opearteID = this.opearteID;
            this.operate.push({
                id: id++,
                name: 'translate',
                value: [x || 0, y || 0, z || 0]
            });
            return this;
        }

        // useage
        // rotate(30,'x')
        // rotate(30,'y')
        // rotate(30,'z')
        // rotate(30,[1,1,0])

    }, {
        key: 'rotate',
        value: function rotate(rad, axis) {
            var _axis = null;
            if (axis instanceof Array && axis.length == 3) {
                _axis = axis;
            } else {
                switch (axis) {
                    case 'x':
                        _axis = [1, 0, 0];
                        break;
                    case 'y':
                        _axis = [0, 1, 0];
                        break;
                    case 'z':
                        _axis = [0, 0, 1];
                        break;
                }
            }

            if (_axis) {
                var id = this.opearteID = this.opearteID;
                this.operate.push({
                    id: id++,
                    name: 'rotate',
                    value: [rad, _axis]
                });
            }
            return this;
        }
    }, {
        key: 'scale',
        value: function scale(x, y, z) {
            var id = this.opearteID = this.opearteID;
            this.operate.push({
                id: id++,
                name: 'scale',
                value: [x || 1, y || 1, z || 1]
            });
            return this;
        }
    }, {
        key: 'render',
        value: function render() {
            var gl = this.gl;
            var mvMatrix = this.GL.camera.mvMatrix;

            // 顶点/颜色缓冲区操作
            var vertexColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.verticesColors, gl.STATIC_DRAW);
            //
            var FSIZE = this.verticesColors.BYTES_PER_ELEMENT;
            //
            gl.vertexAttribPointer(gl.aPosition, 3, gl.FLOAT, false, FSIZE * 6, 0);
            gl.enableVertexAttribArray(gl.aPosition);
            //
            gl.vertexAttribPointer(gl.aColor, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
            gl.enableVertexAttribArray(gl.aColor);

            // 顶点索引缓冲区
            var indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

            // set mv
            if (this.opearteBuild.ID === this.opearteID && this.opearteBuild.start === mvMatrix.toString()) {
                mvMatrix = this.opearteBuild.result;
            } else {
                var start = mvMatrix.toString();
                for (var i in this.operate) {
                    var type = this.operate[i].name;
                    var value = this.operate[i].value;
                    switch (type) {
                        case 'translate':
                            var mvNMatrix = mat4.create();
                            mat4.translate(mvNMatrix, mvMatrix, value);
                            mvMatrix = mvNMatrix;
                            break;
                        case 'rotate':
                            // console.log(mvMatrix)
                            var mvNMatrix = mat4.create();
                            mat4.rotate(mvNMatrix, mvMatrix, value[0], value[1]);
                            mvMatrix = mvNMatrix;
                            break;
                        case 'scale':
                            var mvNMatrix = mat4.create();
                            mat4.scale(mvNMatrix, mvMatrix, value);
                            mvMatrix = mvNMatrix;
                            break;
                    }
                }
                this.opearteBuild = {
                    ID: this.opearteID,
                    result: mvMatrix,
                    start: start
                };
                // console.log(mvNMatrix)
            }

            gl.uniformMatrix4fv(this.gl.uMVMatrix, false, mvMatrix);

            gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_BYTE, 0);
        }
    }]);
    return Plane;
}();

var Wall = function () {
    function Wall(GL, obj) {
        classCallCheck(this, Wall);

        console.log(obj.path);
        this.GL = GL;
        this.gl = GL.gl;
        this.obj = obj = obj || {};
        this.width = obj.thickness || 0.20;
        this.height = obj.height || 3.0;

        this.operate = [];
        this.opearteID = 0;
        this.opearteBuild = {};
        var color = this.color = colorTransform(obj.color);

        this.verticesColors = new Float32Array([-this.width / 2, +this.height / 2, 0.10, color[0], color[1], color[2], +this.width / 2, +this.height / 2, 0.10, color[0], color[1], color[2], +this.width / 2, -this.height / 2, 0.10, color[0], color[1], color[2], -this.width / 2, -this.height / 2, 0.10, color[0], color[1], color[2]]);

        this.indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

        for (var i = 0; i < obj.path.length; i += 2) {
            if (i === 0) {}
            console.log(i);
        }
    }

    createClass(Wall, [{
        key: 'render',
        value: function render() {
            var gl = this.gl;
            var mvMatrix = this.GL.camera.mvMatrix;

            // 顶点/颜色缓冲区操作
            var vertexColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.verticesColors, gl.STATIC_DRAW);
            //
            var FSIZE = this.verticesColors.BYTES_PER_ELEMENT;
            //
            gl.vertexAttribPointer(gl.aPosition, 3, gl.FLOAT, false, FSIZE * 6, 0);
            gl.enableVertexAttribArray(gl.aPosition);
            //
            gl.vertexAttribPointer(gl.aColor, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
            gl.enableVertexAttribArray(gl.aColor);

            // 顶点索引缓冲区
            var indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

            gl.uniformMatrix4fv(this.gl.uMVMatrix, false, mvMatrix);

            gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_BYTE, 0);
        }
    }]);
    return Wall;
}();

var OBJ = function () {
    function OBJ(GL, obj) {
        classCallCheck(this, OBJ);

        this.GL = GL;
        this.gl = GL.gl;
        this.obj = obj = obj || {};
        this.operate = [];
        this.opearteID = 0;
        this.opearteBuild = {};
        this.color = colorTransform(obj.color || '#FFF');
    }

    createClass(OBJ, [{
        key: 'translate',
        value: function translate(x, y, z) {
            var id = this.opearteID = this.opearteID;
            this.operate.push({
                id: id++,
                name: 'translate',
                value: [x || 0, y || 0, z || 0]
            });
            return this;
        }

        // useage
        // rotate(30,'x')
        // rotate(30,'y')
        // rotate(30,'z')
        // rotate(30,[1,1,0])

    }, {
        key: 'rotate',
        value: function rotate(rad, axis) {
            var _axis = null;
            if (axis instanceof Array && axis.length == 3) {
                _axis = axis;
            } else {
                switch (axis) {
                    case 'x':
                        _axis = [1, 0, 0];
                        break;
                    case 'y':
                        _axis = [0, 1, 0];
                        break;
                    case 'z':
                        _axis = [0, 0, 1];
                        break;
                }
            }

            if (_axis) {
                var id = this.opearteID = this.opearteID;
                this.operate.push({
                    id: id++,
                    name: 'rotate',
                    value: [rad, _axis]
                });
            }
            return this;
        }
    }, {
        key: 'scale',
        value: function scale(x, y, z) {
            var id = this.opearteID = this.opearteID;
            this.operate.push({
                id: id++,
                name: 'scale',
                value: [x || 1, y || 1, z || 1]
            });
            return this;
        }
    }, {
        key: 'updateOpearte',
        value: function updateOpearte() {
            var mvMatrix = this.GL.camera.mvMatrix;
            if (this.opearteBuild.ID === this.opearteID && this.opearteBuild.start === mvMatrix.toString()) {
                mvMatrix = this.opearteBuild.result;
            } else {
                var start = mvMatrix.toString();
                for (var i in this.operate) {
                    var type = this.operate[i].name;
                    var value = this.operate[i].value;
                    switch (type) {
                        case 'translate':
                            var mvNMatrix = mat4.create();
                            mat4.translate(mvNMatrix, mvMatrix, value);
                            mvMatrix = mvNMatrix;
                            break;
                        case 'rotate':
                            // console.log(mvMatrix)
                            var mvNMatrix = mat4.create();
                            mat4.rotate(mvNMatrix, mvMatrix, value[0], value[1]);
                            mvMatrix = mvNMatrix;
                            break;
                        case 'scale':
                            var mvNMatrix = mat4.create();
                            mat4.scale(mvNMatrix, mvMatrix, value);
                            mvMatrix = mvNMatrix;
                            break;
                    }
                }
                this.opearteBuild = {
                    ID: this.opearteID,
                    result: mvMatrix,
                    start: start
                };
            }
        }
    }]);
    return OBJ;
}();

var Plane$1 = function (_Obj) {
    inherits(Plane, _Obj);

    function Plane(GL, obj) {
        classCallCheck(this, Plane);

        var _this = possibleConstructorReturn(this, (Plane.__proto__ || Object.getPrototypeOf(Plane)).call(this, GL, obj));

        _this.width = obj.width || 10.0;
        _this.height = obj.height || 10.0;

        var color = _this.color;
        var paths = obj.path;
        _this.verticesColors = [];
        paths.forEach(function (point) {
            _this.verticesColors = _this.verticesColors.concat(point.concat(color));
        });
        _this.verticesColors = new Float32Array(_this.verticesColors);
        return _this;
    }

    createClass(Plane, [{
        key: 'render',
        value: function render() {
            var gl = this.gl;
            var mvMatrix = this.GL.camera.mvMatrix;

            // 顶点/颜色缓冲区操作
            var vertexColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.verticesColors, gl.STATIC_DRAW);
            //
            var FSIZE = this.verticesColors.BYTES_PER_ELEMENT;
            //
            gl.vertexAttribPointer(gl.aPosition, 3, gl.FLOAT, false, FSIZE * 6, 0);
            gl.enableVertexAttribArray(gl.aPosition);
            //
            gl.vertexAttribPointer(gl.aColor, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
            gl.enableVertexAttribArray(gl.aColor);

            // set mv
            this.updateOpearte();
            //

            gl.uniformMatrix4fv(this.gl.uMVMatrix, false, mvMatrix);
            gl.drawArrays(gl.LINE_STRIP, 0, this.verticesColors.length / 6);
        }
    }]);
    return Plane;
}(OBJ);

var VSHADER_SOURCE = 'attribute vec4 aPosition;\n' + 'attribute vec4 aColor;\n' + 'uniform mat4 uMVMatrix;\n' + 'uniform mat4 uPMatrix;\n' + 'varying vec4 vColor;\n' + 'void main() {\n' + '  gl_Position = uPMatrix * uMVMatrix * aPosition;\n' + '  vColor = aColor;\n' + '}\n';

var FSHADER_SOURCE = '#ifdef GL_ES\n' + 'precision mediump float;\n' + '#endif\n' + 'varying vec4 vColor;\n' + 'void main() {\n' + '  gl_FragColor = vColor;\n' + '}\n';

var GL = function () {
    function GL(dom) {
        classCallCheck(this, GL);

        var self = this;

        var renderList = this.renderList = [];

        var Dom = document.getElementById(dom);
        var DomSty = getComputedStyle(Dom);

        var canvas = document.createElement('canvas');
        canvas.height = parseInt(DomSty.height);
        canvas.width = parseInt(DomSty.width);
        Dom.appendChild(canvas);

        var gl = this.gl = getWebGLContext(canvas);

        initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 1.0);

        //init camear
        self.camera = new Camera(this.gl);

        function draw() {
            gl.clear(gl.COLOR_BUFFER_BIT);
            // console.time('draw')
            for (var i in renderList) {
                renderList[i].render();
            }
            // console.timeEnd('draw')
            requestAnimationFrame(draw);
        }

        requestAnimationFrame(draw);
    }

    createClass(GL, [{
        key: 'Plane',
        value: function Plane$$1(obj) {
            var plane = new Plane(this, obj);
            this.renderList.push(plane);
            return plane;
        }
    }, {
        key: 'Wall',
        value: function Wall$$1(obj) {
            var wall = new Wall(this, obj);
            this.renderList.push(wall);
            return wall;
        }
    }, {
        key: 'Path',
        value: function Path(obj) {
            var path = new Plane$1(this, obj);
            this.renderList.push(path);
            return path;
        }
    }]);
    return GL;
}();

var china = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {
            "id": "65",
            "name": "新疆",
            "cp": [84.9023, 41.748],
            "childNum": 18
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[96.416, 42.7588], [96.416, 42.7148], [95.9766, 42.4951], [96.0645, 42.3193], [96.2402, 42.2314], [95.9766, 41.9238], [95.2734, 41.6162], [95.1855, 41.792], [94.5703, 41.4844], [94.043, 41.0889], [93.8672, 40.6934], [93.0762, 40.6494], [92.6367, 39.6387], [92.373, 39.3311], [92.373, 39.1113], [92.373, 39.0234], [90.1758, 38.4961], [90.3516, 38.2324], [90.6152, 38.3203], [90.5273, 37.8369], [91.0547, 37.4414], [91.3184, 37.0898], [90.7031, 36.7822], [90.791, 36.6064], [91.0547, 36.5186], [91.0547, 36.0791], [90.8789, 36.0352], [90, 36.2549], [89.9121, 36.0791], [89.7363, 36.0791], [89.209, 36.2988], [88.7695, 36.3428], [88.5938, 36.4746], [87.3633, 36.4307], [86.2207, 36.167], [86.1328, 35.8594], [85.6055, 35.6836], [85.0781, 35.7275], [84.1992, 35.376], [83.1445, 35.4199], [82.8809, 35.6836], [82.4414, 35.7275], [82.002, 35.332], [81.6504, 35.2441], [80.4199, 35.4199], [80.2441, 35.2881], [80.332, 35.1563], [80.2441, 35.2002], [79.8926, 34.8047], [79.8047, 34.4971], [79.1016, 34.4531], [79.0137, 34.3213], [78.2227, 34.7168], [78.0469, 35.2441], [78.0469, 35.5078], [77.4316, 35.4639], [76.8164, 35.6396], [76.5527, 35.8594], [76.2012, 35.8154], [75.9375, 36.0352], [76.0254, 36.4746], [75.8496, 36.6943], [75.498, 36.7383], [75.4102, 36.958], [75.0586, 37.002], [74.8828, 36.9141], [74.7949, 37.0459], [74.5313, 37.0898], [74.5313, 37.2217], [74.8828, 37.2217], [75.1465, 37.4414], [74.8828, 37.5732], [74.9707, 37.749], [74.8828, 38.4521], [74.3555, 38.6719], [74.1797, 38.6719], [74.0918, 38.54], [73.8281, 38.584], [73.7402, 38.8477], [73.8281, 38.9795], [73.4766, 39.375], [73.916, 39.5068], [73.916, 39.6826], [73.8281, 39.7705], [74.0039, 40.0342], [74.8828, 40.3418], [74.7949, 40.5176], [75.2344, 40.4297], [75.5859, 40.6494], [75.7617, 40.2979], [76.377, 40.3857], [76.9043, 41.001], [77.6074, 41.001], [78.1348, 41.2207], [78.1348, 41.3965], [80.1563, 42.0557], [80.2441, 42.2754], [80.1563, 42.627], [80.2441, 42.8467], [80.5078, 42.8906], [80.4199, 43.0664], [80.7715, 43.1982], [80.4199, 44.165], [80.4199, 44.6045], [79.9805, 44.8242], [79.9805, 44.9561], [81.7383, 45.3955], [82.0898, 45.2197], [82.5293, 45.2197], [82.2656, 45.6592], [83.0566, 47.2412], [83.6719, 47.0215], [84.7266, 47.0215], [84.9023, 46.8896], [85.5176, 47.0654], [85.6934, 47.2852], [85.5176, 48.1201], [85.7813, 48.4277], [86.5723, 48.5596], [86.8359, 48.8232], [86.748, 48.9551], [86.8359, 49.1309], [87.8027, 49.1748], [87.8906, 48.999], [87.7148, 48.9111], [88.0664, 48.7354], [87.9785, 48.6035], [88.5059, 48.3838], [88.6816, 48.1641], [89.1211, 47.9883], [89.5605, 48.0322], [89.7363, 47.8564], [90.0879, 47.8564], [90.3516, 47.6807], [90.5273, 47.2412], [90.8789, 46.9775], [91.0547, 46.582], [90.8789, 46.3184], [91.0547, 46.0107], [90.7031, 45.7471], [90.7031, 45.5273], [90.8789, 45.2197], [91.582, 45.0879], [93.5156, 44.9561], [94.7461, 44.3408], [95.3613, 44.2969], [95.3613, 44.0332], [95.5371, 43.9014], [95.8887, 43.2422], [96.3281, 42.9346], [96.416, 42.7588]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "54",
            "name": "西藏",
            "cp": [88.7695, 31.6846],
            "childNum": 7
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[79.0137, 34.3213], [79.1016, 34.4531], [79.8047, 34.4971], [79.8926, 34.8047], [80.2441, 35.2002], [80.332, 35.1563], [80.2441, 35.2881], [80.4199, 35.4199], [81.6504, 35.2441], [82.002, 35.332], [82.4414, 35.7275], [82.8809, 35.6836], [83.1445, 35.4199], [84.1992, 35.376], [85.0781, 35.7275], [85.6055, 35.6836], [86.1328, 35.8594], [86.2207, 36.167], [87.3633, 36.4307], [88.5938, 36.4746], [88.7695, 36.3428], [89.209, 36.2988], [89.7363, 36.0791], [89.3848, 36.0352], [89.4727, 35.9033], [89.7363, 35.7715], [89.7363, 35.4199], [89.4727, 35.376], [89.4727, 35.2441], [89.5605, 34.8926], [89.8242, 34.8486], [89.7363, 34.6729], [89.8242, 34.3652], [89.6484, 34.0137], [90.0879, 33.4863], [90.7031, 33.1348], [91.4063, 33.1348], [91.9336, 32.8271], [92.1973, 32.8271], [92.2852, 32.7393], [92.9883, 32.7393], [93.5156, 32.4756], [93.7793, 32.5635], [94.1309, 32.4316], [94.6582, 32.6074], [95.1855, 32.4316], [95.0098, 32.2998], [95.1855, 32.3438], [95.2734, 32.2119], [95.3613, 32.168], [95.3613, 31.9922], [95.4492, 31.8164], [95.8008, 31.6846], [95.9766, 31.8164], [96.1523, 31.5967], [96.2402, 31.9482], [96.5039, 31.7285], [96.8555, 31.6846], [96.7676, 31.9922], [97.2949, 32.0801], [97.3828, 32.5635], [97.7344, 32.5195], [98.1738, 32.3438], [98.4375, 31.8604], [98.877, 31.4209], [98.6133, 31.2012], [98.9648, 30.7617], [99.1406, 29.2676], [98.9648, 29.1357], [98.9648, 28.8281], [98.7891, 28.8721], [98.7891, 29.0039], [98.7012, 28.916], [98.6133, 28.5205], [98.7891, 28.3447], [98.7012, 28.2129], [98.3496, 28.125], [98.2617, 28.3887], [98.1738, 28.125], [97.5586, 28.5205], [97.2949, 28.0811], [97.3828, 27.9053], [97.0313, 27.7295], [96.5039, 28.125], [95.7129, 28.2568], [95.3613, 28.125], [95.2734, 27.9492], [94.2188, 27.5537], [93.8672, 27.0264], [93.6035, 26.9385], [92.1094, 26.8506], [92.0215, 27.4658], [91.582, 27.5537], [91.582, 27.9053], [91.4063, 28.0371], [91.0547, 27.8613], [90.7031, 28.0811], [89.8242, 28.2129], [89.6484, 28.1689], [89.1211, 27.5977], [89.1211, 27.334], [89.0332, 27.2021], [88.7695, 27.4219], [88.8574, 27.9932], [88.6816, 28.125], [88.1543, 27.9053], [87.8906, 27.9492], [87.7148, 27.8174], [87.0996, 27.8174], [86.748, 28.125], [86.5723, 28.125], [86.4844, 27.9053], [86.1328, 28.125], [86.0449, 27.9053], [85.6934, 28.3447], [85.6055, 28.2568], [85.166, 28.3447], [85.166, 28.6523], [84.9023, 28.5645], [84.4629, 28.7402], [84.2871, 28.8721], [84.1992, 29.2236], [84.1113, 29.2676], [83.584, 29.1797], [83.2324, 29.5752], [82.1777, 30.0586], [82.0898, 30.3223], [81.3867, 30.3662], [81.2109, 30.0146], [81.0352, 30.2344], [80.0684, 30.5859], [79.7168, 30.9375], [79.0137, 31.0693], [78.75, 31.333], [78.8379, 31.5967], [78.6621, 31.8164], [78.75, 31.9043], [78.4863, 32.124], [78.3984, 32.5195], [78.75, 32.6953], [78.9258, 32.3438], [79.2773, 32.5635], [79.1016, 33.1787], [78.6621, 33.6621], [78.6621, 34.1016], [78.9258, 34.1455], [79.0137, 34.3213]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "15",
            "name": "内蒙古",
            "cp": [117.5977, 44.3408],
            "childNum": 12
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[97.207, 42.8027], [99.4922, 42.583], [100.8105, 42.6709], [101.7773, 42.4951], [102.041, 42.2314], [102.7441, 42.1436], [103.3594, 41.8799], [103.8867, 41.792], [104.502, 41.8799], [104.502, 41.6602], [105.0293, 41.5723], [105.7324, 41.9238], [107.4023, 42.4512], [109.4238, 42.4512], [110.3906, 42.7588], [111.0059, 43.3301], [111.9727, 43.6816], [111.9727, 43.8135], [111.4453, 44.3848], [111.7969, 45], [111.9727, 45.0879], [113.6426, 44.7363], [114.1699, 44.9561], [114.5215, 45.3955], [115.6641, 45.4395], [116.1914, 45.7031], [116.2793, 45.9668], [116.543, 46.2744], [117.334, 46.3623], [117.4219, 46.582], [117.7734, 46.5381], [118.3008, 46.7578], [118.7402, 46.7139], [118.916, 46.7578], [119.0918, 46.6699], [119.707, 46.626], [119.9707, 46.7139], [119.707, 47.1973], [118.4766, 47.9883], [117.8613, 48.0322], [117.334, 47.6807], [116.8066, 47.9004], [116.1914, 47.8564], [115.9277, 47.6807], [115.5762, 47.9004], [115.4883, 48.1641], [115.8398, 48.252], [115.8398, 48.5596], [116.7188, 49.834], [117.7734, 49.5264], [118.5645, 49.9219], [119.2676, 50.0977], [119.3555, 50.3174], [119.1797, 50.3613], [119.5313, 50.7568], [119.5313, 50.8887], [119.707, 51.0645], [120.1465, 51.6797], [120.6738, 51.9434], [120.7617, 52.1191], [120.7617, 52.251], [120.5859, 52.3389], [120.6738, 52.5146], [120.4102, 52.6465], [120.0586, 52.6025], [120.0586, 52.7344], [120.8496, 53.2617], [121.4648, 53.3496], [121.8164, 53.042], [121.2012, 52.5586], [121.6406, 52.4268], [121.7285, 52.2949], [121.9922, 52.2949], [122.168, 52.5146], [122.6953, 52.251], [122.6074, 52.0752], [122.959, 51.3281], [123.3105, 51.2402], [123.6621, 51.3721], [124.3652, 51.2842], [124.541, 51.3721], [124.8926, 51.3721], [125.0684, 51.6357], [125.332, 51.6357], [126.0352, 51.0205], [125.7715, 50.7568], [125.7715, 50.5371], [125.332, 50.1416], [125.1563, 49.834], [125.2441, 49.1748], [124.8047, 49.1309], [124.4531, 48.1201], [124.2773, 48.5156], [122.4316, 47.373], [123.0469, 46.7139], [123.3984, 46.8896], [123.3984, 46.9775], [123.4863, 46.9775], [123.5742, 46.8457], [123.5742, 46.8896], [123.5742, 46.6699], [123.0469, 46.582], [123.2227, 46.2305], [122.7832, 46.0107], [122.6953, 45.7031], [122.4316, 45.8789], [122.2559, 45.791], [121.8164, 46.0107], [121.7285, 45.7471], [121.9043, 45.7031], [122.2559, 45.2637], [122.0801, 44.8682], [122.3438, 44.2529], [123.1348, 44.4727], [123.4863, 43.7256], [123.3105, 43.5059], [123.6621, 43.374], [123.5742, 43.0225], [123.3105, 42.9785], [123.1348, 42.8027], [122.7832, 42.7148], [122.3438, 42.8467], [122.3438, 42.6709], [121.9922, 42.7148], [121.7285, 42.4512], [121.4648, 42.4951], [120.498, 42.0996], [120.1465, 41.7041], [119.8828, 42.1875], [119.5313, 42.3633], [119.3555, 42.2754], [119.2676, 41.7041], [119.4434, 41.6162], [119.2676, 41.3086], [118.3887, 41.3086], [118.125, 41.748], [118.3008, 41.792], [118.3008, 42.0996], [118.125, 42.0557], [117.9492, 42.2314], [118.0371, 42.4072], [117.7734, 42.627], [117.5098, 42.583], [117.334, 42.4512], [116.8945, 42.4072], [116.8066, 42.0117], [116.2793, 42.0117], [116.0156, 41.792], [115.9277, 41.9238], [115.2246, 41.5723], [114.9609, 41.6162], [114.873, 42.0996], [114.5215, 42.1436], [114.1699, 41.792], [114.2578, 41.5723], [113.9063, 41.4404], [113.9941, 41.2207], [113.9063, 41.1328], [114.082, 40.7373], [114.082, 40.5176], [113.8184, 40.5176], [113.5547, 40.3418], [113.2031, 40.3857], [112.7637, 40.166], [112.3242, 40.2539], [111.9727, 39.5947], [111.4453, 39.6387], [111.3574, 39.4189], [111.0938, 39.375], [111.0938, 39.5947], [110.6543, 39.2871], [110.127, 39.4629], [110.2148, 39.2871], [109.8633, 39.2432], [109.9512, 39.1553], [108.9844, 38.3203], [109.0723, 38.0127], [108.8965, 37.9688], [108.8086, 38.0127], [108.7207, 37.7051], [108.1934, 37.6172], [107.666, 37.8809], [107.3145, 38.1006], [106.7871, 38.1885], [106.5234, 38.3203], [106.9629, 38.9795], [106.7871, 39.375], [106.3477, 39.2871], [105.9082, 38.7158], [105.8203, 37.793], [104.3262, 37.4414], [103.4473, 37.8369], [103.3594, 38.0127], [103.5352, 38.1445], [103.4473, 38.3643], [104.2383, 38.9795], [104.0625, 39.4189], [103.3594, 39.3311], [103.0078, 39.1113], [102.4805, 39.2432], [101.8652, 39.1113], [102.041, 38.8916], [101.7773, 38.6719], [101.3379, 38.7598], [101.25, 39.0234], [100.9863, 38.9355], [100.8105, 39.4189], [100.5469, 39.4189], [100.0195, 39.7705], [99.4922, 39.8584], [100.1074, 40.2539], [100.1953, 40.6494], [99.9316, 41.001], [99.2285, 40.8691], [99.0527, 40.6934], [98.9648, 40.7813], [98.7891, 40.6055], [98.5254, 40.7373], [98.6133, 40.6494], [98.3496, 40.5615], [98.3496, 40.9131], [97.4707, 41.4844], [97.8223, 41.6162], [97.8223, 41.748], [97.207, 42.8027]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "63",
            "name": "青海",
            "cp": [96.2402, 35.4199],
            "childNum": 8
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[89.7363, 36.0791], [89.9121, 36.0791], [90, 36.2549], [90.8789, 36.0352], [91.0547, 36.0791], [91.0547, 36.5186], [90.791, 36.6064], [90.7031, 36.7822], [91.3184, 37.0898], [91.0547, 37.4414], [90.5273, 37.8369], [90.6152, 38.3203], [90.3516, 38.2324], [90.1758, 38.4961], [92.373, 39.0234], [92.373, 39.1113], [93.1641, 39.1992], [93.1641, 38.9795], [93.6914, 38.9355], [93.8672, 38.7158], [94.3066, 38.7598], [94.5703, 38.3643], [95.0098, 38.4082], [95.4492, 38.2764], [95.7129, 38.3643], [96.2402, 38.1006], [96.416, 38.2324], [96.6797, 38.1885], [96.6797, 38.4521], [97.1191, 38.584], [97.0313, 39.1992], [98.1738, 38.8037], [98.3496, 39.0234], [98.6133, 38.9355], [98.7891, 39.0674], [99.1406, 38.9355], [99.8438, 38.3643], [100.1953, 38.2764], [100.0195, 38.4521], [100.1074, 38.4961], [100.459, 38.2764], [100.7227, 38.2324], [101.1621, 37.8369], [101.5137, 37.8809], [101.7773, 37.6172], [101.9531, 37.7051], [102.1289, 37.4414], [102.5684, 37.1777], [102.4805, 36.958], [102.6563, 36.8262], [102.5684, 36.7383], [102.832, 36.3428], [103.0078, 36.2549], [102.9199, 36.0791], [102.9199, 35.9033], [102.6563, 35.7715], [102.832, 35.5957], [102.4805, 35.5957], [102.3047, 35.4199], [102.3926, 35.2002], [101.9531, 34.8486], [101.9531, 34.6289], [102.2168, 34.4092], [102.1289, 34.2773], [101.6895, 34.1016], [100.9863, 34.3652], [100.8105, 34.2773], [101.25, 33.6621], [101.5137, 33.7061], [101.6016, 33.5303], [101.7773, 33.5303], [101.6895, 33.3105], [101.7773, 33.2227], [101.6016, 33.1348], [101.1621, 33.2227], [101.25, 32.6953], [100.7227, 32.6514], [100.7227, 32.5195], [100.3711, 32.7393], [100.1074, 32.6514], [100.1074, 32.8711], [99.8438, 33.0029], [99.7559, 32.7393], [99.2285, 32.915], [99.2285, 33.0469], [98.877, 33.1787], [98.4375, 34.0576], [97.8223, 34.1895], [97.6465, 34.1016], [97.7344, 33.9258], [97.3828, 33.8818], [97.4707, 33.5742], [97.7344, 33.3984], [97.3828, 32.8711], [97.4707, 32.6953], [97.7344, 32.5195], [97.3828, 32.5635], [97.2949, 32.0801], [96.7676, 31.9922], [96.8555, 31.6846], [96.5039, 31.7285], [96.2402, 31.9482], [96.1523, 31.5967], [95.9766, 31.8164], [95.8008, 31.6846], [95.4492, 31.8164], [95.3613, 31.9922], [95.3613, 32.168], [95.2734, 32.2119], [95.1855, 32.3438], [95.0098, 32.2998], [95.1855, 32.4316], [94.6582, 32.6074], [94.1309, 32.4316], [93.7793, 32.5635], [93.5156, 32.4756], [92.9883, 32.7393], [92.2852, 32.7393], [92.1973, 32.8271], [91.9336, 32.8271], [91.4063, 33.1348], [90.7031, 33.1348], [90.0879, 33.4863], [89.6484, 34.0137], [89.8242, 34.3652], [89.7363, 34.6729], [89.8242, 34.8486], [89.5605, 34.8926], [89.4727, 35.2441], [89.4727, 35.376], [89.7363, 35.4199], [89.7363, 35.7715], [89.4727, 35.9033], [89.3848, 36.0352], [89.7363, 36.0791]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "51",
            "name": "四川",
            "cp": [102.9199, 30.1904],
            "childNum": 21
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[101.7773, 33.5303], [101.8652, 33.5742], [101.9531, 33.4424], [101.8652, 33.0908], [102.4805, 33.4424], [102.2168, 33.9258], [102.9199, 34.3213], [103.0957, 34.1895], [103.1836, 33.7939], [104.1504, 33.6182], [104.2383, 33.3984], [104.4141, 33.3105], [104.3262, 33.2227], [104.4141, 33.0469], [104.3262, 32.8711], [104.4141, 32.7393], [105.2051, 32.6074], [105.3809, 32.7393], [105.3809, 32.8711], [105.4688, 32.915], [105.5566, 32.7393], [106.084, 32.8711], [106.084, 32.7393], [106.3477, 32.6514], [107.0508, 32.6953], [107.1387, 32.4756], [107.2266, 32.4316], [107.4023, 32.5195], [108.0176, 32.168], [108.2813, 32.2559], [108.5449, 32.2119], [108.3691, 32.168], [108.2813, 31.9043], [108.5449, 31.6846], [108.1934, 31.5088], [107.9297, 30.8496], [107.4902, 30.8496], [107.4023, 30.7617], [107.4902, 30.6299], [107.0508, 30.0146], [106.7871, 30.0146], [106.6113, 30.3223], [106.2598, 30.1904], [105.8203, 30.4541], [105.6445, 30.2783], [105.5566, 30.1025], [105.7324, 29.8828], [105.293, 29.5313], [105.4688, 29.3115], [105.7324, 29.2676], [105.8203, 28.96], [106.2598, 28.8721], [106.3477, 28.5205], [105.9961, 28.7402], [105.6445, 28.4326], [105.9082, 28.125], [106.1719, 28.125], [106.3477, 27.8174], [105.6445, 27.6416], [105.5566, 27.7734], [105.293, 27.7295], [105.2051, 27.9932], [105.0293, 28.0811], [104.8535, 27.9053], [104.4141, 27.9492], [104.3262, 28.0371], [104.4141, 28.125], [104.4141, 28.2568], [104.2383, 28.4326], [104.4141, 28.6084], [103.8867, 28.6523], [103.7988, 28.3008], [103.4473, 28.125], [103.4473, 27.7734], [102.9199, 27.29], [103.0078, 26.3672], [102.6563, 26.1914], [102.5684, 26.3672], [102.1289, 26.1035], [101.8652, 26.0596], [101.6016, 26.2354], [101.6895, 26.3672], [101.4258, 26.5869], [101.4258, 26.8066], [101.4258, 26.7188], [101.1621, 27.0264], [101.1621, 27.1582], [100.7227, 27.8613], [100.3711, 27.8174], [100.2832, 27.7295], [100.0195, 28.125], [100.1953, 28.3447], [99.668, 28.8281], [99.4043, 28.5205], [99.4043, 28.1689], [99.2285, 28.3008], [99.1406, 29.2676], [98.9648, 30.7617], [98.6133, 31.2012], [98.877, 31.4209], [98.4375, 31.8604], [98.1738, 32.3438], [97.7344, 32.5195], [97.4707, 32.6953], [97.3828, 32.8711], [97.7344, 33.3984], [97.4707, 33.5742], [97.3828, 33.8818], [97.7344, 33.9258], [97.6465, 34.1016], [97.8223, 34.1895], [98.4375, 34.0576], [98.877, 33.1787], [99.2285, 33.0469], [99.2285, 32.915], [99.7559, 32.7393], [99.8438, 33.0029], [100.1074, 32.8711], [100.1074, 32.6514], [100.3711, 32.7393], [100.7227, 32.5195], [100.7227, 32.6514], [101.25, 32.6953], [101.1621, 33.2227], [101.6016, 33.1348], [101.7773, 33.2227], [101.6895, 33.3105], [101.7773, 33.5303]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "23",
            "name": "黑龙江",
            "cp": [128.1445, 48.5156],
            "childNum": 13
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[121.4648, 53.3496], [123.6621, 53.5693], [124.8926, 53.0859], [125.0684, 53.2178], [125.5957, 53.0859], [125.6836, 52.9102], [126.123, 52.7783], [126.0352, 52.6025], [126.2109, 52.5146], [126.3867, 52.2949], [126.3867, 52.207], [126.5625, 52.1631], [126.4746, 51.9434], [126.9141, 51.3721], [126.8262, 51.2842], [127.002, 51.3281], [126.9141, 51.1084], [127.2656, 50.7568], [127.3535, 50.2734], [127.6172, 50.2295], [127.5293, 49.8779], [127.793, 49.6143], [128.7598, 49.5703], [129.1113, 49.3506], [129.4629, 49.4385], [130.2539, 48.8672], [130.6934, 48.8672], [130.5176, 48.6475], [130.8691, 48.2959], [130.6934, 48.1201], [131.0449, 47.6807], [132.5391, 47.7246], [132.627, 47.9443], [133.0664, 48.1201], [133.5059, 48.1201], [134.209, 48.3838], [135.0879, 48.4277], [134.7363, 48.252], [134.5605, 47.9883], [134.7363, 47.6807], [134.5605, 47.4609], [134.3848, 47.4609], [134.209, 47.2852], [134.209, 47.1533], [133.8574, 46.5381], [133.9453, 46.2744], [133.5059, 45.835], [133.418, 45.5713], [133.2422, 45.5273], [133.0664, 45.1318], [132.8906, 45.0439], [131.9238, 45.3516], [131.5723, 45.0439], [131.0449, 44.8682], [131.3086, 44.0771], [131.2207, 43.7256], [131.3086, 43.4619], [130.8691, 43.418], [130.5176, 43.6377], [130.3418, 43.9893], [129.9902, 43.8574], [129.9023, 44.0332], [129.8145, 43.9014], [129.2871, 43.8135], [129.1992, 43.5938], [128.8477, 43.5498], [128.4961, 44.165], [128.4082, 44.4727], [128.0566, 44.3408], [128.0566, 44.1211], [127.7051, 44.1211], [127.5293, 44.6045], [127.0898, 44.6045], [127.002, 44.7803], [127.0898, 45], [126.9141, 45.1318], [126.5625, 45.2637], [126.0352, 45.1758], [125.7715, 45.3076], [125.6836, 45.5273], [125.0684, 45.3955], [124.8926, 45.5273], [124.3652, 45.4395], [124.0137, 45.7471], [123.9258, 46.2305], [123.2227, 46.2305], [123.0469, 46.582], [123.5742, 46.6699], [123.5742, 46.8896], [123.5742, 46.8457], [123.4863, 46.9775], [123.3984, 46.9775], [123.3984, 46.8896], [123.0469, 46.7139], [122.4316, 47.373], [124.2773, 48.5156], [124.4531, 48.1201], [124.8047, 49.1309], [125.2441, 49.1748], [125.1563, 49.834], [125.332, 50.1416], [125.7715, 50.5371], [125.7715, 50.7568], [126.0352, 51.0205], [125.332, 51.6357], [125.0684, 51.6357], [124.8926, 51.3721], [124.541, 51.3721], [124.3652, 51.2842], [123.6621, 51.3721], [123.3105, 51.2402], [122.959, 51.3281], [122.6074, 52.0752], [122.6953, 52.251], [122.168, 52.5146], [121.9922, 52.2949], [121.7285, 52.2949], [121.6406, 52.4268], [121.2012, 52.5586], [121.8164, 53.042], [121.4648, 53.3496]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "62",
            "name": "甘肃",
            "cp": [95.7129, 40.166],
            "childNum": 14
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[96.416, 42.7148], [97.207, 42.8027], [97.8223, 41.748], [97.8223, 41.6162], [97.4707, 41.4844], [98.3496, 40.9131], [98.3496, 40.5615], [98.6133, 40.6494], [98.5254, 40.7373], [98.7891, 40.6055], [98.9648, 40.7813], [99.0527, 40.6934], [99.2285, 40.8691], [99.9316, 41.001], [100.1953, 40.6494], [100.1074, 40.2539], [99.4922, 39.8584], [100.0195, 39.7705], [100.5469, 39.4189], [100.8105, 39.4189], [100.9863, 38.9355], [101.25, 39.0234], [101.3379, 38.7598], [101.7773, 38.6719], [102.041, 38.8916], [101.8652, 39.1113], [102.4805, 39.2432], [103.0078, 39.1113], [103.3594, 39.3311], [104.0625, 39.4189], [104.2383, 38.9795], [103.4473, 38.3643], [103.5352, 38.1445], [103.3594, 38.0127], [103.4473, 37.8369], [104.3262, 37.4414], [104.5898, 37.4414], [104.5898, 37.2217], [104.8535, 37.2217], [105.293, 36.8262], [105.2051, 36.6943], [105.4688, 36.123], [105.293, 35.9912], [105.3809, 35.7715], [105.7324, 35.7275], [105.8203, 35.5518], [105.9961, 35.4639], [105.9082, 35.4199], [105.9961, 35.4199], [106.084, 35.376], [106.2598, 35.4199], [106.3477, 35.2441], [106.5234, 35.332], [106.4355, 35.6836], [106.6992, 35.6836], [106.9629, 35.8154], [106.875, 36.123], [106.5234, 36.2549], [106.5234, 36.4746], [106.4355, 36.5625], [106.6113, 36.7822], [106.6113, 37.0898], [107.3145, 37.0898], [107.3145, 36.9141], [108.7207, 36.3428], [108.6328, 35.9912], [108.5449, 35.8594], [108.6328, 35.5518], [108.5449, 35.2881], [107.7539, 35.2881], [107.7539, 35.1123], [107.8418, 35.0244], [107.666, 34.9365], [107.2266, 34.8926], [106.9629, 35.0684], [106.6113, 35.0684], [106.5234, 34.7607], [106.3477, 34.585], [106.6992, 34.3213], [106.5234, 34.2773], [106.6113, 34.1455], [106.4355, 33.9258], [106.5234, 33.5303], [105.9961, 33.6182], [105.7324, 33.3984], [105.9961, 33.1787], [105.9082, 33.0029], [105.4688, 32.915], [105.3809, 32.8711], [105.3809, 32.7393], [105.2051, 32.6074], [104.4141, 32.7393], [104.3262, 32.8711], [104.4141, 33.0469], [104.3262, 33.2227], [104.4141, 33.3105], [104.2383, 33.3984], [104.1504, 33.6182], [103.1836, 33.7939], [103.0957, 34.1895], [102.9199, 34.3213], [102.2168, 33.9258], [102.4805, 33.4424], [101.8652, 33.0908], [101.9531, 33.4424], [101.8652, 33.5742], [101.7773, 33.5303], [101.6016, 33.5303], [101.5137, 33.7061], [101.25, 33.6621], [100.8105, 34.2773], [100.9863, 34.3652], [101.6895, 34.1016], [102.1289, 34.2773], [102.2168, 34.4092], [101.9531, 34.6289], [101.9531, 34.8486], [102.3926, 35.2002], [102.3047, 35.4199], [102.4805, 35.5957], [102.832, 35.5957], [102.6563, 35.7715], [102.9199, 35.9033], [102.9199, 36.0791], [103.0078, 36.2549], [102.832, 36.3428], [102.5684, 36.7383], [102.6563, 36.8262], [102.4805, 36.958], [102.5684, 37.1777], [102.1289, 37.4414], [101.9531, 37.7051], [101.7773, 37.6172], [101.5137, 37.8809], [101.1621, 37.8369], [100.7227, 38.2324], [100.459, 38.2764], [100.1074, 38.4961], [100.0195, 38.4521], [100.1953, 38.2764], [99.8438, 38.3643], [99.1406, 38.9355], [98.7891, 39.0674], [98.6133, 38.9355], [98.3496, 39.0234], [98.1738, 38.8037], [97.0313, 39.1992], [97.1191, 38.584], [96.6797, 38.4521], [96.6797, 38.1885], [96.416, 38.2324], [96.2402, 38.1006], [95.7129, 38.3643], [95.4492, 38.2764], [95.0098, 38.4082], [94.5703, 38.3643], [94.3066, 38.7598], [93.8672, 38.7158], [93.6914, 38.9355], [93.1641, 38.9795], [93.1641, 39.1992], [92.373, 39.1113], [92.373, 39.3311], [92.6367, 39.6387], [93.0762, 40.6494], [93.8672, 40.6934], [94.043, 41.0889], [94.5703, 41.4844], [95.1855, 41.792], [95.2734, 41.6162], [95.9766, 41.9238], [96.2402, 42.2314], [96.0645, 42.3193], [95.9766, 42.4951], [96.416, 42.7148]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "53",
            "name": "云南",
            "cp": [101.8652, 25.1807],
            "childNum": 16
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[98.1738, 28.125], [98.2617, 28.3887], [98.3496, 28.125], [98.7012, 28.2129], [98.7891, 28.3447], [98.6133, 28.5205], [98.7012, 28.916], [98.7891, 29.0039], [98.7891, 28.8721], [98.9648, 28.8281], [98.9648, 29.1357], [99.1406, 29.2676], [99.2285, 28.3008], [99.4043, 28.1689], [99.4043, 28.5205], [99.668, 28.8281], [100.1953, 28.3447], [100.0195, 28.125], [100.2832, 27.7295], [100.3711, 27.8174], [100.7227, 27.8613], [101.1621, 27.1582], [101.1621, 27.0264], [101.4258, 26.7188], [101.4258, 26.8066], [101.4258, 26.5869], [101.6895, 26.3672], [101.6016, 26.2354], [101.8652, 26.0596], [102.1289, 26.1035], [102.5684, 26.3672], [102.6563, 26.1914], [103.0078, 26.3672], [102.9199, 27.29], [103.4473, 27.7734], [103.4473, 28.125], [103.7988, 28.3008], [103.8867, 28.6523], [104.4141, 28.6084], [104.2383, 28.4326], [104.4141, 28.2568], [104.4141, 28.125], [104.3262, 28.0371], [104.4141, 27.9492], [104.8535, 27.9053], [105.0293, 28.0811], [105.2051, 27.9932], [105.293, 27.7295], [105.2051, 27.3779], [104.5898, 27.334], [104.4141, 27.4658], [104.1504, 27.2461], [103.8867, 27.4219], [103.623, 27.0264], [103.7109, 26.9824], [103.7109, 26.7627], [103.8867, 26.543], [104.4141, 26.6748], [104.6777, 26.4111], [104.3262, 25.708], [104.8535, 25.2246], [104.5898, 25.0488], [104.6777, 24.9609], [104.502, 24.7412], [104.6777, 24.3457], [104.7656, 24.4775], [105.0293, 24.4336], [105.2051, 24.082], [105.4688, 24.0381], [105.5566, 24.126], [105.9961, 24.126], [106.1719, 23.8184], [106.1719, 23.5547], [105.6445, 23.4229], [105.5566, 23.2031], [105.293, 23.3789], [104.8535, 23.1592], [104.7656, 22.8516], [104.3262, 22.6758], [104.1504, 22.8076], [103.9746, 22.5439], [103.623, 22.7637], [103.5352, 22.5879], [103.3594, 22.8076], [103.0957, 22.4561], [102.4805, 22.7637], [102.3047, 22.4121], [101.8652, 22.3682], [101.7773, 22.5], [101.6016, 22.1924], [101.8652, 21.6211], [101.7773, 21.1377], [101.6016, 21.2256], [101.25, 21.1816], [101.1621, 21.7529], [100.6348, 21.4453], [100.1074, 21.4893], [99.9316, 22.0605], [99.2285, 22.1484], [99.4043, 22.5879], [99.3164, 22.7197], [99.4922, 23.0713], [98.877, 23.2031], [98.7012, 23.9502], [98.877, 24.126], [98.1738, 24.082], [97.7344, 23.8623], [97.5586, 23.9063], [97.7344, 24.126], [97.6465, 24.4336], [97.5586, 24.4336], [97.5586, 24.7412], [97.7344, 24.8291], [97.8223, 25.2686], [98.1738, 25.4004], [98.1738, 25.6201], [98.3496, 25.5762], [98.5254, 25.8398], [98.7012, 25.8838], [98.6133, 26.0596], [98.7012, 26.1475], [98.7891, 26.5869], [98.7012, 27.5098], [98.5254, 27.6416], [98.3496, 27.5098], [98.1738, 28.125]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "45",
            "name": "广西",
            "cp": [108.2813, 23.6426],
            "childNum": 14
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[104.502, 24.7412], [104.6777, 24.6094], [105.2051, 24.9609], [105.9961, 24.6533], [106.1719, 24.7852], [106.1719, 24.9609], [106.875, 25.1807], [107.0508, 25.2686], [106.9629, 25.4883], [107.2266, 25.6201], [107.4902, 25.2246], [107.7539, 25.2246], [107.8418, 25.1367], [108.1055, 25.2246], [108.1934, 25.4443], [108.3691, 25.5322], [108.6328, 25.3125], [108.6328, 25.5762], [109.0723, 25.5322], [108.9844, 25.752], [109.3359, 25.708], [109.5117, 26.0156], [109.7754, 25.8838], [109.9512, 26.1914], [110.2148, 25.9717], [110.5664, 26.3232], [111.1816, 26.3232], [111.2695, 26.2354], [111.2695, 25.8838], [111.4453, 25.8398], [111.0059, 25.0049], [111.0938, 24.9609], [111.3574, 25.1367], [111.5332, 24.6533], [111.709, 24.7852], [112.0605, 24.7412], [111.8848, 24.6533], [112.0605, 24.3457], [111.8848, 24.2139], [111.8848, 23.9941], [111.7969, 23.8184], [111.6211, 23.8184], [111.6211, 23.6865], [111.3574, 23.4668], [111.4453, 23.0273], [111.2695, 22.8076], [110.7422, 22.5439], [110.7422, 22.2803], [110.6543, 22.1484], [110.3027, 22.1484], [110.3027, 21.8848], [109.9512, 21.8408], [109.8633, 21.665], [109.7754, 21.6211], [109.7754, 21.4014], [109.5996, 21.4453], [109.1602, 21.3574], [109.248, 20.874], [109.0723, 20.9619], [109.0723, 21.5332], [108.7207, 21.5332], [108.6328, 21.665], [108.2813, 21.4893], [107.8418, 21.6211], [107.4023, 21.6211], [107.0508, 21.7969], [107.0508, 21.9287], [106.6992, 22.0166], [106.6113, 22.4121], [106.7871, 22.7637], [106.6992, 22.8955], [105.9082, 22.9395], [105.5566, 23.0713], [105.5566, 23.2031], [105.6445, 23.4229], [106.1719, 23.5547], [106.1719, 23.8184], [105.9961, 24.126], [105.5566, 24.126], [105.4688, 24.0381], [105.2051, 24.082], [105.0293, 24.4336], [104.7656, 24.4775], [104.6777, 24.3457], [104.502, 24.7412]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "43",
            "name": "湖南",
            "cp": [111.5332, 27.3779],
            "childNum": 14
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[109.248, 28.4766], [109.248, 29.1357], [109.5117, 29.6191], [109.6875, 29.6191], [109.7754, 29.751], [110.4785, 29.6631], [110.6543, 29.751], [110.4785, 30.0146], [110.8301, 30.1465], [111.7969, 29.9268], [112.2363, 29.5313], [112.5, 29.6191], [112.6758, 29.5752], [112.9395, 29.7949], [113.0273, 29.751], [112.9395, 29.4873], [113.0273, 29.4434], [113.5547, 29.8389], [113.5547, 29.707], [113.7305, 29.5752], [113.6426, 29.3115], [113.7305, 29.0918], [113.9063, 29.0479], [114.1699, 28.8281], [114.082, 28.5645], [114.2578, 28.3447], [113.7305, 27.9492], [113.6426, 27.5977], [113.6426, 27.3779], [113.8184, 27.29], [113.7305, 27.1143], [113.9063, 26.9385], [113.9063, 26.6309], [114.082, 26.5869], [113.9941, 26.1914], [114.2578, 26.1475], [113.9941, 26.0596], [113.9063, 25.4443], [113.6426, 25.3125], [113.2031, 25.5322], [112.8516, 25.3564], [113.0273, 25.2246], [113.0273, 24.9609], [112.8516, 24.917], [112.5879, 25.1367], [112.2363, 25.1807], [112.1484, 24.873], [112.0605, 24.7412], [111.709, 24.7852], [111.5332, 24.6533], [111.3574, 25.1367], [111.0938, 24.9609], [111.0059, 25.0049], [111.4453, 25.8398], [111.2695, 25.8838], [111.2695, 26.2354], [111.1816, 26.3232], [110.5664, 26.3232], [110.2148, 25.9717], [109.9512, 26.1914], [109.7754, 25.8838], [109.5117, 26.0156], [109.4238, 26.2793], [109.248, 26.3232], [109.4238, 26.5869], [109.3359, 26.7188], [109.5117, 26.8066], [109.5117, 27.0264], [109.3359, 27.1582], [108.8965, 27.0264], [108.8086, 27.1143], [109.4238, 27.5977], [109.3359, 27.9053], [109.3359, 28.2568], [109.248, 28.4766]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "61",
            "name": "陕西",
            "cp": [109.5996, 35.6396],
            "childNum": 10
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[105.4688, 32.915], [105.9082, 33.0029], [105.9961, 33.1787], [105.7324, 33.3984], [105.9961, 33.6182], [106.5234, 33.5303], [106.4355, 33.9258], [106.6113, 34.1455], [106.5234, 34.2773], [106.6992, 34.3213], [106.3477, 34.585], [106.5234, 34.7607], [106.6113, 35.0684], [106.9629, 35.0684], [107.2266, 34.8926], [107.666, 34.9365], [107.8418, 35.0244], [107.7539, 35.1123], [107.7539, 35.2881], [108.5449, 35.2881], [108.6328, 35.5518], [108.5449, 35.8594], [108.6328, 35.9912], [108.7207, 36.3428], [107.3145, 36.9141], [107.3145, 37.0898], [107.3145, 37.6172], [107.666, 37.8809], [108.1934, 37.6172], [108.7207, 37.7051], [108.8086, 38.0127], [108.8965, 37.9688], [109.0723, 38.0127], [108.9844, 38.3203], [109.9512, 39.1553], [109.8633, 39.2432], [110.2148, 39.2871], [110.127, 39.4629], [110.6543, 39.2871], [111.0938, 39.5947], [111.0938, 39.375], [111.1816, 39.2432], [110.918, 38.7158], [110.8301, 38.4961], [110.4785, 38.1885], [110.4785, 37.9688], [110.8301, 37.6611], [110.3906, 37.002], [110.4785, 36.123], [110.5664, 35.6396], [110.2148, 34.8926], [110.2148, 34.6729], [110.3906, 34.585], [110.4785, 34.2334], [110.6543, 34.1455], [110.6543, 33.8379], [111.0059, 33.5303], [111.0059, 33.2666], [110.7422, 33.1348], [110.5664, 33.2666], [110.3027, 33.1787], [109.5996, 33.2666], [109.4238, 33.1348], [109.7754, 33.0469], [109.7754, 32.915], [110.127, 32.7393], [110.127, 32.6074], [109.6875, 32.6074], [109.5117, 32.4316], [109.5996, 31.7285], [109.248, 31.7285], [109.0723, 31.9482], [108.5449, 32.2119], [108.2813, 32.2559], [108.0176, 32.168], [107.4023, 32.5195], [107.2266, 32.4316], [107.1387, 32.4756], [107.0508, 32.6953], [106.3477, 32.6514], [106.084, 32.7393], [106.084, 32.8711], [105.5566, 32.7393], [105.4688, 32.915]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "44",
            "name": "广东",
            "cp": [113.4668, 22.8076],
            "childNum": 21
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[109.7754, 21.4014], [109.7754, 21.6211], [109.8633, 21.665], [109.9512, 21.8408], [110.3027, 21.8848], [110.3027, 22.1484], [110.6543, 22.1484], [110.7422, 22.2803], [110.7422, 22.5439], [111.2695, 22.8076], [111.4453, 23.0273], [111.3574, 23.4668], [111.6211, 23.6865], [111.6211, 23.8184], [111.7969, 23.8184], [111.8848, 23.9941], [111.8848, 24.2139], [112.0605, 24.3457], [111.8848, 24.6533], [112.0605, 24.7412], [112.1484, 24.873], [112.2363, 25.1807], [112.5879, 25.1367], [112.8516, 24.917], [113.0273, 24.9609], [113.0273, 25.2246], [112.8516, 25.3564], [113.2031, 25.5322], [113.6426, 25.3125], [113.9063, 25.4443], [113.9941, 25.2686], [114.6094, 25.4004], [114.7852, 25.2686], [114.6973, 25.1367], [114.4336, 24.9609], [114.1699, 24.6973], [114.4336, 24.5215], [115.4004, 24.7852], [115.8398, 24.5654], [115.752, 24.7852], [115.9277, 24.917], [116.2793, 24.7852], [116.3672, 24.873], [116.543, 24.6094], [116.7188, 24.6533], [116.9824, 24.1699], [116.9824, 23.9063], [117.1582, 23.5547], [117.334, 23.2471], [116.8945, 23.3789], [116.6309, 23.1152], [116.543, 22.8516], [115.9277, 22.7197], [115.6641, 22.7637], [115.5762, 22.6318], [115.0488, 22.6758], [114.6094, 22.3682], [114.3457, 22.5439], [113.9941, 22.5], [113.8184, 22.1924], [114.3457, 22.1484], [114.4336, 22.0166], [114.082, 21.9287], [113.9941, 21.7969], [113.5547, 22.0166], [113.1152, 21.8408], [112.9395, 21.5771], [112.4121, 21.4453], [112.2363, 21.5332], [111.5332, 21.4893], [111.2695, 21.3574], [110.7422, 21.3574], [110.6543, 21.2256], [110.7422, 20.918], [110.4785, 20.874], [110.6543, 20.2588], [110.5664, 20.2588], [110.3906, 20.127], [110.0391, 20.127], [109.8633, 20.127], [109.8633, 20.3027], [109.5996, 20.918], [109.7754, 21.4014], [109.7754, 21.4014]], [[113.5986, 22.1649], [113.6096, 22.1265], [113.5547, 22.11], [113.5437, 22.2034], [113.5767, 22.2034], [113.5986, 22.1649]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "22",
            "name": "吉林",
            "cp": [126.4746, 43.5938],
            "childNum": 9
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[123.2227, 46.2305], [123.9258, 46.2305], [124.0137, 45.7471], [124.3652, 45.4395], [124.8926, 45.5273], [125.0684, 45.3955], [125.6836, 45.5273], [125.7715, 45.3076], [126.0352, 45.1758], [126.5625, 45.2637], [126.9141, 45.1318], [127.0898, 45], [127.002, 44.7803], [127.0898, 44.6045], [127.5293, 44.6045], [127.7051, 44.1211], [128.0566, 44.1211], [128.0566, 44.3408], [128.4082, 44.4727], [128.4961, 44.165], [128.8477, 43.5498], [129.1992, 43.5938], [129.2871, 43.8135], [129.8145, 43.9014], [129.9023, 44.0332], [129.9902, 43.8574], [130.3418, 43.9893], [130.5176, 43.6377], [130.8691, 43.418], [131.3086, 43.4619], [131.3086, 43.3301], [131.1328, 42.9346], [130.4297, 42.7148], [130.6055, 42.6709], [130.6055, 42.4512], [130.2539, 42.7588], [130.2539, 42.8906], [130.166, 42.9785], [129.9023, 43.0225], [129.7266, 42.4951], [129.375, 42.4512], [128.9355, 42.0117], [128.0566, 42.0117], [128.3203, 41.5723], [128.1445, 41.3525], [127.0898, 41.5283], [127.1777, 41.5723], [126.9141, 41.792], [126.6504, 41.6602], [126.4746, 41.3965], [126.123, 40.957], [125.6836, 40.8691], [125.5957, 40.9131], [125.7715, 41.2207], [125.332, 41.6602], [125.332, 41.9678], [125.4199, 42.0996], [125.332, 42.1436], [124.8926, 42.8027], [124.8926, 43.0664], [124.7168, 43.0664], [124.4531, 42.8467], [124.2773, 43.2422], [123.8379, 43.4619], [123.6621, 43.374], [123.3105, 43.5059], [123.4863, 43.7256], [123.1348, 44.4727], [122.3438, 44.2529], [122.0801, 44.8682], [122.2559, 45.2637], [121.9043, 45.7031], [121.7285, 45.7471], [121.8164, 46.0107], [122.2559, 45.791], [122.4316, 45.8789], [122.6953, 45.7031], [122.7832, 46.0107], [123.2227, 46.2305]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "13",
            "name": "河北",
            "cp": [115.4004, 37.9688],
            "childNum": 11
        },
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": [[[[114.5215, 39.5068], [114.3457, 39.8584], [113.9941, 39.9902], [114.5215, 40.3418], [114.3457, 40.3857], [114.2578, 40.6055], [114.082, 40.7373], [113.9063, 41.1328], [113.9941, 41.2207], [113.9063, 41.4404], [114.2578, 41.5723], [114.1699, 41.792], [114.5215, 42.1436], [114.873, 42.0996], [114.9609, 41.6162], [115.2246, 41.5723], [115.9277, 41.9238], [116.0156, 41.792], [116.2793, 42.0117], [116.8066, 42.0117], [116.8945, 42.4072], [117.334, 42.4512], [117.5098, 42.583], [117.7734, 42.627], [118.0371, 42.4072], [117.9492, 42.2314], [118.125, 42.0557], [118.3008, 42.0996], [118.3008, 41.792], [118.125, 41.748], [118.3887, 41.3086], [119.2676, 41.3086], [118.8281, 40.8252], [119.2676, 40.5176], [119.5313, 40.5615], [119.707, 40.1221], [119.8828, 39.9463], [119.5313, 39.6826], [119.4434, 39.4189], [118.916, 39.0674], [118.4766, 38.9355], [118.125, 39.0234], [118.0371, 39.1992], [118.0371, 39.2432], [117.8613, 39.4189], [117.9492, 39.5947], [117.6855, 39.5947], [117.5098, 39.7705], [117.5098, 39.9902], [117.6855, 39.9902], [117.6855, 40.0781], [117.4219, 40.21], [117.2461, 40.5176], [117.4219, 40.6494], [116.9824, 40.6934], [116.6309, 41.0449], [116.3672, 40.9131], [116.4551, 40.7813], [116.1914, 40.7813], [116.1035, 40.6055], [115.752, 40.5615], [115.9277, 40.2539], [115.4004, 39.9463], [115.4883, 39.6387], [115.752, 39.5068], [116.1914, 39.5947], [116.3672, 39.4629], [116.543, 39.5947], [116.8066, 39.5947], [116.8945, 39.1113], [116.7188, 38.9355], [116.7188, 38.8037], [117.2461, 38.54], [117.5977, 38.6279], [117.9492, 38.3203], [117.4219, 37.8369], [116.8066, 37.8369], [116.4551, 37.4854], [116.2793, 37.5732], [116.2793, 37.3535], [116.0156, 37.3535], [115.752, 36.9141], [115.3125, 36.5186], [115.4883, 36.167], [115.3125, 36.0791], [115.1367, 36.2109], [114.9609, 36.0791], [114.873, 36.123], [113.7305, 36.3428], [113.4668, 36.6504], [113.7305, 36.8701], [113.7305, 37.1338], [114.1699, 37.6611], [113.9941, 37.7051], [113.8184, 38.1445], [113.5547, 38.2764], [113.5547, 38.54], [113.8184, 38.8037], [113.8184, 38.9355], [113.9063, 39.0234], [114.3457, 39.0674], [114.5215, 39.5068]]], [[[117.2461, 40.0781], [117.1582, 39.8145], [117.1582, 39.6387], [116.8945, 39.6826], [116.8945, 39.8145], [116.8066, 39.9902], [117.2461, 40.0781]]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "42",
            "name": "湖北",
            "cp": [112.2363, 31.1572],
            "childNum": 17
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[110.2148, 31.1572], [110.127, 31.377], [109.6875, 31.5527], [109.7754, 31.6846], [109.5996, 31.7285], [109.5117, 32.4316], [109.6875, 32.6074], [110.127, 32.6074], [110.127, 32.7393], [109.7754, 32.915], [109.7754, 33.0469], [109.4238, 33.1348], [109.5996, 33.2666], [110.3027, 33.1787], [110.5664, 33.2666], [110.7422, 33.1348], [111.0059, 33.2666], [111.5332, 32.6074], [112.3242, 32.3438], [113.2031, 32.4316], [113.4668, 32.2998], [113.7305, 32.4316], [113.8184, 31.8604], [113.9941, 31.7725], [114.1699, 31.8604], [114.5215, 31.7725], [114.6094, 31.5527], [114.7852, 31.4648], [115.1367, 31.5967], [115.2246, 31.4209], [115.4004, 31.4209], [115.5762, 31.2012], [116.0156, 31.0254], [115.752, 30.6738], [116.1035, 30.1904], [116.1035, 29.8389], [115.9277, 29.707], [115.4883, 29.7949], [114.873, 29.3994], [114.2578, 29.3555], [113.9063, 29.0479], [113.7305, 29.0918], [113.6426, 29.3115], [113.7305, 29.5752], [113.5547, 29.707], [113.5547, 29.8389], [113.0273, 29.4434], [112.9395, 29.4873], [113.0273, 29.751], [112.9395, 29.7949], [112.6758, 29.5752], [112.5, 29.6191], [112.2363, 29.5313], [111.7969, 29.9268], [110.8301, 30.1465], [110.4785, 30.0146], [110.6543, 29.751], [110.4785, 29.6631], [109.7754, 29.751], [109.6875, 29.6191], [109.5117, 29.6191], [109.248, 29.1357], [109.0723, 29.3555], [108.9844, 29.3115], [108.6328, 29.8389], [108.457, 29.7949], [108.5449, 30.2344], [108.457, 30.4102], [108.6328, 30.5859], [108.8086, 30.498], [109.0723, 30.6299], [109.1602, 30.542], [109.248, 30.6299], [109.4238, 30.542], [109.8633, 30.8936], [110.0391, 30.8057], [110.2148, 31.1572]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "52",
            "name": "贵州",
            "cp": [106.6113, 26.9385],
            "childNum": 9
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[104.1504, 27.2461], [104.4141, 27.4658], [104.5898, 27.334], [105.2051, 27.3779], [105.293, 27.7295], [105.5566, 27.7734], [105.6445, 27.6416], [106.3477, 27.8174], [106.1719, 28.125], [105.9082, 28.125], [105.6445, 28.4326], [105.9961, 28.7402], [106.3477, 28.5205], [106.5234, 28.5645], [106.4355, 28.7842], [106.5234, 28.7842], [106.6113, 28.6523], [106.6113, 28.5205], [106.6992, 28.4766], [106.875, 28.7842], [107.4023, 28.8721], [107.4023, 29.1797], [107.5781, 29.2236], [107.8418, 29.1357], [107.8418, 29.0039], [108.2813, 29.0918], [108.3691, 28.6523], [108.5449, 28.6523], [108.5449, 28.3887], [108.7207, 28.4766], [108.7207, 28.2129], [109.0723, 28.2129], [109.248, 28.4766], [109.3359, 28.2568], [109.3359, 27.9053], [109.4238, 27.5977], [108.8086, 27.1143], [108.8965, 27.0264], [109.3359, 27.1582], [109.5117, 27.0264], [109.5117, 26.8066], [109.3359, 26.7188], [109.4238, 26.5869], [109.248, 26.3232], [109.4238, 26.2793], [109.5117, 26.0156], [109.3359, 25.708], [108.9844, 25.752], [109.0723, 25.5322], [108.6328, 25.5762], [108.6328, 25.3125], [108.3691, 25.5322], [108.1934, 25.4443], [108.1055, 25.2246], [107.8418, 25.1367], [107.7539, 25.2246], [107.4902, 25.2246], [107.2266, 25.6201], [106.9629, 25.4883], [107.0508, 25.2686], [106.875, 25.1807], [106.1719, 24.9609], [106.1719, 24.7852], [105.9961, 24.6533], [105.2051, 24.9609], [104.6777, 24.6094], [104.502, 24.7412], [104.6777, 24.9609], [104.5898, 25.0488], [104.8535, 25.2246], [104.3262, 25.708], [104.6777, 26.4111], [104.4141, 26.6748], [103.8867, 26.543], [103.7109, 26.7627], [103.7109, 26.9824], [103.623, 27.0264], [103.8867, 27.4219], [104.1504, 27.2461]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "37",
            "name": "山东",
            "cp": [118.7402, 36.4307],
            "childNum": 17
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[115.4883, 36.167], [115.3125, 36.5186], [115.752, 36.9141], [116.0156, 37.3535], [116.2793, 37.3535], [116.2793, 37.5732], [116.4551, 37.4854], [116.8066, 37.8369], [117.4219, 37.8369], [117.9492, 38.3203], [118.125, 38.1445], [118.916, 38.1445], [119.3555, 37.6611], [119.0039, 37.5293], [119.0039, 37.3535], [119.3555, 37.1338], [119.707, 37.1338], [119.8828, 37.3975], [120.498, 37.8369], [120.5859, 38.1445], [120.9375, 38.4521], [121.0254, 37.8369], [121.2012, 37.6611], [121.9043, 37.4854], [122.168, 37.6172], [122.2559, 37.4854], [122.6074, 37.4854], [122.6953, 37.3535], [122.6074, 36.9141], [122.4316, 36.7822], [121.8164, 36.8701], [121.7285, 36.6943], [121.1133, 36.6064], [121.1133, 36.4307], [121.377, 36.2549], [120.7617, 36.167], [120.9375, 35.8594], [120.6738, 36.0352], [119.707, 35.4639], [119.9707, 34.9805], [119.3555, 35.0244], [119.2676, 35.1123], [118.916, 35.0244], [118.7402, 34.7168], [118.4766, 34.6729], [118.3887, 34.4092], [118.2129, 34.4092], [118.125, 34.6289], [117.9492, 34.6729], [117.5977, 34.4531], [117.334, 34.585], [117.2461, 34.4531], [116.8066, 34.9365], [116.4551, 34.8926], [116.3672, 34.6289], [116.1914, 34.585], [115.5762, 34.585], [115.4004, 34.8486], [114.7852, 35.0684], [115.0488, 35.376], [115.2246, 35.4199], [115.4883, 35.7275], [116.1035, 36.0791], [115.3125, 35.8154], [115.4883, 36.167]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "36",
            "name": "江西",
            "cp": [116.0156, 27.29],
            "childNum": 11
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[114.2578, 28.3447], [114.082, 28.5645], [114.1699, 28.8281], [113.9063, 29.0479], [114.2578, 29.3555], [114.873, 29.3994], [115.4883, 29.7949], [115.9277, 29.707], [116.1035, 29.8389], [116.2793, 29.7949], [116.7188, 30.0586], [116.8945, 29.9268], [116.7188, 29.751], [116.7188, 29.6191], [117.1582, 29.707], [117.0703, 29.8389], [117.1582, 29.9268], [117.5098, 29.6191], [118.0371, 29.5752], [118.2129, 29.3994], [118.0371, 29.1797], [118.0371, 29.0479], [118.3887, 28.7842], [118.4766, 28.3447], [118.4766, 28.3008], [118.3008, 28.0811], [117.7734, 27.8174], [117.5098, 27.9932], [116.9824, 27.6416], [117.1582, 27.29], [117.0703, 27.1143], [116.543, 26.8066], [116.6309, 26.4551], [116.3672, 26.2354], [116.4551, 26.1035], [116.1914, 25.8838], [116.0156, 25.2686], [115.8398, 25.2246], [115.9277, 24.917], [115.752, 24.7852], [115.8398, 24.5654], [115.4004, 24.7852], [114.4336, 24.5215], [114.1699, 24.6973], [114.4336, 24.9609], [114.6973, 25.1367], [114.7852, 25.2686], [114.6094, 25.4004], [113.9941, 25.2686], [113.9063, 25.4443], [113.9941, 26.0596], [114.2578, 26.1475], [113.9941, 26.1914], [114.082, 26.5869], [113.9063, 26.6309], [113.9063, 26.9385], [113.7305, 27.1143], [113.8184, 27.29], [113.6426, 27.3779], [113.6426, 27.5977], [113.7305, 27.9492], [114.2578, 28.3447]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "41",
            "name": "河南",
            "cp": [113.4668, 33.8818],
            "childNum": 17
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[110.3906, 34.585], [110.8301, 34.6289], [111.1816, 34.8047], [111.5332, 34.8486], [111.7969, 35.0684], [112.0605, 35.0684], [112.0605, 35.2881], [112.7637, 35.2002], [113.1152, 35.332], [113.6426, 35.6836], [113.7305, 36.3428], [114.873, 36.123], [114.9609, 36.0791], [115.1367, 36.2109], [115.3125, 36.0791], [115.4883, 36.167], [115.3125, 35.8154], [116.1035, 36.0791], [115.4883, 35.7275], [115.2246, 35.4199], [115.0488, 35.376], [114.7852, 35.0684], [115.4004, 34.8486], [115.5762, 34.585], [116.1914, 34.585], [116.1914, 34.4092], [116.543, 34.2773], [116.6309, 33.9258], [116.1914, 33.7061], [116.0156, 33.9697], [115.6641, 34.0576], [115.5762, 33.9258], [115.5762, 33.6621], [115.4004, 33.5303], [115.3125, 33.1787], [114.873, 33.1348], [114.873, 33.0029], [115.1367, 32.8711], [115.2246, 32.6074], [115.5762, 32.4316], [115.8398, 32.5195], [115.9277, 31.7725], [115.4883, 31.6846], [115.4004, 31.4209], [115.2246, 31.4209], [115.1367, 31.5967], [114.7852, 31.4648], [114.6094, 31.5527], [114.5215, 31.7725], [114.1699, 31.8604], [113.9941, 31.7725], [113.8184, 31.8604], [113.7305, 32.4316], [113.4668, 32.2998], [113.2031, 32.4316], [112.3242, 32.3438], [111.5332, 32.6074], [111.0059, 33.2666], [111.0059, 33.5303], [110.6543, 33.8379], [110.6543, 34.1455], [110.4785, 34.2334], [110.3906, 34.585]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "21",
            "name": "辽宁",
            "cp": [122.3438, 41.0889],
            "childNum": 14
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[119.2676, 41.3086], [119.4434, 41.6162], [119.2676, 41.7041], [119.3555, 42.2754], [119.5313, 42.3633], [119.8828, 42.1875], [120.1465, 41.7041], [120.498, 42.0996], [121.4648, 42.4951], [121.7285, 42.4512], [121.9922, 42.7148], [122.3438, 42.6709], [122.3438, 42.8467], [122.7832, 42.7148], [123.1348, 42.8027], [123.3105, 42.9785], [123.5742, 43.0225], [123.6621, 43.374], [123.8379, 43.4619], [124.2773, 43.2422], [124.4531, 42.8467], [124.7168, 43.0664], [124.8926, 43.0664], [124.8926, 42.8027], [125.332, 42.1436], [125.4199, 42.0996], [125.332, 41.9678], [125.332, 41.6602], [125.7715, 41.2207], [125.5957, 40.9131], [125.6836, 40.8691], [124.541, 40.21], [124.1016, 39.6826], [123.3984, 39.6826], [123.1348, 39.4189], [123.1348, 39.0234], [122.0801, 39.0234], [121.5527, 38.7158], [121.1133, 38.6719], [120.9375, 38.9795], [121.377, 39.1992], [121.2012, 39.5508], [122.0801, 40.3857], [121.9922, 40.6934], [121.7285, 40.8252], [121.2012, 40.8252], [120.5859, 40.21], [119.8828, 39.9463], [119.707, 40.1221], [119.5313, 40.5615], [119.2676, 40.5176], [118.8281, 40.8252], [119.2676, 41.3086]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "14",
            "name": "山西",
            "cp": [112.4121, 37.6611],
            "childNum": 11
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[110.918, 38.7158], [111.1816, 39.2432], [111.0938, 39.375], [111.3574, 39.4189], [111.4453, 39.6387], [111.9727, 39.5947], [112.3242, 40.2539], [112.7637, 40.166], [113.2031, 40.3857], [113.5547, 40.3418], [113.8184, 40.5176], [114.082, 40.5176], [114.082, 40.7373], [114.2578, 40.6055], [114.3457, 40.3857], [114.5215, 40.3418], [113.9941, 39.9902], [114.3457, 39.8584], [114.5215, 39.5068], [114.3457, 39.0674], [113.9063, 39.0234], [113.8184, 38.9355], [113.8184, 38.8037], [113.5547, 38.54], [113.5547, 38.2764], [113.8184, 38.1445], [113.9941, 37.7051], [114.1699, 37.6611], [113.7305, 37.1338], [113.7305, 36.8701], [113.4668, 36.6504], [113.7305, 36.3428], [113.6426, 35.6836], [113.1152, 35.332], [112.7637, 35.2002], [112.0605, 35.2881], [112.0605, 35.0684], [111.7969, 35.0684], [111.5332, 34.8486], [111.1816, 34.8047], [110.8301, 34.6289], [110.3906, 34.585], [110.2148, 34.6729], [110.2148, 34.8926], [110.5664, 35.6396], [110.4785, 36.123], [110.3906, 37.002], [110.8301, 37.6611], [110.4785, 37.9688], [110.4785, 38.1885], [110.8301, 38.4961], [110.918, 38.7158]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "34",
            "name": "安徽",
            "cp": [117.2461, 32.0361],
            "childNum": 17
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[116.6309, 33.9258], [116.543, 34.2773], [116.1914, 34.4092], [116.1914, 34.585], [116.3672, 34.6289], [116.8945, 34.4092], [117.1582, 34.0576], [117.5977, 34.0137], [117.7734, 33.7061], [118.125, 33.75], [117.9492, 33.2227], [118.0371, 33.1348], [118.2129, 33.2227], [118.3008, 32.7832], [118.7402, 32.7393], [118.916, 32.959], [119.1797, 32.8271], [119.1797, 32.4756], [118.5645, 32.5635], [118.6523, 32.2119], [118.4766, 32.168], [118.3887, 31.9482], [118.916, 31.5527], [118.7402, 31.377], [118.8281, 31.2451], [119.3555, 31.2891], [119.4434, 31.1572], [119.6191, 31.1133], [119.6191, 31.0693], [119.4434, 30.6738], [119.2676, 30.6299], [119.3555, 30.4102], [118.916, 30.3223], [118.916, 29.9707], [118.7402, 29.707], [118.2129, 29.3994], [118.0371, 29.5752], [117.5098, 29.6191], [117.1582, 29.9268], [117.0703, 29.8389], [117.1582, 29.707], [116.7188, 29.6191], [116.7188, 29.751], [116.8945, 29.9268], [116.7188, 30.0586], [116.2793, 29.7949], [116.1035, 29.8389], [116.1035, 30.1904], [115.752, 30.6738], [116.0156, 31.0254], [115.5762, 31.2012], [115.4004, 31.4209], [115.4883, 31.6846], [115.9277, 31.7725], [115.8398, 32.5195], [115.5762, 32.4316], [115.2246, 32.6074], [115.1367, 32.8711], [114.873, 33.0029], [114.873, 33.1348], [115.3125, 33.1787], [115.4004, 33.5303], [115.5762, 33.6621], [115.5762, 33.9258], [115.6641, 34.0576], [116.0156, 33.9697], [116.1914, 33.7061], [116.6309, 33.9258]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "35",
            "name": "福建",
            "cp": [118.3008, 25.9277],
            "childNum": 9
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[118.4766, 28.3008], [118.8281, 28.2568], [118.7402, 28.0371], [118.916, 27.4658], [119.2676, 27.4219], [119.6191, 27.6855], [119.7949, 27.29], [120.2344, 27.4219], [120.4102, 27.1582], [120.7617, 27.0264], [120.6738, 26.8945], [120.2344, 26.8506], [120.2344, 26.7188], [120.4102, 26.6748], [120.498, 26.3672], [120.2344, 26.2793], [120.4102, 26.1475], [120.0586, 26.1914], [119.9707, 25.9277], [119.7949, 25.9277], [119.9707, 25.4004], [119.7949, 25.2686], [119.5313, 25.1367], [119.4434, 25.0049], [119.2676, 25.0928], [118.916, 24.8291], [118.6523, 24.5215], [118.4766, 24.5215], [118.4766, 24.4336], [118.2129, 24.3457], [118.2129, 24.1699], [117.8613, 23.9941], [117.7734, 23.7744], [117.5098, 23.5986], [117.1582, 23.5547], [116.9824, 23.9063], [116.9824, 24.1699], [116.7188, 24.6533], [116.543, 24.6094], [116.3672, 24.873], [116.2793, 24.7852], [115.9277, 24.917], [115.8398, 25.2246], [116.0156, 25.2686], [116.1914, 25.8838], [116.4551, 26.1035], [116.3672, 26.2354], [116.6309, 26.4551], [116.543, 26.8066], [117.0703, 27.1143], [117.1582, 27.29], [116.9824, 27.6416], [117.5098, 27.9932], [117.7734, 27.8174], [118.3008, 28.0811], [118.4766, 28.3008]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "33",
            "name": "浙江",
            "cp": [120.498, 29.0918],
            "childNum": 11
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[118.2129, 29.3994], [118.7402, 29.707], [118.916, 29.9707], [118.916, 30.3223], [119.3555, 30.4102], [119.2676, 30.6299], [119.4434, 30.6738], [119.6191, 31.0693], [119.6191, 31.1133], [119.9707, 31.1572], [120.498, 30.8057], [120.9375, 31.0254], [121.2891, 30.6738], [121.9922, 30.8057], [122.6953, 30.8936], [122.8711, 30.7178], [122.959, 30.1465], [122.6074, 30.1025], [122.6074, 29.9268], [122.168, 29.5313], [122.3438, 28.8721], [121.9922, 28.8721], [121.9922, 28.4326], [121.7285, 28.3447], [121.7285, 28.2129], [121.4648, 28.2129], [121.5527, 28.0371], [121.2891, 27.9492], [121.1133, 27.4219], [120.6738, 27.334], [120.6738, 27.1582], [120.9375, 27.0264], [120.7617, 27.0264], [120.4102, 27.1582], [120.2344, 27.4219], [119.7949, 27.29], [119.6191, 27.6855], [119.2676, 27.4219], [118.916, 27.4658], [118.7402, 28.0371], [118.8281, 28.2568], [118.4766, 28.3008], [118.4766, 28.3447], [118.3887, 28.7842], [118.0371, 29.0479], [118.0371, 29.1797], [118.2129, 29.3994]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "32",
            "name": "江苏",
            "cp": [120.0586, 32.915],
            "childNum": 13
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[116.3672, 34.6289], [116.4551, 34.8926], [116.8066, 34.9365], [117.2461, 34.4531], [117.334, 34.585], [117.5977, 34.4531], [117.9492, 34.6729], [118.125, 34.6289], [118.2129, 34.4092], [118.3887, 34.4092], [118.4766, 34.6729], [118.7402, 34.7168], [118.916, 35.0244], [119.2676, 35.1123], [119.3555, 35.0244], [119.3555, 34.8486], [119.707, 34.585], [120.3223, 34.3652], [120.9375, 33.0469], [121.0254, 32.6514], [121.377, 32.4756], [121.4648, 32.168], [121.9043, 31.9922], [121.9922, 31.6846], [121.9922, 31.5967], [121.2012, 31.8604], [121.1133, 31.7285], [121.377, 31.5088], [121.2012, 31.4648], [120.9375, 31.0254], [120.498, 30.8057], [119.9707, 31.1572], [119.6191, 31.1133], [119.4434, 31.1572], [119.3555, 31.2891], [118.8281, 31.2451], [118.7402, 31.377], [118.916, 31.5527], [118.3887, 31.9482], [118.4766, 32.168], [118.6523, 32.2119], [118.5645, 32.5635], [119.1797, 32.4756], [119.1797, 32.8271], [118.916, 32.959], [118.7402, 32.7393], [118.3008, 32.7832], [118.2129, 33.2227], [118.0371, 33.1348], [117.9492, 33.2227], [118.125, 33.75], [117.7734, 33.7061], [117.5977, 34.0137], [117.1582, 34.0576], [116.8945, 34.4092], [116.3672, 34.6289]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "50",
            "name": "重庆",
            "cp": [107.7539, 30.1904],
            "childNum": 40
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[108.5449, 31.6846], [108.2813, 31.9043], [108.3691, 32.168], [108.5449, 32.2119], [109.0723, 31.9482], [109.248, 31.7285], [109.5996, 31.7285], [109.7754, 31.6846], [109.6875, 31.5527], [110.127, 31.377], [110.2148, 31.1572], [110.0391, 30.8057], [109.8633, 30.8936], [109.4238, 30.542], [109.248, 30.6299], [109.1602, 30.542], [109.0723, 30.6299], [108.8086, 30.498], [108.6328, 30.5859], [108.457, 30.4102], [108.5449, 30.2344], [108.457, 29.7949], [108.6328, 29.8389], [108.9844, 29.3115], [109.0723, 29.3555], [109.248, 29.1357], [109.248, 28.4766], [109.0723, 28.2129], [108.7207, 28.2129], [108.7207, 28.4766], [108.5449, 28.3887], [108.5449, 28.6523], [108.3691, 28.6523], [108.2813, 29.0918], [107.8418, 29.0039], [107.8418, 29.1357], [107.5781, 29.2236], [107.4023, 29.1797], [107.4023, 28.8721], [106.875, 28.7842], [106.6992, 28.4766], [106.6113, 28.5205], [106.6113, 28.6523], [106.5234, 28.7842], [106.4355, 28.7842], [106.5234, 28.5645], [106.3477, 28.5205], [106.2598, 28.8721], [105.8203, 28.96], [105.7324, 29.2676], [105.4688, 29.3115], [105.293, 29.5313], [105.7324, 29.8828], [105.5566, 30.1025], [105.6445, 30.2783], [105.8203, 30.4541], [106.2598, 30.1904], [106.6113, 30.3223], [106.7871, 30.0146], [107.0508, 30.0146], [107.4902, 30.6299], [107.4023, 30.7617], [107.4902, 30.8496], [107.9297, 30.8496], [108.1934, 31.5088], [108.5449, 31.6846]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "64",
            "name": "宁夏",
            "cp": [105.9961, 37.3096],
            "childNum": 5
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[104.3262, 37.4414], [105.8203, 37.793], [105.9082, 38.7158], [106.3477, 39.2871], [106.7871, 39.375], [106.9629, 38.9795], [106.5234, 38.3203], [106.7871, 38.1885], [107.3145, 38.1006], [107.666, 37.8809], [107.3145, 37.6172], [107.3145, 37.0898], [106.6113, 37.0898], [106.6113, 36.7822], [106.4355, 36.5625], [106.5234, 36.4746], [106.5234, 36.2549], [106.875, 36.123], [106.9629, 35.8154], [106.6992, 35.6836], [106.4355, 35.6836], [106.5234, 35.332], [106.3477, 35.2441], [106.2598, 35.4199], [106.084, 35.376], [105.9961, 35.4199], [106.084, 35.4639], [105.9961, 35.4639], [105.8203, 35.5518], [105.7324, 35.7275], [105.3809, 35.7715], [105.293, 35.9912], [105.4688, 36.123], [105.2051, 36.6943], [105.293, 36.8262], [104.8535, 37.2217], [104.5898, 37.2217], [104.5898, 37.4414], [104.3262, 37.4414]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "46",
            "name": "海南",
            "cp": [109.9512, 19.2041],
            "childNum": 18
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[108.6328, 19.3799], [109.0723, 19.6436], [109.248, 19.9512], [109.5996, 20.0391], [110.0391, 20.127], [110.3906, 20.127], [110.5664, 20.2588], [110.6543, 20.2588], [111.0938, 19.9512], [111.2695, 19.9951], [110.6543, 19.1602], [110.5664, 18.6768], [110.2148, 18.5889], [110.0391, 18.3691], [109.8633, 18.3691], [109.6875, 18.1055], [108.9844, 18.2813], [108.6328, 18.457], [108.6328, 19.3799]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "71",
            "name": "台湾",
            "cp": [121.0254, 23.5986],
            "childNum": 1
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[121.9043, 25.0488], [121.9922, 25.0049], [121.8164, 24.7412], [121.9043, 24.5654], [121.6406, 24.0381], [121.377, 23.1152], [121.0254, 22.6758], [120.8496, 22.0605], [120.7617, 21.9287], [120.6738, 22.3242], [120.2344, 22.5879], [120.0586, 23.0713], [120.1465, 23.6865], [121.0254, 25.0488], [121.5527, 25.3125], [121.9043, 25.0488]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "11",
            "name": "北京",
            "cp": [116.4551, 40.2539],
            "childNum": 19
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[117.4219, 40.21], [117.334, 40.1221], [117.2461, 40.0781], [116.8066, 39.9902], [116.8945, 39.8145], [116.8945, 39.6826], [116.8066, 39.5947], [116.543, 39.5947], [116.3672, 39.4629], [116.1914, 39.5947], [115.752, 39.5068], [115.4883, 39.6387], [115.4004, 39.9463], [115.9277, 40.2539], [115.752, 40.5615], [116.1035, 40.6055], [116.1914, 40.7813], [116.4551, 40.7813], [116.3672, 40.9131], [116.6309, 41.0449], [116.9824, 40.6934], [117.4219, 40.6494], [117.2461, 40.5176], [117.4219, 40.21]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "12",
            "name": "天津",
            "cp": [117.4219, 39.4189],
            "childNum": 18
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[116.8066, 39.5947], [116.8945, 39.6826], [117.1582, 39.6387], [117.1582, 39.8145], [117.2461, 40.0781], [117.334, 40.1221], [117.4219, 40.21], [117.6855, 40.0781], [117.6855, 39.9902], [117.5098, 39.9902], [117.5098, 39.7705], [117.6855, 39.5947], [117.9492, 39.5947], [117.8613, 39.4189], [118.0371, 39.2432], [118.0371, 39.1992], [117.8613, 39.1113], [117.5977, 38.6279], [117.2461, 38.54], [116.7188, 38.8037], [116.7188, 38.9355], [116.8945, 39.1113], [116.8066, 39.5947]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "31",
            "name": "上海",
            "cp": [121.4648, 31.2891],
            "childNum": 19
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[120.9375, 31.0254], [121.2012, 31.4648], [121.377, 31.5088], [121.1133, 31.7285], [121.2012, 31.8604], [121.9922, 31.5967], [121.9043, 31.1572], [121.9922, 30.8057], [121.2891, 30.6738], [120.9375, 31.0254]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "81",
            "name": "香港",
            "cp": [114.2578, 22.3242],
            "childNum": 1
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[114.6094, 22.4121], [114.5215, 22.1484], [114.3457, 22.1484], [113.9063, 22.1484], [113.8184, 22.1924], [113.9063, 22.4121], [114.1699, 22.5439], [114.3457, 22.5439], [114.4336, 22.5439], [114.4336, 22.4121], [114.6094, 22.4121]]]
        }
    }, {
        "type": "Feature",
        "properties": {
            "id": "82",
            "name": "澳门",
            "cp": [113.5547, 22.1484],
            "childNum": 1
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[113.5986, 22.1649], [113.6096, 22.1265], [113.5547, 22.11], [113.5437, 22.2034], [113.5767, 22.2034], [113.5986, 22.1649]]]
        }
    }]
};

var China = {};
china.features.forEach(function (data) {
    var name = data.properties.name;
    var center = data.properties.cp;
    var geomerty = data.geometry.coordinates;
    China[name] = {
        center: center,
        geomerty: geomerty
    };
});

var Paths = China['安徽'].geomerty[0].map(function (point) {
    return [point[0], point[1], 0];
});

var THREE$1 = function THREE(dmo) {
    classCallCheck(this, THREE);

    var gl = new GL(dmo);
    Object.keys(China).map(function (province) {
        China[province].geomerty.map(function (geo) {
            var path = geo.map(function (point) {
                return [point[0] * 100, point[1] * 100, 0];
            });
            gl.Path({
                path: path
            });
        });
    });

    gl.Path({
        path: [[0, 0, 0], [100, 0, 0]],
        color: '#f00'
    });

    gl.Path({
        path: [[0, 0, 0], [0, 100, 0]],
        color: '#00f'
    });

    gl.Path({
        path: [[0, 0, 0], [0, 0, 100]],
        color: '#0f0'
    });

    var a = gl.Plane({
        width: 100,
        height: 100,
        color: '#eee'
    });
    a.translate(0, 1, 10);
};

var X = function () {
    function X(dom, opt) {
        classCallCheck(this, X);

        this.dom = dom;
        this.opt = opt;
        this.init();
    }

    createClass(X, [{
        key: 'init',
        value: function init() {
            var zoom = 1;

            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10e7);
            var renderer = new THREE.WebGLRenderer();

            // add controls
            var controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.25;
            // controls.enableZoom = false;
            renderer.setSize(this.dom.clientWidth, this.dom.clientHeight);
            this.dom.appendChild(renderer.domElement);

            var geometry = new THREE.PlaneGeometry(80 * zoom, 50 * zoom, 10, 10);
            var material = new THREE.MeshBasicMaterial({
                color: 0x585858,
                wireframe: true
            });
            var cube = window.cube = new THREE.Mesh(geometry, material);
            cube.rotateX(-Math.PI / 2);
            scene.add(cube);
            camera.position.y = 50 * zoom;
            camera.position.z = 50 * zoom;
            camera.lookAt(new THREE.Vector3(0, 0, 0));

            function render() {
                requestAnimationFrame(render);
                renderer.render(scene, camera);
                controls.update();
            }
            render();

            var sizeZoom = this.opt.grid.size * zoom;

            var gradeData = {};
            var min = Infinity;
            var max = -Infinity;
            for (var i in data) {
                var x = parseInt(data[i].lng * zoom / sizeZoom) * sizeZoom;
                var y = parseInt(data[i].lat * zoom / sizeZoom) * sizeZoom;
                gradeData[x + '_' + y] = gradeData[x + '_' + y] || 0;
                gradeData[x + '_' + y]++;
                max = Math.max(max, gradeData[x + '_' + y]);
                min = Math.min(min, gradeData[x + '_' + y]);
            }

            // color~
            var color = getColor();

            var lines = new THREE.Object3D();
            for (var i in gradeData) {
                var colorPersent = max == min ? 0 : (gradeData[i] - min) / (max - min);
                var colorInedx = parseInt(colorPersent * (color.length / 4)) - 1;
                colorInedx = colorInedx < 0 ? 0 : colorInedx;
                var r = color[colorInedx * 4].toString(16);
                r = r.length < 2 ? '0' + r : r;
                var g = color[colorInedx * 4 + 1].toString(16);
                g = g.length < 2 ? '0' + g : g;
                var b = color[colorInedx * 4 + 2].toString(16);
                b = b.length < 2 ? '0' + b : b;

                var height = gradeData[i] * 1.5;
                var geometry = new THREE.BoxGeometry(sizeZoom * 0.9, height, sizeZoom * 0.9);
                var material = new THREE.MeshBasicMaterial({
                    color: '#' + r + g + b
                });
                var cube = new THREE.Mesh(geometry, material);
                var pos = i.split('_');
                cube.position.x = pos[0] - this.opt.center.lng * zoom;
                cube.position.y = height / 2;
                cube.position.z = this.opt.center.lat * zoom - pos[1];
                lines.add(cube);
            }
            scene.add(lines);
        }
    }]);
    return X;
}();

function getColor() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(1, "#F00");
    gradient.addColorStop(0.6, "#FFFC00");
    gradient.addColorStop(0.3, "#00FF1D");
    gradient.addColorStop(0, "#000BFF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);
    var data = ctx.getImageData(0, 0, 256, 1);
    return data.data;
}

/**
 * @author kyle / http://nikai.us/
 */

/**
 * Category
 * @param {Object} [options]   Available options:
 *                             {Object} gradient: { 0.25: "rgb(0,0,255)", 0.55: "rgb(0,255,0)", 0.85: "yellow", 1.0: "rgb(255,0,0)"}
 */
function Intensity(options) {

    options = options || {};
    this.gradient = options.gradient || {
        0.25: "rgba(0, 0, 255, 1)",
        0.55: "rgba(0, 255, 0, 1)",
        0.85: "rgba(255, 255, 0, 1)",
        1.0: "rgba(255, 0, 0, 1)"
    };
    this.maxSize = options.maxSize || 35;
    this.minSize = options.minSize || 0;
    this.max = options.max || 100;
    this.initPalette();
}

Intensity.prototype.initPalette = function () {

    var gradient = this.gradient;

    if (typeof document === 'undefined') {
        // var Canvas = require('canvas');
        // var paletteCanvas = new Canvas(256, 1);
    } else {
        var paletteCanvas = document.createElement('canvas');
    }

    paletteCanvas.width = 256;
    paletteCanvas.height = 1;

    var paletteCtx = this.paletteCtx = paletteCanvas.getContext('2d');

    var lineGradient = paletteCtx.createLinearGradient(0, 0, 256, 1);

    for (var key in gradient) {
        lineGradient.addColorStop(parseFloat(key), gradient[key]);
    }

    paletteCtx.fillStyle = lineGradient;
    paletteCtx.fillRect(0, 0, 256, 1);
};

Intensity.prototype.getColor = function (value) {

    var imageData = this.getImageData(value);

    return "rgba(" + imageData[0] + ", " + imageData[1] + ", " + imageData[2] + ", " + imageData[3] / 256 + ")";
};

Intensity.prototype.getImageData = function (value) {
    var max = this.max;

    if (value > max) {
        value = max;
    }

    var index = Math.floor(value / max * (256 - 1)) * 4;

    var imageData = this.paletteCtx.getImageData(0, 0, 256, 1).data;

    return [imageData[index], imageData[index + 1], imageData[index + 2], imageData[index + 3]];
};

/**
 * @param Number value 
 * @param Number max of value
 * @param Number max of size
 * @param Object other options
 */
Intensity.prototype.getSize = function (value) {

    var size = 0;
    var max = this.max;
    var maxSize = this.maxSize;
    var minSize = this.minSize;

    if (value > max) {
        value = max;
    }

    size = minSize + value / max * (maxSize - minSize);

    return size;
};

Intensity.prototype.getLegend = function (options) {
    var gradient = this.gradient;

    var paletteCanvas = document.createElement('canvas');

    var width = options.width || 20;
    var height = options.height || 180;

    paletteCanvas.width = width;
    paletteCanvas.height = height;

    var paletteCtx = paletteCanvas.getContext('2d');

    var lineGradient = paletteCtx.createLinearGradient(0, height, 0, 0);

    for (var key in gradient) {
        lineGradient.addColorStop(parseFloat(key), gradient[key]);
    }

    paletteCtx.fillStyle = lineGradient;
    paletteCtx.fillRect(0, 0, width, height);

    return paletteCanvas;
};

function Flate(container) {

    this.container = container;
    this.init();

    var that = this;

    this.group = new THREE.Group();

    this.center = [105, 33];

    function animate(time) {
        requestAnimationFrame(animate);

        //that.controls.update();

        that.render();
    }

    requestAnimationFrame(animate);
}

Flate.prototype.init = function () {
    this.intensity = new Intensity({
        gradient: {
            0: '#006bab',
            1: '#002841'
        },
        max: 100
    });

    var WIDTH = this.container.offsetWidth;
    var HEIGHT = this.container.offsetHeight;
    var camera = this.camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.01, 9000);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 85;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    var scene = this.scene = new THREE.Scene();

    var renderer = this.renderer = new THREE.WebGLRenderer({
        alpha: true
    });

    /*
    var controls = this.controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    */

    // renderer.setClearColor('rgb(1, 11, 21)', 1);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);

    this.container.appendChild(renderer.domElement);

    var floorTexture = THREE.ImageUtils.loadTexture('images/china.png');
    var floorMaterial = new THREE.MeshBasicMaterial({
        map: floorTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    var floorGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.x = 0;
    floor.position.y = 0;
    floor.position.z = 0;
    //scene.add(floor);

    // LIGHT
    var light = new THREE.PointLight('rgb(50, 50, 250)');
    light.position.set(0, 0, 35);
    scene.add(light);

    var SUBDIVISIONS = 20;
    var geometry = new THREE.Geometry();
    var curve = new THREE.QuadraticBezierCurve3();
    curve.v0 = new THREE.Vector3(0, 0, 0);
    curve.v1 = new THREE.Vector3(20, 20, 0);
    curve.v2 = new THREE.Vector3(40, 40, 0);
    for (var j = 0; j < SUBDIVISIONS; j++) {
        geometry.vertices.push(curve.getPoint(j / SUBDIVISIONS));
    }

    var material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 95 });
    var line = this.line = new THREE.Line(geometry, material);
    //scene.add(line);

    this.current = 0;
};

Flate.prototype.render = function () {

    var SUBDIVISIONS = 50;
    var geometry = new THREE.Geometry();
    var curve = new THREE.QuadraticBezierCurve3();
    curve.v0 = new THREE.Vector3(0, 0, 0);
    curve.v1 = new THREE.Vector3(25, 25, 50);
    curve.v2 = new THREE.Vector3(50, 50, 0);
    this.current += 0.01;
    if (this.current > 1) {
        this.current = 0;
    }

    for (var j = 0; j < SUBDIVISIONS; j++) {
        var percent = j / SUBDIVISIONS;
        if (percent < this.current) {
            geometry.vertices.push(curve.getPoint(percent));
        }
    }

    //this.line.geometry = geometry;

    this.renderer.render(this.scene, this.camera);
};

Flate.prototype.setDataSet = function (dataSet) {
    // create a canvas element
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = 50;
    canvas.height = 50;
    context.fillStyle = "rgba(255,255,50,0.75)";
    //context.shadowColor = "rgba(255,255,255,0.95)";
    //context.shadowBlur = 0;
    context.arc(25, 25, 10, 0, Math.PI * 2);
    context.fill();

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    material.transparent = true;

    var rs = dataSet.get();
    var features = rs;
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        if (feature.geometry.type == 'Polygon') {
            var coords = this.getCoordinates(feature.geometry.coordinates[0]);
            this.addShape(coords);
        } else if (feature.geometry.type == 'MultiPolygon') {
            for (var j = 0; j < feature.geometry.coordinates.length; j++) {
                var coords = this.getCoordinates(feature.geometry.coordinates[j][0]);
                this.addShape(coords);
            }
        } else if (feature.geometry.type == 'Point') {

            var size = canvas.width / 15 + Math.random() * 4;
            var mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
            mesh.position.set(feature.geometry.coordinates[0] - this.center[0], feature.geometry.coordinates[1] - this.center[1], 1);
            this.scene.add(mesh);
        }

        var cityname = feature.name;
        var center = feature.cp;
    }
    this.scene.add(this.group);
};

Flate.prototype.getCoordinates = function (coordinates) {
    var coords = [];
    for (var j = 0; j < coordinates.length; j++) {
        coords.push(new THREE.Vector2(coordinates[j][0] - this.center[0], coordinates[j][1] - this.center[1]));
    }
    return coords;
};

Flate.prototype.addShape = function (coords) {
    var shape = new THREE.Shape(coords);
    var geometry = new THREE.ShapeGeometry(shape);

    var color = 'rgb(' + ~~(Math.random() * 256) + ', ' + ~~(Math.random() * 256) + ', ' + ~~(Math.random() * 256) + ')';
    color = this.intensity.getColor(Math.random() * 100);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }));
    mesh.position.set(0, 0, 0);
    this.group.add(mesh);

    var points = shape.createPointsGeometry();
    var line = new THREE.Line(points, new THREE.LineBasicMaterial({ color: 'rgb(0, 137, 191)', linewidth: 1 }));
    line.position.set(0, 0, 0.1);
    this.group.add(line);
};

var flights = [[43.061306, 74.477556, 40.608989, 72.793269]];

var index = 100;
while (index--) {
    flights.push([19.670399 + Math.random() * 35, 78.895343 + Math.random() * 50, 19.670399 + Math.random() * 35, 78.895343 + Math.random() * 50]);
}

var positions;
var start_flight_idx = 0;
var end_flight_idx = flights.length;
var flight_path_splines = [];
var flight_distance = [];
var flight_path_lines;
var flight_track_opacity = 0.32;
var flight_point_cloud_geom;
var flight_point_start_time = [];
var flight_point_end_time = [];
var flight_point_speed_changed = false;
var flight_point_speed_scaling = 5.0;
var flight_point_speed_min_scaling = 1.0;
var flight_point_speed_max_scaling = 25.0;

function Earth(container) {

    this.container = container;
    this.init();

    var that = this;

    function animate(time) {
        requestAnimationFrame(animate);
        that.render();
    }

    requestAnimationFrame(animate);
}

Earth.prototype.init = function () {
    var WIDTH = this.container.offsetWidth;
    var HEIGHT = this.container.offsetHeight;
    var camera = this.camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.01, 9000);
    camera.position.z = 1.0;

    var scene = this.scene = new THREE.Scene();

    var renderer = this.renderer = new THREE.WebGLRenderer({
        alpha: true
    });
    // renderer.setClearColor('rgb(1, 11, 21)', 1);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);

    this.container.appendChild(renderer.domElement);

    // LIGHT
    /*
    var light = new THREE.PointLight('rgb(50, 50, 250)');
    light.position.set(0, 0, 35);
    scene.add(light);
    */

    scene.add(new THREE.AmbientLight(0x777777));

    var light1 = new THREE.DirectionalLight(0xffffff, 0.2);
    light1.position.set(5, 3, 5);
    scene.add(light1);

    var light2 = new THREE.DirectionalLight(0xffffff, 0.2);
    light2.position.set(5, 3, -5);
    scene.add(light2);

    var earth_img, elevation_img, water_img;
    var radius = 0.5;
    var segments = 64;
    earth_img = THREE.ImageUtils.loadTexture('images/earth_airports.png', THREE.UVMapping, function () {
        elevation_img = THREE.ImageUtils.loadTexture('images/elevation.jpg', THREE.UVMapping, function () {
            water_img = THREE.ImageUtils.loadTexture('images/water.png', THREE.UVMapping, function () {
                var earth = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments), new THREE.MeshPhongMaterial({
                    map: earth_img,
                    bumpMap: elevation_img,
                    bumpScale: 0.01,
                    specularMap: water_img,
                    specular: new THREE.Color('grey')
                }));
                earth.rotation.y = 170 * (Math.PI / 180);
                earth.rotation.x = 30 * (Math.PI / 180);
                scene.add(earth);

                generateControlPoints(radius);

                flight_path_lines = flightPathLines();
                earth.add(flight_path_lines);

                earth.add(flightPointCloud());
            });
        });
    });
};

Earth.prototype.render = function () {
    update_flights();

    this.renderer.render(this.scene, this.camera);
};

Earth.prototype.setDataSet = function (dataSet) {
    console.log(dataSet.get());
};

function generateControlPoints(radius) {
    for (var f = start_flight_idx; f < end_flight_idx; ++f) {

        var start_lat = flights[f][0];
        var start_lng = flights[f][1];
        var end_lat = flights[f][2];
        var end_lng = flights[f][3];

        var max_height = Math.random() * 0.04;

        var points = [];
        var spline_control_points = 8;
        for (var i = 0; i < spline_control_points + 1; i++) {
            var arc_angle = i * 180.0 / spline_control_points;
            var arc_radius = radius + Math.sin(arc_angle * Math.PI / 180.0) * max_height;
            var latlng = latlngInterPoint(start_lat, start_lng, end_lat, end_lng, i / spline_control_points);

            var pos = xyzFromLatLng(latlng.lat, latlng.lng, arc_radius);

            points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }

        var spline = new THREE.SplineCurve3(points);

        flight_path_splines.push(spline);

        var arc_length = spline.getLength();
        flight_distance.push(arc_length);

        setFlightTimes(f);
    }
}

function latlngInterPoint(lat1, lng1, lat2, lng2, offset) {
    lat1 = lat1 * Math.PI / 180.0;
    lng1 = lng1 * Math.PI / 180.0;
    lat2 = lat2 * Math.PI / 180.0;
    lng2 = lng2 * Math.PI / 180.0;

    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)));
    var A = Math.sin((1 - offset) * d) / Math.sin(d);
    var B = Math.sin(offset * d) / Math.sin(d);
    var x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    var y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    var z = A * Math.sin(lat1) + B * Math.sin(lat2);
    var lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
    var lng = Math.atan2(y, x) * 180 / Math.PI;

    return {
        lat: lat,
        lng: lng
    };
}

function xyzFromLatLng(lat, lng, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (360 - lng) * Math.PI / 180;

    return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta)
    };
}

function flightPathLines() {

    var num_control_points = 32;

    var geometry = new THREE.BufferGeometry();
    var material = new THREE.LineBasicMaterial({
        color: 0xffff00,
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: flight_track_opacity,
        depthTest: true,
        depthWrite: false,
        linewidth: 1.0001
    });
    var line_positions = new Float32Array(flights.length * 3 * 2 * num_control_points);
    var colors = new Float32Array(flights.length * 3 * 2 * num_control_points);

    for (var i = start_flight_idx; i < end_flight_idx; ++i) {

        for (var j = 0; j < num_control_points - 1; ++j) {

            var start_pos = flight_path_splines[i].getPoint(j / (num_control_points - 1));
            var end_pos = flight_path_splines[i].getPoint((j + 1) / (num_control_points - 1));

            line_positions[(i * num_control_points + j) * 6 + 0] = start_pos.x;
            line_positions[(i * num_control_points + j) * 6 + 1] = start_pos.y;
            line_positions[(i * num_control_points + j) * 6 + 2] = start_pos.z;
            line_positions[(i * num_control_points + j) * 6 + 3] = end_pos.x;
            line_positions[(i * num_control_points + j) * 6 + 4] = end_pos.y;
            line_positions[(i * num_control_points + j) * 6 + 5] = end_pos.z;

            colors[(i * num_control_points + j) * 6 + 0] = 1.0;
            colors[(i * num_control_points + j) * 6 + 1] = 0.4;
            colors[(i * num_control_points + j) * 6 + 2] = 1.0;
            colors[(i * num_control_points + j) * 6 + 3] = 1.0;
            colors[(i * num_control_points + j) * 6 + 4] = 0.4;
            colors[(i * num_control_points + j) * 6 + 5] = 1.0;
        }
    }

    geometry.addAttribute('position', new THREE.BufferAttribute(line_positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

    geometry.computeBoundingSphere();

    return new THREE.Line(geometry, material, THREE.LinePieces);
}

function flightPointCloud() {
    flight_point_cloud_geom = new THREE.BufferGeometry();

    var num_points = flights.length;

    positions = new Float32Array(num_points * 3);
    var colors = new Float32Array(num_points * 3);
    var sizes = new Float32Array(num_points);

    for (var i = 0; i < num_points; i++) {
        positions[3 * i + 0] = 0;
        positions[3 * i + 1] = 0;
        positions[3 * i + 2] = 0;

        colors[3 * i + 0] = Math.random();
        colors[3 * i + 1] = Math.random();
        colors[3 * i + 2] = Math.random();

        sizes[i] = 0.1;
    }

    flight_point_cloud_geom.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    flight_point_cloud_geom.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    flight_point_cloud_geom.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
    flight_point_cloud_geom.computeBoundingBox();

    var attributes = {
        size: {
            type: 'f',
            value: null
        },
        customColor: {
            type: 'c',
            value: null
        }
    };

    var uniforms = {
        color: {
            type: "c",
            value: new THREE.Color(0xffffff)
        },
        texture: {
            type: "t",
            value: THREE.ImageUtils.loadTexture("images/point.png")
        }
    };

    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        //attributes: attributes,
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true
    });

    return new THREE.Points(flight_point_cloud_geom, shaderMaterial);
}

function update_flights() {
    if (!flight_point_cloud_geom) {
        return;
    }
    flight_point_cloud_geom.attributes.position.needsUpdate = true;

    for (var i = start_flight_idx; i < end_flight_idx; ++i) {

        if (Date.now() > flight_point_start_time[i]) {
            var ease_val = easeOutQuadratic(Date.now() - flight_point_start_time[i], 0, 1, flight_point_end_time[i] - flight_point_start_time[i]);

            if (ease_val < 0 || flight_point_speed_changed) {
                ease_val = 0;
                setFlightTimes(i);
            }

            var pos = flight_path_splines[i].getPoint(ease_val);
            positions[3 * i + 0] = pos.x;
            positions[3 * i + 1] = pos.y;
            positions[3 * i + 2] = pos.z;
        }
    }
}

function setFlightTimes(index) {
    var scaling_factor = (flight_point_speed_scaling - flight_point_speed_min_scaling) / (flight_point_speed_max_scaling - flight_point_speed_min_scaling);
    var duration = (1 - scaling_factor) * flight_distance[index] * 80000;

    var start_time = Date.now() + Math.random() * 5000;
    flight_point_start_time[index] = start_time;
    flight_point_end_time[index] = start_time + duration;
}

function easeOutQuadratic(t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t + b;
    return -c / 2 * (--t * (t - 2) - 1) + b;
}

/**
 * @author kyle / http://nikai.us/
 */

var clear = function (context) {
    context && context.clearRect && context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    //context.canvas.width = context.canvas.width;
    //context.canvas.height = context.canvas.height;
};

/**
 * @author kyle / http://nikai.us/
 */

var resolutionScale = function (context) {
    var devicePixelRatio = window.devicePixelRatio;
    context.canvas.width = context.canvas.width * devicePixelRatio;
    context.canvas.height = context.canvas.height * devicePixelRatio;
    context.canvas.style.width = context.canvas.width / devicePixelRatio + 'px';
    context.canvas.style.height = context.canvas.height / devicePixelRatio + 'px';
    context.scale(devicePixelRatio, devicePixelRatio);
};

function Event() {
  this._subscribers = {}; // event subscribers
}

/**
 * Subscribe to an event, add an event listener
 * @param {String} event        Event name. Available events: 'put', 'update',
 *                              'remove'
 * @param {function} callback   Callback method. Called with three parameters:
 *                                  {String} event
 *                                  {Object | null} params
 *                                  {String | Number} senderId
 */
Event.prototype.on = function (event, callback) {
  var subscribers = this._subscribers[event];
  if (!subscribers) {
    subscribers = [];
    this._subscribers[event] = subscribers;
  }

  subscribers.push({
    callback: callback
  });
};

/**
 * Unsubscribe from an event, remove an event listener
 * @param {String} event
 * @param {function} callback
 */
Event.prototype.off = function (event, callback) {
  var subscribers = this._subscribers[event];
  if (subscribers) {
    //this._subscribers[event] = subscribers.filter(listener => listener.callback != callback);
    for (var i = 0; i < subscribers.length; i++) {
      if (subscribers[i].callback == callback) {
        subscribers.splice(i, 1);
        i--;
      }
    }
  }
};

/**
 * Trigger an event
 * @param {String} event
 * @param {Object | null} params
 * @param {String} [senderId]       Optional id of the sender.
 * @private
 */
Event.prototype._trigger = function (event, params, senderId) {
  if (event == '*') {
    throw new Error('Cannot trigger event *');
  }

  var subscribers = [];
  if (event in this._subscribers) {
    subscribers = subscribers.concat(this._subscribers[event]);
  }
  if ('*' in this._subscribers) {
    subscribers = subscribers.concat(this._subscribers['*']);
  }

  for (var i = 0, len = subscribers.length; i < len; i++) {
    var subscriber = subscribers[i];
    if (subscriber.callback) {
      subscriber.callback(event, params, senderId || null);
    }
  }
};

/**
 * @author kyle / http://nikai.us/
 */

function DataSet(data, options) {

    this._options = options || {};
    this._data = []; // map with data indexed by id

    // add initial data when provided
    if (data) {
        this.add(data);
    }
}

DataSet.prototype = new Event();

/**
 * Add data.
 */
DataSet.prototype.add = function (data, senderId) {
    if (Array.isArray(data)) {
        // Array
        for (var i = 0, len = data.length; i < len; i++) {
            if (data[i].time && data[i].time.length == 14 && data[i].time.substr(0, 2) == '20') {
                var time = data[i].time;
                data[i].time = new Date(time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2) + ' ' + time.substr(8, 2) + ':' + time.substr(10, 2) + ':' + time.substr(12, 2)).getTime();
            }
            this._data.push(data[i]);
        }
    } else if (data instanceof Object) {
        // Single item
        this._data.push(data);
    } else {
        throw new Error('Unknown dataType');
    }
};

/**
 * get data.
 */
DataSet.prototype.get = function (args) {
    args = args || {};

    //console.time('copy data time')
    var start = new Date();
    // TODO: 不修改原始数据，在数据上挂载新的名称，每次修改数据直接修改新名称下的数据，可以省去deepCopy
    // var data = deepCopy(this._data);
    var data = this._data;

    // console.timeEnd('copy data time')

    // console.time('transferCoordinate time')

    var start = new Date();

    if (args.filter) {
        var newData = [];
        for (var i = 0; i < data.length; i++) {
            if (args.filter(data[i])) {
                newData.push(data[i]);
            }
        }
        data = newData;
    }

    if (args.transferCoordinate) {
        data = this.transferCoordinate(data, args.transferCoordinate, args.fromColumn, args.toColumn);
    }

    // console.timeEnd('transferCoordinate time')

    return data;
};

/**
 * set data.
 */
DataSet.prototype.set = function (data) {
    this._set(data);
    this._trigger('change');
};

/**
 * set data.
 */
DataSet.prototype._set = function (data) {
    this.clear();
    this.add(data);
};

/**
 * clear data.
 */
DataSet.prototype.clear = function (args) {
    this._data = []; // map with data indexed by id
};

/**
 * remove data.
 */
DataSet.prototype.remove = function (args) {};

/**
 * update data.
 */
DataSet.prototype.update = function (args) {};

/**
 * transfer coordinate.
 */
DataSet.prototype.transferCoordinate = function (data, transferFn, fromColumn, toColumnName) {

    toColumnName = toColumnName || '_coordinates';
    fromColumn = fromColumn || 'coordinates';

    for (var i = 0; i < data.length; i++) {

        var item = data[i];

        if (data[i].geometry) {

            if (data[i].geometry.type === 'Point') {
                var coordinates = data[i].geometry[fromColumn];
                data[i].geometry[toColumnName] = transferFn(coordinates);
            }

            if (data[i].geometry.type === 'Polygon' || data[i].geometry.type === 'MultiPolygon') {

                var coordinates = data[i].geometry[fromColumn];

                if (data[i].geometry.type === 'Polygon') {

                    var newCoordinates = getPolygon(coordinates);
                    data[i].geometry[toColumnName] = newCoordinates;
                } else if (data[i].geometry.type === 'MultiPolygon') {
                    var newCoordinates = [];
                    for (var c = 0; c < coordinates.length; c++) {
                        var polygon = coordinates[c];
                        var polygon = getPolygon(polygon);
                        newCoordinates.push(polygon);
                    }

                    data[i].geometry[toColumnName] = newCoordinates;
                }
            }

            if (data[i].geometry.type === 'LineString') {
                var coordinates = data[i].geometry[fromColumn];
                var newCoordinates = [];
                for (var j = 0; j < coordinates.length; j++) {
                    newCoordinates.push(transferFn(coordinates[j]));
                }
                data[i].geometry[toColumnName] = newCoordinates;
            }
        }
    }

    function getPolygon(coordinates) {
        var newCoordinates = [];
        for (var c = 0; c < coordinates.length; c++) {
            var coordinate = coordinates[c];
            var newcoordinate = [];
            for (var j = 0; j < coordinate.length; j++) {
                newcoordinate.push(transferFn(coordinate[j]));
            }
            newCoordinates.push(newcoordinate);
        }
        return newCoordinates;
    }

    return data;
};

DataSet.prototype.initGeometry = function (transferFn) {
    if (transferFn) {
        this._data.forEach(function (item) {
            item.geometry = transferFn(item);
        });
    } else {
        this._data.forEach(function (item) {
            if (!item.geometry && item.lng && item.lat) {
                item.geometry = {
                    type: 'Point',
                    coordinates: [item.lng, item.lat]
                };
            }
        });
    }
};

/**
 * 获取当前列的最大值
 */
DataSet.prototype.getMax = function (columnName) {
    var data = this._data;

    if (!data || data.length <= 0) {
        return;
    }

    var max = parseFloat(data[0][columnName]);

    for (var i = 1; i < data.length; i++) {
        var value = parseFloat(data[i][columnName]);
        if (value > max) {
            max = value;
        }
    }

    return max;
};

/**
 * 获取当前列的总和
 */
DataSet.prototype.getSum = function (columnName) {
    var data = this._data;

    if (!data || data.length <= 0) {
        return;
    }

    var sum = 0;

    for (var i = 0; i < data.length; i++) {
        if (data[i][columnName]) {
            sum += parseFloat(data[i][columnName]);
        }
    }

    return sum;
};

/**
 * 获取当前列的最小值
 */
DataSet.prototype.getMin = function (columnName) {
    var data = this._data;

    if (!data || data.length <= 0) {
        return;
    }

    var min = parseFloat(data[0][columnName]);

    for (var i = 1; i < data.length; i++) {
        var value = parseFloat(data[i][columnName]);
        if (value < min) {
            min = value;
        }
    }

    return min;
};

/**
 * @author kyle / http://nikai.us/
 */

var pathSimple = {
    drawDataSet: function drawDataSet(context, dataSet, options) {

        var data = dataSet instanceof DataSet ? dataSet.get() : dataSet;

        for (var i = 0, len = data.length; i < len; i++) {
            var item = data[i];
            this.draw(context, item, options);
        }
    },
    draw: function draw(context, data, options) {
        var type = data.geometry.type;
        var coordinates = data.geometry._coordinates || data.geometry.coordinates;
        var symbol = options.symbol || 'circle';
        switch (type) {
            case 'Point':
                var size = data._size || data.size || options._size || options.size || 5;
                if (options.symbol === 'rect') {
                    context.rect(coordinates[0] - size / 2, coordinates[1] - size / 2, size, size);
                } else {
                    context.moveTo(coordinates[0], coordinates[1]);
                    context.arc(coordinates[0], coordinates[1], size, 0, Math.PI * 2);
                }
                break;
            case 'LineString':
                for (var j = 0; j < coordinates.length; j++) {
                    var x = coordinates[j][0];
                    var y = coordinates[j][1];
                    if (j == 0) {
                        context.moveTo(x, y);
                    } else {
                        context.lineTo(x, y);
                    }
                }
                break;
            case 'Polygon':
                this.drawPolygon(context, coordinates);
                break;
            case 'MultiPolygon':
                for (var i = 0; i < coordinates.length; i++) {
                    var polygon = coordinates[i];
                    this.drawPolygon(context, polygon);
                }
                context.closePath();
                break;
            default:
                console.log('type' + type + 'is not support now!');
                break;
        }
    },

    drawPolygon: function drawPolygon(context, coordinates) {

        for (var i = 0; i < coordinates.length; i++) {

            var coordinate = coordinates[i];

            context.moveTo(coordinate[0][0], coordinate[0][1]);
            for (var j = 1; j < coordinate.length; j++) {
                context.lineTo(coordinate[j][0], coordinate[j][1]);
            }
            context.lineTo(coordinate[0][0], coordinate[0][1]);
        }
    }

};

/**
 * @author kyle / http://nikai.us/
 */

var drawSimple = {
    draw: function draw(context, dataSet, options) {
        var data = dataSet instanceof DataSet ? dataSet.get() : dataSet;
        // console.log('xxxx',options)
        context.save();

        for (var key in options) {
            context[key] = options[key];
        }

        // console.log(data);
        if (options.bigData) {
            context.save();
            context.beginPath();

            for (var i = 0, len = data.length; i < len; i++) {

                var item = data[i];

                pathSimple.draw(context, item, options);
            }

            var type = options.bigData;

            if (type == 'Point' || type == 'Polygon' || type == 'MultiPolygon') {

                context.fill();

                if ((item.strokeStyle || options.strokeStyle) && options.lineWidth) {
                    context.stroke();
                }
            } else if (type == 'LineString') {
                context.stroke();
            }

            context.restore();
        } else {
            for (var i = 0, len = data.length; i < len; i++) {

                var item = data[i];

                context.save();

                if (item.fillStyle) {
                    context.fillStyle = item.fillStyle;
                }

                if (item.strokeStyle) {
                    context.strokeStyle = item.strokeStyle;
                }

                var type = item.geometry.type;

                context.beginPath();

                pathSimple.draw(context, item, options);

                if (type == 'Point' || type == 'Polygon' || type == 'MultiPolygon') {

                    context.fill();

                    if ((item.strokeStyle || options.strokeStyle) && options.lineWidth) {
                        context.stroke();
                    }
                } else if (type == 'LineString') {
                    context.stroke();
                }

                context.restore();
            }
        }

        context.restore();
    }
};

/**
 * @author kyle / http://nikai.us/
 */

var utilsColorPalette = {
    getImageData: function getImageData(config) {
        var gradientConfig = config.gradient || config.defaultGradient;
        if (typeof document === 'undefined') {
            // var Canvas = require('canvas');
            // var paletteCanvas = new Canvas(256, 1);
        } else {
            var paletteCanvas = document.createElement('canvas');
        }
        var paletteCtx = paletteCanvas.getContext('2d');

        paletteCanvas.width = 256;
        paletteCanvas.height = 1;

        var gradient = paletteCtx.createLinearGradient(0, 0, 256, 1);
        for (var key in gradientConfig) {
            gradient.addColorStop(parseFloat(key), gradientConfig[key]);
        }

        paletteCtx.fillStyle = gradient;
        paletteCtx.fillRect(0, 0, 256, 1);

        return paletteCtx.getImageData(0, 0, 256, 1).data;
    }
};

/**
 * @author kyle / http://nikai.us/
 */

function createCircle(size) {

    if (typeof document === 'undefined') {
        // var Canvas = require('canvas');
        // var circle = new Canvas();
    } else {
        var circle = document.createElement('canvas');
    }
    var context = circle.getContext('2d');
    var shadowBlur = size / 2;
    var r2 = size + shadowBlur;
    var offsetDistance = 10000;

    circle.width = circle.height = r2 * 2;

    context.shadowBlur = shadowBlur;
    context.shadowColor = 'black';
    context.shadowOffsetX = context.shadowOffsetY = offsetDistance;

    context.beginPath();
    context.arc(r2 - offsetDistance, r2 - offsetDistance, size, 0, Math.PI * 2, true);
    context.closePath();
    context.fill();
    return circle;
}

function colorize(pixels, gradient, options) {

    var maxOpacity = options.maxOpacity || 0.8;
    for (var i = 3, len = pixels.length, j; i < len; i += 4) {
        j = pixels[i] * 4; // get gradient color from opacity value

        if (pixels[i] / 256 > maxOpacity) {
            pixels[i] = 256 * maxOpacity;
        }

        pixels[i - 3] = gradient[j];
        pixels[i - 2] = gradient[j + 1];
        pixels[i - 1] = gradient[j + 2];
    }
}

function drawGray(context, dataSet, options) {

    var max = options.max || 100;
    // console.log(max)
    var size = options._size;
    if (size == undefined) {
        size = options.size;
        if (size == undefined) {
            size = 13;
        }
    }

    var color = new Intensity({
        gradient: options.gradient,
        max: max
    });

    var circle = createCircle(size);

    var data = dataSet;

    var dataOrderByAlpha = {};

    data.forEach(function (item, index) {
        var count = item.count === undefined ? 1 : item.count;
        var alpha = Math.min(1, count / max).toFixed(2);
        dataOrderByAlpha[alpha] = dataOrderByAlpha[alpha] || [];
        dataOrderByAlpha[alpha].push(item);
    });

    for (var i in dataOrderByAlpha) {
        if (isNaN(i)) continue;
        var _data = dataOrderByAlpha[i];
        context.beginPath();
        if (!options.withoutAlpha) {
            context.globalAlpha = i;
        }
        _data.forEach(function (item, index) {
            if (!item.geometry) {
                return;
            }

            var coordinates = item.geometry._coordinates || item.geometry.coordinates;
            var type = item.geometry.type;
            if (type === 'Point') {
                var count = item.count === undefined ? 1 : item.count;
                context.globalAlpha = count / max;
                context.drawImage(circle, coordinates[0] - circle.width / 2, coordinates[1] - circle.height / 2);
            } else if (type === 'LineString') {
                pathSimple.draw(context, item, options);
            } else if (type === 'Polygon') {}
        });
        // console.warn(i, i * max, color.getColor(i * max))
        context.strokeStyle = color.getColor(i * max);
        context.stroke();
    }
}

function draw(context, dataSet, options) {
    var strength = options.strength || 0.3;
    context.strokeStyle = 'rgba(0,0,0,' + strength + ')';

    options = options || {};

    var data = dataSet.get();

    context.save();
    //console.time('drawGray')
    drawGray(context, data, options);
    //console.timeEnd('drawGray');
    // return false;
    if (!options.absolute) {
        //console.time('changeColor');
        var colored = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
        colorize(colored.data, utilsColorPalette.getImageData({
            defaultGradient: options.gradient || {
                0.25: "rgba(0, 0, 255, 1)",
                0.55: "rgba(0, 255, 0, 1)",
                0.85: "rgba(255, 255, 0, 1)",
                1.0: "rgba(255, 0, 0, 1)"
            }
        }), options);
        //console.timeEnd('changeColor');
        context.putImageData(colored, 0, 0);

        context.restore();
    }
}

var drawHeatmap = {
    draw: draw
};

/**
 * @author kyle / http://nikai.us/
 */

var drawGrid = {
    draw: function draw(context, dataSet, options) {

        context.save();

        var data = dataSet.get();

        var grids = {};

        var size = options._size || options.size || 50;

        var offset = options.offset || {
            x: 0,
            y: 0
        };

        for (var i = 0; i < data.length; i++) {
            var coordinates = data[i].geometry._coordinates || data[i].geometry.coordinates;
            var gridKey = Math.floor((coordinates[0] - offset.x) / size) + "," + Math.floor((coordinates[1] - offset.y) / size);
            if (!grids[gridKey]) {
                grids[gridKey] = 0;
            }
            grids[gridKey] += ~~(data[i].count || 1);
        }

        for (var gridKey in grids) {
            gridKey = gridKey.split(",");

            var intensity = new Intensity({
                max: options.max || 100,
                gradient: options.gradient
            });

            context.beginPath();
            context.rect(gridKey[0] * size + .5 + offset.x, gridKey[1] * size + .5 + offset.y, size, size);
            context.fillStyle = intensity.getColor(grids[gridKey]);
            context.fill();
            if (options.showText) {
                context.fillStyle = 'white';
                context.fillText(grids[gridKey], gridKey[0] * size + .5 + offset.x + size / 2, gridKey[1] * size + .5 + offset.y + size / 2);
            }
            if (options.strokeStyle && options.lineWidth) {
                context.stroke();
            }
        }

        context.restore();
    }
};

/**
 * @author kyle / http://nikai.us/
 */

function hex_corner(center, size, i) {
    var angle_deg = 60 * i + 30;
    var angle_rad = Math.PI / 180 * angle_deg;
    return [center.x + size * Math.cos(angle_rad), center.y + size * Math.sin(angle_rad)];
}

var drawHoneycomb = {
    draw: function draw(context, dataSet, options) {

        context.save();

        var data = dataSet.get();

        for (var key in options) {
            context[key] = options[key];
        }

        var grids = {};

        var offset = options.offset || {
            x: 10,
            y: 10
        };

        //
        var r = options._size || options.size || 40;
        r = r / 2 / Math.sin(Math.PI / 3);
        var dx = r * 2 * Math.sin(Math.PI / 3);
        var dy = r * 1.5;

        var binsById = {};

        for (var i = 0; i < data.length; i++) {
            var coordinates = data[i].geometry._coordinates || data[i].geometry.coordinates;
            var py = (coordinates[1] - offset.y) / dy,
                pj = Math.round(py),
                px = (coordinates[0] - offset.x) / dx - (pj & 1 ? .5 : 0),
                pi = Math.round(px),
                py1 = py - pj;

            if (Math.abs(py1) * 3 > 1) {
                var px1 = px - pi,
                    pi2 = pi + (px < pi ? -1 : 1) / 2,
                    pj2 = pj + (py < pj ? -1 : 1),
                    px2 = px - pi2,
                    py2 = py - pj2;
                if (px1 * px1 + py1 * py1 > px2 * px2 + py2 * py2) pi = pi2 + (pj & 1 ? 1 : -1) / 2, pj = pj2;
            }

            var id = pi + "-" + pj,
                bin = binsById[id];
            if (bin) {
                bin.push(data[i]);
            } else {
                bin = binsById[id] = [data[i]];
                bin.i = pi;
                bin.j = pj;
                bin.x = (pi + (pj & 1 ? 1 / 2 : 0)) * dx;
                bin.y = pj * dy;
            }
        }

        var intensity = new Intensity({
            max: options.max || 100,
            maxSize: r,
            gradient: options.gradient
        });

        for (var key in binsById) {

            var item = binsById[key];

            context.beginPath();

            for (var j = 0; j < 6; j++) {

                var radius = r;

                var result = hex_corner({
                    x: item.x + offset.x,
                    y: item.y + offset.y
                }, radius, j);
                context.lineTo(result[0], result[1]);
            }
            context.closePath();

            var count = 0;
            for (var i = 0; i < item.length; i++) {
                count += item[i].count || 1;
            }

            context.fillStyle = intensity.getColor(count);
            context.fill();
            if (options.strokeStyle && options.lineWidth) {
                context.stroke();
            }
        }

        context.restore();
    }
};

function createShader(gl, src, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
}

function initShaders$1(gl, vs_source, fs_source) {

    var vertexShader = createShader(gl, vs_source, gl.VERTEX_SHADER);
    var fragmentShader = createShader(gl, fs_source, gl.FRAGMENT_SHADER);

    var glProgram = gl.createProgram();

    gl.attachShader(glProgram, vertexShader);
    gl.attachShader(glProgram, fragmentShader);
    gl.linkProgram(glProgram);

    gl.useProgram(glProgram);

    return glProgram;
}

function getColorData(color) {
    var tmpCanvas = document.createElement('canvas');
    var tmpCtx = tmpCanvas.getContext('2d');
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    tmpCtx.fillStyle = color;
    tmpCtx.fillRect(0, 0, 1, 1);
    return tmpCtx.getImageData(0, 0, 1, 1).data;
}

var vs_s = ['attribute vec4 a_Position;', 'void main() {', 'gl_Position = a_Position;', 'gl_PointSize = 30.0;', '}'].join('');

var fs_s = ['precision mediump float;', 'uniform vec4 u_FragColor;', 'void main() {', 'gl_FragColor = u_FragColor;', '}'].join('');

function draw$1(gl, data, options) {

    if (!data) {
        return;
    }

    var program = initShaders$1(gl, vs_s, fs_s);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    //gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var halfCanvasWidth = gl.canvas.width / 2;
    var halfCanvasHeight = gl.canvas.height / 2;

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    var uFragColor = gl.getUniformLocation(program, 'u_FragColor');

    var colored = getColorData(options.strokeStyle || 'red');

    gl.uniform4f(uFragColor, colored[0] / 255, colored[1] / 255, colored[2] / 255, colored[3] / 255);

    gl.lineWidth(options.lineWidth || 1);

    for (var i = 0, len = data.length; i < len; i++) {
        var _geometry = data[i].geometry._coordinates;

        var verticesData = [];

        for (var j = 0; j < _geometry.length; j++) {
            var item = _geometry[j];

            var x = (item[0] - halfCanvasWidth) / halfCanvasWidth;
            var y = (halfCanvasHeight - item[1]) / halfCanvasHeight;
            verticesData.push(x, y);
        }
        var vertices = new Float32Array(verticesData);
        // Write date into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.drawArrays(gl.LINE_STRIP, 0, _geometry.length);
    }
}

var line = {
    draw: draw$1
};

var vs_s$1 = ['attribute vec4 a_Position;', 'attribute float a_PointSize;', 'void main() {', 'gl_Position = a_Position;', 'gl_PointSize = a_PointSize;', '}'].join('');

var fs_s$1 = ['precision mediump float;', 'uniform vec4 u_FragColor;', 'void main() {', 'gl_FragColor = u_FragColor;', '}'].join('');

function draw$2(gl, data, options) {

    if (!data) {
        return;
    }

    var program = initShaders$1(gl, vs_s$1, fs_s$1);

    var a_Position = gl.getAttribLocation(program, 'a_Position');

    var a_PointSize = gl.getAttribLocation(program, 'a_PointSize');

    var uFragColor = gl.getUniformLocation(program, 'u_FragColor');

    //gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var halfCanvasWidth = gl.canvas.width / 2;
    var halfCanvasHeight = gl.canvas.height / 2;

    var verticesData = [];
    var count = 0;
    for (var i = 0; i < data.length; i++) {
        var item = data[i].geometry._coordinates;

        var x = (item[0] - halfCanvasWidth) / halfCanvasWidth;
        var y = (halfCanvasHeight - item[1]) / halfCanvasHeight;

        if (x < -1 || x > 1 || y < -1 || y > 1) {
            continue;
        }
        verticesData.push(x, y);
        count++;
    }

    var vertices = new Float32Array(verticesData);
    var n = count; // The number of vertices

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.vertexAttrib1f(a_PointSize, options._size);

    var colored = getColorData(options.fillStyle || 'red');

    gl.uniform4f(uFragColor, colored[0] / 255, colored[1] / 255, colored[2] / 255, colored[3] / 255);
    gl.drawArrays(gl.POINTS, 0, n);
}

var point = {
    draw: draw$2
};

function earcut(data, holeIndices, dim) {

    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
        outerLen = hasHoles ? holeIndices[0] * dim : data.length,
        outerNode = linkedList(data, 0, outerLen, dim, true),
        triangles = [];

    if (!outerNode) return triangles;

    var minX, minY, maxX, maxY, x, y, size;

    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
        minX = maxX = data[0];
        minY = maxY = data[1];

        for (var i = dim; i < outerLen; i += dim) {
            x = data[i];
            y = data[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        // minX, minY and size are later used to transform coords into integers for z-order calculation
        size = Math.max(maxX - minX, maxY - minY);
    }

    earcutLinked(outerNode, triangles, dim, minX, minY, size);

    return triangles;
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === signedArea(data, start, end, dim) > 0) {
        for (i = start; i < end; i += dim) {
            last = insertNode(i, data[i], data[i + 1], last);
        }
    } else {
        for (i = end - dim; i >= start; i -= dim) {
            last = insertNode(i, data[i], data[i + 1], last);
        }
    }

    if (last && equals(last, last.next)) {
        removeNode(last);
        last = last.next;
    }

    return last;
}

// eliminate colinear or duplicate points
function filterPoints(start, end) {
    if (!start) return start;
    if (!end) end = start;

    var p = start,
        again;
    do {
        again = false;

        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
            removeNode(p);
            p = end = p.prev;
            if (p === p.next) return null;
            again = true;
        } else {
            p = p.next;
        }
    } while (again || p !== end);

    return end;
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(ear, triangles, dim, minX, minY, size, pass) {
    if (!ear) return;

    // interlink polygon nodes in z-order
    if (!pass && size) indexCurve(ear, minX, minY, size);

    var stop = ear,
        prev,
        next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;

        if (size ? isEarHashed(ear, minX, minY, size) : isEar(ear)) {
            // cut off the triangle
            triangles.push(prev.i / dim);
            triangles.push(ear.i / dim);
            triangles.push(next.i / dim);

            removeNode(ear);

            // skipping the next vertice leads to less sliver triangles
            ear = next.next;
            stop = next.next;

            continue;
        }

        ear = next;

        // if we looped through the whole remaining polygon and can't find any more ears
        if (ear === stop) {
            // try filtering points and slicing again
            if (!pass) {
                earcutLinked(filterPoints(ear), triangles, dim, minX, minY, size, 1);

                // if this didn't work, try curing all small self-intersections locally
            } else if (pass === 1) {
                ear = cureLocalIntersections(ear, triangles, dim);
                earcutLinked(ear, triangles, dim, minX, minY, size, 2);

                // as a last resort, try splitting the remaining polygon into two
            } else if (pass === 2) {
                splitEarcut(ear, triangles, dim, minX, minY, size);
            }

            break;
        }
    }
}

// check whether a polygon node forms a valid ear with adjacent nodes
function isEar(ear) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
        if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
        p = p.next;
    }

    return true;
}

function isEarHashed(ear, minX, minY, size) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? a.x < c.x ? a.x : c.x : b.x < c.x ? b.x : c.x,
        minTY = a.y < b.y ? a.y < c.y ? a.y : c.y : b.y < c.y ? b.y : c.y,
        maxTX = a.x > b.x ? a.x > c.x ? a.x : c.x : b.x > c.x ? b.x : c.x,
        maxTY = a.y > b.y ? a.y > c.y ? a.y : c.y : b.y > c.y ? b.y : c.y;

    // z-order range for the current triangle bbox;
    var minZ = zOrder(minTX, minTY, minX, minY, size),
        maxZ = zOrder(maxTX, maxTY, minX, minY, size);

    // first look for points inside the triangle in increasing z-order
    var p = ear.nextZ;

    while (p && p.z <= maxZ) {
        if (p !== ear.prev && p !== ear.next && pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
        p = p.nextZ;
    }

    // then look for points in decreasing z-order
    p = ear.prevZ;

    while (p && p.z >= minZ) {
        if (p !== ear.prev && p !== ear.next && pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;
    }

    return true;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start, triangles, dim) {
    var p = start;
    do {
        var a = p.prev,
            b = p.next.next;

        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

            triangles.push(a.i / dim);
            triangles.push(p.i / dim);
            triangles.push(b.i / dim);

            // remove two nodes involved
            removeNode(p);
            removeNode(p.next);

            p = start = b;
        }
        p = p.next;
    } while (p !== start);

    return p;
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(start, triangles, dim, minX, minY, size) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
        var b = a.next.next;
        while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal(a, b)) {
                // split the polygon in two by the diagonal
                var c = splitPolygon(a, b);

                // filter colinear points around the cuts
                a = filterPoints(a, a.next);
                c = filterPoints(c, c.next);

                // run earcut on each half
                earcutLinked(a, triangles, dim, minX, minY, size);
                earcutLinked(c, triangles, dim, minX, minY, size);
                return;
            }
            b = b.next;
        }
        a = a.next;
    } while (a !== start);
}

// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(data, holeIndices, outerNode, dim) {
    var queue = [],
        i,
        len,
        start,
        end,
        list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
        start = holeIndices[i] * dim;
        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        list = linkedList(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost(list));
    }

    queue.sort(compareX);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
        eliminateHole(queue[i], outerNode);
        outerNode = filterPoints(outerNode, outerNode.next);
    }

    return outerNode;
}

function compareX(a, b) {
    return a.x - b.x;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
function eliminateHole(hole, outerNode) {
    outerNode = findHoleBridge(hole, outerNode);
    if (outerNode) {
        var b = splitPolygon(outerNode, hole);
        filterPoints(b, b.next);
    }
}

// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole, outerNode) {
    var p = outerNode,
        hx = hole.x,
        hy = hole.y,
        qx = -Infinity,
        m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
        if (hy <= p.y && hy >= p.next.y) {
            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                if (x === hx) {
                    if (hy === p.y) return p;
                    if (hy === p.next.y) return p.next;
                }
                m = p.x < p.next.x ? p : p.next;
            }
        }
        p = p.next;
    } while (p !== outerNode);

    if (!m) return null;

    if (hx === qx) return m.prev; // hole touches outer segment; pick lower endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
        mx = m.x,
        my = m.y,
        tanMin = Infinity,
        tan;

    p = m.next;

    while (p !== stop) {
        if (hx >= p.x && p.x >= mx && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

            if ((tan < tanMin || tan === tanMin && p.x > m.x) && locallyInside(p, hole)) {
                m = p;
                tanMin = tan;
            }
        }

        p = p.next;
    }

    return m;
}

// interlink polygon nodes in z-order
function indexCurve(start, minX, minY, size) {
    var p = start;
    do {
        if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, size);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked(p);
}

// Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
function sortLinked(list) {
    var i,
        p,
        q,
        e,
        tail,
        numMerges,
        pSize,
        qSize,
        inSize = 1;

    do {
        p = list;
        list = null;
        tail = null;
        numMerges = 0;

        while (p) {
            numMerges++;
            q = p;
            pSize = 0;
            for (i = 0; i < inSize; i++) {
                pSize++;
                q = q.nextZ;
                if (!q) break;
            }

            qSize = inSize;

            while (pSize > 0 || qSize > 0 && q) {

                if (pSize === 0) {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                } else if (qSize === 0 || !q) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else if (p.z <= q.z) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                }

                if (tail) tail.nextZ = e;else list = e;

                e.prevZ = tail;
                tail = e;
            }

            p = q;
        }

        tail.nextZ = null;
        inSize *= 2;
    } while (numMerges > 1);

    return list;
}

// z-order of a point given coords and size of the data bounding box
function zOrder(x, y, minX, minY, size) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) / size;
    y = 32767 * (y - minY) / size;

    x = (x | x << 8) & 0x00FF00FF;
    x = (x | x << 4) & 0x0F0F0F0F;
    x = (x | x << 2) & 0x33333333;
    x = (x | x << 1) & 0x55555555;

    y = (y | y << 8) & 0x00FF00FF;
    y = (y | y << 4) & 0x0F0F0F0F;
    y = (y | y << 2) & 0x33333333;
    y = (y | y << 1) & 0x55555555;

    return x | y << 1;
}

// find the leftmost node of a polygon ring
function getLeftmost(start) {
    var p = start,
        leftmost = start;
    do {
        if (p.x < leftmost.x) leftmost = p;
        p = p.next;
    } while (p !== start);

    return leftmost;
}

// check if a point lies within a convex triangle
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 && (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 && (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
}

// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
function isValidDiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b);
}

// signed area of a triangle
function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// check if two points are equal
function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

// check if two segments intersect
function intersects(p1, q1, p2, q2) {
    if (equals(p1, q1) && equals(p2, q2) || equals(p1, q2) && equals(p2, q1)) return true;
    return area(p1, q1, p2) > 0 !== area(p1, q1, q2) > 0 && area(p2, q2, p1) > 0 !== area(p2, q2, q1) > 0;
}

// check if a polygon diagonal intersects any polygon segments
function intersectsPolygon(a, b) {
    var p = a;
    do {
        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true;
        p = p.next;
    } while (p !== a);

    return false;
}

// check if a polygon diagonal is locally inside the polygon
function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

// check if the middle point of a polygon diagonal is inside the polygon
function middleInside(a, b) {
    var p = a,
        inside = false,
        px = (a.x + b.x) / 2,
        py = (a.y + b.y) / 2;
    do {
        if (p.y > py !== p.next.y > py && px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x) inside = !inside;
        p = p.next;
    } while (p !== a);

    return inside;
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
function splitPolygon(a, b) {
    var a2 = new Node(a.i, a.x, a.y),
        b2 = new Node(b.i, b.x, b.y),
        an = a.next,
        bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
}

// create a node and optionally link it with previous one (in a circular doubly linked list)
function insertNode(i, x, y, last) {
    var p = new Node(i, x, y);

    if (!last) {
        p.prev = p;
        p.next = p;
    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function Node(i, x, y) {
    // vertice index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertice nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
}

// return a percentage difference between the polygon area and its triangulation area;
// used to verify correctness of triangulation
earcut.deviation = function (data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
    if (hasHoles) {
        for (var i = 0, len = holeIndices.length; i < len; i++) {
            var start = holeIndices[i] * dim;
            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            polygonArea -= Math.abs(signedArea(data, start, end, dim));
        }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
        var a = triangles[i] * dim;
        var b = triangles[i + 1] * dim;
        var c = triangles[i + 2] * dim;
        trianglesArea += Math.abs((data[a] - data[c]) * (data[b + 1] - data[a + 1]) - (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
    }

    return polygonArea === 0 && trianglesArea === 0 ? 0 : Math.abs((trianglesArea - polygonArea) / polygonArea);
};

function signedArea(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
    }
    return sum;
}

// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
earcut.flatten = function (data) {
    var dim = data[0][0].length,
        result = { vertices: [], holes: [], dimensions: dim },
        holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var d = 0; d < dim; d++) {
                result.vertices.push(data[i][j][d]);
            }
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            result.holes.push(holeIndex);
        }
    }
    return result;
};

var vs_s$2 = ['attribute vec4 a_Position;', 'void main() {', 'gl_Position = a_Position;', 'gl_PointSize = 30.0;', '}'].join('');

var fs_s$2 = ['precision mediump float;', 'uniform vec4 u_FragColor;', 'void main() {', 'gl_FragColor = u_FragColor;', '}'].join('');

function draw$3(gl, data, options) {

    if (!data) {
        return;
    }

    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    var program = initShaders$1(gl, vs_s$2, fs_s$2);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    var halfCanvasWidth = gl.canvas.width / 2;
    var halfCanvasHeight = gl.canvas.height / 2;

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    var uFragColor = gl.getUniformLocation(program, 'u_FragColor');

    var colored = getColorData(options.fillStyle || 'red');

    gl.uniform4f(uFragColor, colored[0] / 255, colored[1] / 255, colored[2] / 255, colored[3] / 255);

    gl.lineWidth(options.lineWidth || 1);

    var verticesArr = [];
    var trianglesArr = [];

    var maxSize = 65536;
    var indexOffset = 0;

    for (var i = 0, len = data.length; i < len; i++) {

        var flatten = earcut.flatten(data[i].geometry._coordinates || data[i].geometry.coordinates);
        var vertices = flatten.vertices;
        indexOffset = verticesArr.length / 2;
        for (var j = 0; j < vertices.length; j += 2) {
            vertices[j] = (vertices[j] - halfCanvasWidth) / halfCanvasWidth;
            vertices[j + 1] = (halfCanvasHeight - vertices[j + 1]) / halfCanvasHeight;
        }

        if ((verticesArr.length + vertices.length) / 2 > maxSize) {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesArr), gl.STATIC_DRAW);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(trianglesArr), gl.STATIC_DRAW);
            gl.drawElements(gl.TRIANGLES, trianglesArr.length, gl.UNSIGNED_SHORT, 0);
            verticesArr.length = 0;
            trianglesArr.length = 0;
            indexOffset = 0;
        }

        for (var j = 0; j < vertices.length; j++) {
            verticesArr.push(vertices[j]);
        }

        var triangles = earcut(vertices, flatten.holes, flatten.dimensions);
        for (var j = 0; j < triangles.length; j++) {
            trianglesArr.push(triangles[j] + indexOffset);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesArr), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(trianglesArr), gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, trianglesArr.length, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

var polygon = {
    draw: draw$3
};

/**
 * @author kyle / http://nikai.us/
 */
var webglDrawSimple = {
    draw: function draw(gl, dataSet, options) {
        var data = dataSet instanceof DataSet ? dataSet.get() : dataSet;
        if (data.length > 0) {
            if (data[0].geometry.type == "LineString") {
                line.draw(gl, data, options);
            } else if (data[0].geometry.type == "Polygon" || data[0].geometry.type == "MultiPolygon") {
                polygon.draw(gl, data, options);
            } else {
                point.draw(gl, data, options);
            }
        }
    }
};

/**
 * get the center by the city name
 * @author kyle / http://nikai.us/
 */

var citycenter = { municipalities: [{ n: "北京", g: "116.395645,39.929986|12" }, { n: "上海", g: "121.487899,31.249162|12" }, { n: "天津", g: "117.210813,39.14393|12" }, { n: "重庆", g: "106.530635,29.544606|12" }], provinces: [{ n: "安徽", g: "117.216005,31.859252|8", cities: [{ n: "合肥", g: "117.282699,31.866942|12" }, { n: "安庆", g: "117.058739,30.537898|13" }, { n: "蚌埠", g: "117.35708,32.929499|13" }, { n: "亳州", g: "115.787928,33.871211|13" }, { n: "巢湖", g: "117.88049,31.608733|13" }, { n: "池州", g: "117.494477,30.660019|14" }, { n: "滁州", g: "118.32457,32.317351|13" }, { n: "阜阳", g: "115.820932,32.901211|13" }, { n: "淮北", g: "116.791447,33.960023|13" }, { n: "淮南", g: "117.018639,32.642812|13" }, { n: "黄山", g: "118.29357,29.734435|13" }, { n: "六安", g: "116.505253,31.755558|13" }, { n: "马鞍山", g: "118.515882,31.688528|13" }, { n: "宿州", g: "116.988692,33.636772|13" }, { n: "铜陵", g: "117.819429,30.94093|14" }, { n: "芜湖", g: "118.384108,31.36602|12" }, { n: "宣城", g: "118.752096,30.951642|13" }] }, { n: "福建", g: "117.984943,26.050118|8", cities: [{ n: "福州", g: "119.330221,26.047125|12" }, { n: "龙岩", g: "117.017997,25.078685|13" }, { n: "南平", g: "118.181883,26.643626|13" }, { n: "宁德", g: "119.542082,26.656527|14" }, { n: "莆田", g: "119.077731,25.44845|13" }, { n: "泉州", g: "118.600362,24.901652|12" }, { n: "三明", g: "117.642194,26.270835|14" }, { n: "厦门", g: "118.103886,24.489231|12" }, { n: "漳州", g: "117.676205,24.517065|12" }] }, { n: "甘肃", g: "102.457625,38.103267|6", cities: [{ n: "兰州", g: "103.823305,36.064226|12" }, { n: "白银", g: "104.171241,36.546682|13" }, { n: "定西", g: "104.626638,35.586056|13" }, { n: "甘南州", g: "102.917442,34.992211|14" }, { n: "嘉峪关", g: "98.281635,39.802397|13" }, { n: "金昌", g: "102.208126,38.516072|13" }, { n: "酒泉", g: "98.508415,39.741474|13" }, { n: "临夏州", g: "103.215249,35.598514|13" }, { n: "陇南", g: "104.934573,33.39448|14" }, { n: "平凉", g: "106.688911,35.55011|13" }, { n: "庆阳", g: "107.644227,35.726801|13" }, { n: "天水", g: "105.736932,34.584319|13" }, { n: "武威", g: "102.640147,37.933172|13" }, { n: "张掖", g: "100.459892,38.93932|13" }] }, { n: "广东", g: "113.394818,23.408004|8", cities: [{ n: "广州", g: "113.30765,23.120049|12" }, { n: "潮州", g: "116.630076,23.661812|13" }, { n: "东莞", g: "113.763434,23.043024|12" }, { n: "佛山", g: "113.134026,23.035095|13" }, { n: "河源", g: "114.713721,23.757251|12" }, { n: "惠州", g: "114.410658,23.11354|12" }, { n: "江门", g: "113.078125,22.575117|13" }, { n: "揭阳", g: "116.379501,23.547999|13" }, { n: "茂名", g: "110.931245,21.668226|13" }, { n: "梅州", g: "116.126403,24.304571|13" }, { n: "清远", g: "113.040773,23.698469|13" }, { n: "汕头", g: "116.72865,23.383908|13" }, { n: "汕尾", g: "115.372924,22.778731|14" }, { n: "韶关", g: "113.594461,24.80296|13" }, { n: "深圳", g: "114.025974,22.546054|12" }, { n: "阳江", g: "111.97701,21.871517|14" }, { n: "云浮", g: "112.050946,22.937976|13" }, { n: "湛江", g: "110.365067,21.257463|13" }, { n: "肇庆", g: "112.479653,23.078663|13" }, { n: "中山", g: "113.42206,22.545178|12" }, { n: "珠海", g: "113.562447,22.256915|13" }] }, { n: "广西", g: "108.924274,23.552255|7", cities: [{ n: "南宁", g: "108.297234,22.806493|12" }, { n: "百色", g: "106.631821,23.901512|13" }, { n: "北海", g: "109.122628,21.472718|13" }, { n: "崇左", g: "107.357322,22.415455|14" }, { n: "防城港", g: "108.351791,21.617398|15" }, { n: "桂林", g: "110.26092,25.262901|12" }, { n: "贵港", g: "109.613708,23.103373|13" }, { n: "河池", g: "108.069948,24.699521|14" }, { n: "贺州", g: "111.552594,24.411054|14" }, { n: "来宾", g: "109.231817,23.741166|14" }, { n: "柳州", g: "109.422402,24.329053|12" }, { n: "钦州", g: "108.638798,21.97335|13" }, { n: "梧州", g: "111.305472,23.485395|13" }, { n: "玉林", g: "110.151676,22.643974|14" }] }, { n: "贵州", g: "106.734996,26.902826|8", cities: [{ n: "贵阳", g: "106.709177,26.629907|12" }, { n: "安顺", g: "105.92827,26.228595|13" }, { n: "毕节地区", g: "105.300492,27.302612|14" }, { n: "六盘水", g: "104.852087,26.591866|13" }, { n: "铜仁地区", g: "109.196161,27.726271|14" }, { n: "遵义", g: "106.93126,27.699961|13" }, { n: "黔西南州", g: "104.900558,25.095148|11" }, { n: "黔东南州", g: "107.985353,26.583992|11" }, { n: "黔南州", g: "107.523205,26.264536|11" }] }, { n: "海南", g: "109.733755,19.180501|9", cities: [{ n: "海口", g: "110.330802,20.022071|13" }, { n: "白沙", g: "109.358586,19.216056|12" }, { n: "保亭", g: "109.656113,18.597592|12" }, { n: "昌江", g: "109.0113,19.222483|12" }, { n: "儋州", g: "109.413973,19.571153|13" }, { n: "澄迈", g: "109.996736,19.693135|13" }, { n: "东方", g: "108.85101,18.998161|13" }, { n: "定安", g: "110.32009,19.490991|13" }, { n: "琼海", g: "110.414359,19.21483|13" }, { n: "琼中", g: "109.861849,19.039771|12" }, { n: "乐东", g: "109.062698,18.658614|12" }, { n: "临高", g: "109.724101,19.805922|13" }, { n: "陵水", g: "109.948661,18.575985|12" }, { n: "三亚", g: "109.522771,18.257776|12" }, { n: "屯昌", g: "110.063364,19.347749|13" }, { n: "万宁", g: "110.292505,18.839886|13" }, { n: "文昌", g: "110.780909,19.750947|13" }, { n: "五指山", g: "109.51775,18.831306|13" }] }, { n: "河北", g: "115.661434,38.61384|7", cities: [{ n: "石家庄", g: "114.522082,38.048958|12" }, { n: "保定", g: "115.49481,38.886565|13" }, { n: "沧州", g: "116.863806,38.297615|13" }, { n: "承德", g: "117.933822,40.992521|14" }, { n: "邯郸", g: "114.482694,36.609308|13" }, { n: "衡水", g: "115.686229,37.746929|13" }, { n: "廊坊", g: "116.703602,39.518611|13" }, { n: "秦皇岛", g: "119.604368,39.945462|12" }, { n: "唐山", g: "118.183451,39.650531|13" }, { n: "邢台", g: "114.520487,37.069531|13" }, { n: "张家口", g: "114.893782,40.811188|13" }] }, { n: "河南", g: "113.486804,34.157184|7", cities: [{ n: "郑州", g: "113.649644,34.75661|12" }, { n: "安阳", g: "114.351807,36.110267|12" }, { n: "鹤壁", g: "114.29777,35.755426|13" }, { n: "焦作", g: "113.211836,35.234608|13" }, { n: "开封", g: "114.351642,34.801854|13" }, { n: "洛阳", g: "112.447525,34.657368|12" }, { n: "漯河", g: "114.046061,33.576279|13" }, { n: "南阳", g: "112.542842,33.01142|13" }, { n: "平顶山", g: "113.300849,33.745301|13" }, { n: "濮阳", g: "115.026627,35.753298|12" }, { n: "三门峡", g: "111.181262,34.78332|13" }, { n: "商丘", g: "115.641886,34.438589|13" }, { n: "新乡", g: "113.91269,35.307258|13" }, { n: "信阳", g: "114.085491,32.128582|13" }, { n: "许昌", g: "113.835312,34.02674|13" }, { n: "周口", g: "114.654102,33.623741|13" }, { n: "驻马店", g: "114.049154,32.983158|13" }] }, { n: "黑龙江", g: "128.047414,47.356592|6", cities: [{ n: "哈尔滨", g: "126.657717,45.773225|12" }, { n: "大庆", g: "125.02184,46.596709|12" }, { n: "大兴安岭地区", g: "124.196104,51.991789|10" }, { n: "鹤岗", g: "130.292472,47.338666|13" }, { n: "黑河", g: "127.50083,50.25069|14" }, { n: "鸡西", g: "130.941767,45.32154|13" }, { n: "佳木斯", g: "130.284735,46.81378|12" }, { n: "牡丹江", g: "129.608035,44.588521|13" }, { n: "七台河", g: "131.019048,45.775005|14" }, { n: "齐齐哈尔", g: "123.987289,47.3477|13" }, { n: "双鸭山", g: "131.171402,46.655102|13" }, { n: "绥化", g: "126.989095,46.646064|13" }, { n: "伊春", g: "128.910766,47.734685|14" }] }, { n: "湖北", g: "112.410562,31.209316|8", cities: [{ n: "武汉", g: "114.3162,30.581084|12" }, { n: "鄂州", g: "114.895594,30.384439|14" }, { n: "恩施", g: "109.517433,30.308978|14" }, { n: "黄冈", g: "114.906618,30.446109|14" }, { n: "黄石", g: "115.050683,30.216127|13" }, { n: "荆门", g: "112.21733,31.042611|13" }, { n: "荆州", g: "112.241866,30.332591|12" }, { n: "潜江", g: "112.768768,30.343116|13" }, { n: "神农架林区", g: "110.487231,31.595768|13" }, { n: "十堰", g: "110.801229,32.636994|13" }, { n: "随州", g: "113.379358,31.717858|13" }, { n: "天门", g: "113.12623,30.649047|13" }, { n: "仙桃", g: "113.387448,30.293966|13" }, { n: "咸宁", g: "114.300061,29.880657|13" }, { n: "襄阳", g: "112.176326,32.094934|12" }, { n: "孝感", g: "113.935734,30.927955|13" }, { n: "宜昌", g: "111.310981,30.732758|13" }] }, { n: "湖南", g: "111.720664,27.695864|7", cities: [{ n: "长沙", g: "112.979353,28.213478|12" }, { n: "常德", g: "111.653718,29.012149|12" }, { n: "郴州", g: "113.037704,25.782264|13" }, { n: "衡阳", g: "112.583819,26.898164|13" }, { n: "怀化", g: "109.986959,27.557483|13" }, { n: "娄底", g: "111.996396,27.741073|13" }, { n: "邵阳", g: "111.461525,27.236811|13" }, { n: "湘潭", g: "112.935556,27.835095|13" }, { n: "湘西州", g: "109.745746,28.317951|14" }, { n: "益阳", g: "112.366547,28.588088|13" }, { n: "永州", g: "111.614648,26.435972|13" }, { n: "岳阳", g: "113.146196,29.378007|13" }, { n: "张家界", g: "110.48162,29.124889|13" }, { n: "株洲", g: "113.131695,27.827433|13" }] }, { n: "江苏", g: "119.368489,33.013797|8", cities: [{ n: "南京", g: "118.778074,32.057236|12" }, { n: "常州", g: "119.981861,31.771397|12" }, { n: "淮安", g: "119.030186,33.606513|12" }, { n: "连云港", g: "119.173872,34.601549|12" }, { n: "南通", g: "120.873801,32.014665|12" }, { n: "苏州", g: "120.619907,31.317987|12" }, { n: "宿迁", g: "118.296893,33.95205|13" }, { n: "泰州", g: "119.919606,32.476053|13" }, { n: "无锡", g: "120.305456,31.570037|12" }, { n: "徐州", g: "117.188107,34.271553|12" }, { n: "盐城", g: "120.148872,33.379862|12" }, { n: "扬州", g: "119.427778,32.408505|13" }, { n: "镇江", g: "119.455835,32.204409|13" }] }, { n: "江西", g: "115.676082,27.757258|7", cities: [{ n: "南昌", g: "115.893528,28.689578|12" }, { n: "抚州", g: "116.360919,27.954545|13" }, { n: "赣州", g: "114.935909,25.845296|13" }, { n: "吉安", g: "114.992039,27.113848|13" }, { n: "景德镇", g: "117.186523,29.303563|12" }, { n: "九江", g: "115.999848,29.71964|13" }, { n: "萍乡", g: "113.859917,27.639544|13" }, { n: "上饶", g: "117.955464,28.457623|13" }, { n: "新余", g: "114.947117,27.822322|13" }, { n: "宜春", g: "114.400039,27.81113|13" }, { n: "鹰潭", g: "117.03545,28.24131|13" }] }, { n: "吉林", g: "126.262876,43.678846|7", cities: [{ n: "长春", g: "125.313642,43.898338|12" }, { n: "白城", g: "122.840777,45.621086|13" }, { n: "白山", g: "126.435798,41.945859|13" }, { n: "吉林市", g: "126.564544,43.871988|12" }, { n: "辽源", g: "125.133686,42.923303|13" }, { n: "四平", g: "124.391382,43.175525|12" }, { n: "松原", g: "124.832995,45.136049|13" }, { n: "通化", g: "125.94265,41.736397|13" }, { n: "延边", g: "129.485902,42.896414|13" }] }, { n: "辽宁", g: "122.753592,41.6216|8", cities: [{ n: "沈阳", g: "123.432791,41.808645|12" }, { n: "鞍山", g: "123.007763,41.118744|13" }, { n: "本溪", g: "123.778062,41.325838|12" }, { n: "朝阳", g: "120.446163,41.571828|13" }, { n: "大连", g: "121.593478,38.94871|12" }, { n: "丹东", g: "124.338543,40.129023|12" }, { n: "抚顺", g: "123.92982,41.877304|12" }, { n: "阜新", g: "121.660822,42.01925|14" }, { n: "葫芦岛", g: "120.860758,40.74303|13" }, { n: "锦州", g: "121.147749,41.130879|13" }, { n: "辽阳", g: "123.172451,41.273339|14" }, { n: "盘锦", g: "122.073228,41.141248|13" }, { n: "铁岭", g: "123.85485,42.299757|13" }, { n: "营口", g: "122.233391,40.668651|13" }] }, { n: "内蒙古", g: "114.415868,43.468238|5", cities: [{ n: "呼和浩特", g: "111.660351,40.828319|12" }, { n: "阿拉善盟", g: "105.695683,38.843075|14" }, { n: "包头", g: "109.846239,40.647119|12" }, { n: "巴彦淖尔", g: "107.423807,40.76918|12" }, { n: "赤峰", g: "118.930761,42.297112|12" }, { n: "鄂尔多斯", g: "109.993706,39.81649|12" }, { n: "呼伦贝尔", g: "119.760822,49.201636|12" }, { n: "通辽", g: "122.260363,43.633756|12" }, { n: "乌海", g: "106.831999,39.683177|13" }, { n: "乌兰察布", g: "113.112846,41.022363|12" }, { n: "锡林郭勒盟", g: "116.02734,43.939705|11" }, { n: "兴安盟", g: "122.048167,46.083757|11" }] }, { n: "宁夏", g: "106.155481,37.321323|8", cities: [{ n: "银川", g: "106.206479,38.502621|12" }, { n: "固原", g: "106.285268,36.021523|13" }, { n: "石嘴山", g: "106.379337,39.020223|13" }, { n: "吴忠", g: "106.208254,37.993561|14" }, { n: "中卫", g: "105.196754,37.521124|14" }] }, { n: "青海", g: "96.202544,35.499761|7", cities: [{ n: "西宁", g: "101.767921,36.640739|12" }, { n: "果洛州", g: "100.223723,34.480485|11" }, { n: "海东地区", g: "102.085207,36.51761|11" }, { n: "海北州", g: "100.879802,36.960654|11" }, { n: "海南州", g: "100.624066,36.284364|11" }, { n: "海西州", g: "97.342625,37.373799|11" }, { n: "黄南州", g: "102.0076,35.522852|11" }, { n: "玉树州", g: "97.013316,33.00624|14" }] }, { n: "山东", g: "118.527663,36.09929|8", cities: [{ n: "济南", g: "117.024967,36.682785|12" }, { n: "滨州", g: "117.968292,37.405314|12" }, { n: "东营", g: "118.583926,37.487121|12" }, { n: "德州", g: "116.328161,37.460826|12" }, { n: "菏泽", g: "115.46336,35.26244|13" }, { n: "济宁", g: "116.600798,35.402122|13" }, { n: "莱芜", g: "117.684667,36.233654|13" }, { n: "聊城", g: "115.986869,36.455829|12" }, { n: "临沂", g: "118.340768,35.072409|12" }, { n: "青岛", g: "120.384428,36.105215|12" }, { n: "日照", g: "119.50718,35.420225|12" }, { n: "泰安", g: "117.089415,36.188078|13" }, { n: "威海", g: "122.093958,37.528787|13" }, { n: "潍坊", g: "119.142634,36.716115|12" }, { n: "烟台", g: "121.309555,37.536562|12" }, { n: "枣庄", g: "117.279305,34.807883|13" }, { n: "淄博", g: "118.059134,36.804685|12" }] }, { n: "山西", g: "112.515496,37.866566|7", cities: [{ n: "太原", g: "112.550864,37.890277|12" }, { n: "长治", g: "113.120292,36.201664|12" }, { n: "大同", g: "113.290509,40.113744|12" }, { n: "晋城", g: "112.867333,35.499834|13" }, { n: "晋中", g: "112.738514,37.693362|13" }, { n: "临汾", g: "111.538788,36.099745|13" }, { n: "吕梁", g: "111.143157,37.527316|14" }, { n: "朔州", g: "112.479928,39.337672|13" }, { n: "忻州", g: "112.727939,38.461031|12" }, { n: "阳泉", g: "113.569238,37.869529|13" }, { n: "运城", g: "111.006854,35.038859|13" }] }, { n: "陕西", g: "109.503789,35.860026|7", cities: [{ n: "西安", g: "108.953098,34.2778|12" }, { n: "安康", g: "109.038045,32.70437|13" }, { n: "宝鸡", g: "107.170645,34.364081|12" }, { n: "汉中", g: "107.045478,33.081569|13" }, { n: "商洛", g: "109.934208,33.873907|13" }, { n: "铜川", g: "108.968067,34.908368|13" }, { n: "渭南", g: "109.483933,34.502358|13" }, { n: "咸阳", g: "108.707509,34.345373|13" }, { n: "延安", g: "109.50051,36.60332|13" }, { n: "榆林", g: "109.745926,38.279439|12" }] }, { n: "四川", g: "102.89916,30.367481|7", cities: [{ n: "成都", g: "104.067923,30.679943|12" }, { n: "阿坝州", g: "102.228565,31.905763|15" }, { n: "巴中", g: "106.757916,31.869189|14" }, { n: "达州", g: "107.494973,31.214199|14" }, { n: "德阳", g: "104.402398,31.13114|13" }, { n: "甘孜州", g: "101.969232,30.055144|15" }, { n: "广安", g: "106.63572,30.463984|13" }, { n: "广元", g: "105.819687,32.44104|13" }, { n: "乐山", g: "103.760824,29.600958|13" }, { n: "凉山州", g: "102.259591,27.892393|14" }, { n: "泸州", g: "105.44397,28.89593|14" }, { n: "南充", g: "106.105554,30.800965|13" }, { n: "眉山", g: "103.84143,30.061115|13" }, { n: "绵阳", g: "104.705519,31.504701|12" }, { n: "内江", g: "105.073056,29.599462|13" }, { n: "攀枝花", g: "101.722423,26.587571|14" }, { n: "遂宁", g: "105.564888,30.557491|12" }, { n: "雅安", g: "103.009356,29.999716|13" }, { n: "宜宾", g: "104.633019,28.769675|13" }, { n: "资阳", g: "104.63593,30.132191|13" }, { n: "自贡", g: "104.776071,29.359157|13" }] }, { n: "西藏", g: "89.137982,31.367315|6", cities: [{ n: "拉萨", g: "91.111891,29.662557|13" }, { n: "阿里地区", g: "81.107669,30.404557|11" }, { n: "昌都地区", g: "97.185582,31.140576|15" }, { n: "林芝地区", g: "94.349985,29.666941|11" }, { n: "那曲地区", g: "92.067018,31.48068|14" }, { n: "日喀则地区", g: "88.891486,29.269023|14" }, { n: "山南地区", g: "91.750644,29.229027|11" }] }, { n: "新疆", g: "85.614899,42.127001|6", cities: [{ n: "乌鲁木齐", g: "87.564988,43.84038|12" }, { n: "阿拉尔", g: "81.291737,40.61568|13" }, { n: "阿克苏地区", g: "80.269846,41.171731|12" }, { n: "阿勒泰地区", g: "88.137915,47.839744|13" }, { n: "巴音郭楞", g: "86.121688,41.771362|12" }, { n: "博尔塔拉州", g: "82.052436,44.913651|11" }, { n: "昌吉州", g: "87.296038,44.007058|13" }, { n: "哈密地区", g: "93.528355,42.858596|13" }, { n: "和田地区", g: "79.930239,37.116774|13" }, { n: "喀什地区", g: "75.992973,39.470627|12" }, { n: "克拉玛依", g: "84.88118,45.594331|13" }, { n: "克孜勒苏州", g: "76.137564,39.750346|11" }, { n: "石河子", g: "86.041865,44.308259|13" }, { n: "塔城地区", g: "82.974881,46.758684|12" }, { n: "图木舒克", g: "79.198155,39.889223|13" }, { n: "吐鲁番地区", g: "89.181595,42.96047|13" }, { n: "五家渠", g: "87.565449,44.368899|13" }, { n: "伊犁州", g: "81.297854,43.922248|11" }] }, { n: "云南", g: "101.592952,24.864213|7", cities: [{ n: "昆明", g: "102.714601,25.049153|12" }, { n: "保山", g: "99.177996,25.120489|13" }, { n: "楚雄州", g: "101.529382,25.066356|13" }, { n: "大理州", g: "100.223675,25.5969|14" }, { n: "德宏州", g: "98.589434,24.44124|14" }, { n: "迪庆州", g: "99.713682,27.831029|14" }, { n: "红河州", g: "103.384065,23.367718|11" }, { n: "丽江", g: "100.229628,26.875351|13" }, { n: "临沧", g: "100.092613,23.887806|14" }, { n: "怒江州", g: "98.859932,25.860677|14" }, { n: "普洱", g: "100.980058,22.788778|14" }, { n: "曲靖", g: "103.782539,25.520758|12" }, { n: "昭通", g: "103.725021,27.340633|13" }, { n: "文山", g: "104.089112,23.401781|14" }, { n: "西双版纳", g: "100.803038,22.009433|13" }, { n: "玉溪", g: "102.545068,24.370447|13" }] }, { n: "浙江", g: "119.957202,29.159494|8", cities: [{ n: "杭州", g: "120.219375,30.259244|12" }, { n: "湖州", g: "120.137243,30.877925|12" }, { n: "嘉兴", g: "120.760428,30.773992|13" }, { n: "金华", g: "119.652576,29.102899|12" }, { n: "丽水", g: "119.929576,28.4563|13" }, { n: "宁波", g: "121.579006,29.885259|12" }, { n: "衢州", g: "118.875842,28.95691|12" }, { n: "绍兴", g: "120.592467,30.002365|13" }, { n: "台州", g: "121.440613,28.668283|13" }, { n: "温州", g: "120.690635,28.002838|12" }, { n: "舟山", g: "122.169872,30.03601|13" }] }], other: [{ n: "香港", g: "114.186124,22.293586|11" }, { n: "澳门", g: "113.557519,22.204118|13" }, { n: "台湾", g: "120.961454,23.80406|8" }] };

function getCenter(g) {
    var item = g.split("|");
    item[0] = item[0].split(",");
    return {
        lng: parseFloat(item[0][0]),
        lat: parseFloat(item[0][1])
    };
}

var cityCenter = {
    getCenterByCityName: function getCenterByCityName(name) {
        for (var i = 0; i < citycenter.municipalities.length; i++) {
            if (citycenter.municipalities[i].n == name) {
                return getCenter(citycenter.municipalities[i].g);
            }
        }

        var provinces = citycenter.provinces;
        for (var i = 0; i < provinces.length; i++) {
            if (provinces[i].n == name) {
                return getCenter(provinces[i].g);
            }
            var cities = provinces[i].cities;
            for (var j = 0; j < cities.length; j++) {
                if (cities[j].n == name) {
                    return getCenter(cities[j].g);
                }
            }
        }
        return null;
    }
};

/**
  * 根据弧线的坐标节点数组
  */
function getCurvePoints(points) {
  var curvePoints = [];
  for (var i = 0; i < points.length - 1; i++) {
    var p = getCurveByTwoPoints(points[i], points[i + 1]);
    if (p && p.length > 0) {
      curvePoints = curvePoints.concat(p);
    }
  }
  return curvePoints;
}

/**
 * 根据两点获取曲线坐标点数组
 * @param Point 起点
 * @param Point 终点
 */
function getCurveByTwoPoints(obj1, obj2) {
  if (!obj1 || !obj2) {
    return null;
  }

  var B1 = function B1(x) {
    return 1 - 2 * x + x * x;
  };
  var B2 = function B2(x) {
    return 2 * x - 2 * x * x;
  };
  var B3 = function B3(x) {
    return x * x;
  };

  var curveCoordinates = [];

  var count = 40; // 曲线是由一些小的线段组成的，这个表示这个曲线所有到的折线的个数
  var isFuture = false;
  var t, h, h2, lat3, lng3, j, t2;
  var LnArray = [];
  var i = 0;
  var inc = 0;

  if (typeof obj2 == "undefined") {
    if (typeof curveCoordinates != "undefined") {
      curveCoordinates = [];
    }
    return;
  }

  var lat1 = parseFloat(obj1.lat);
  var lat2 = parseFloat(obj2.lat);
  var lng1 = parseFloat(obj1.lng);
  var lng2 = parseFloat(obj2.lng);

  // 计算曲线角度的方法
  if (lng2 > lng1) {
    if (parseFloat(lng2 - lng1) > 180) {
      if (lng1 < 0) {
        lng1 = parseFloat(180 + 180 + lng1);
      }
    }
  }

  if (lng1 > lng2) {
    if (parseFloat(lng1 - lng2) > 180) {
      if (lng2 < 0) {
        lng2 = parseFloat(180 + 180 + lng2);
      }
    }
  }
  j = 0;
  t2 = 0;
  if (lat2 == lat1) {
    t = 0;
    h = lng1 - lng2;
  } else if (lng2 == lng1) {
    t = Math.PI / 2;
    h = lat1 - lat2;
  } else {
    t = Math.atan((lat2 - lat1) / (lng2 - lng1));
    h = (lat2 - lat1) / Math.sin(t);
  }
  if (t2 == 0) {
    t2 = t + Math.PI / 5;
  }
  h2 = h / 2;
  lng3 = h2 * Math.cos(t2) + lng1;
  lat3 = h2 * Math.sin(t2) + lat1;

  for (i = 0; i < count + 1; i++) {
    curveCoordinates.push([lng1 * B1(inc) + lng3 * B2(inc) + lng2 * B3(inc), lat1 * B1(inc) + lat3 * B2(inc) + lat2 * B3(inc)]);
    inc = inc + 1 / count;
  }
  return curveCoordinates;
}

var curve = {
  getPoints: getCurvePoints
};

/* 
FDEB algorithm implementation [www.win.tue.nl/~dholten/papers/forcebundles_eurovis.pdf].

Author:  (github.com/upphiminn)
2013

*/

var ForceEdgeBundling = function ForceEdgeBundling() {
    var data_nodes = {},
        // {'nodeid':{'x':,'y':},..}
    data_edges = [],
        // [{'source':'nodeid1', 'target':'nodeid2'},..]
    compatibility_list_for_edge = [],
        subdivision_points_for_edge = [],
        K = 0.1,
        // global bundling constant controling edge stiffness
    S_initial = 0.1,
        // init. distance to move points
    P_initial = 1,
        // init. subdivision number
    P_rate = 2,
        // subdivision rate increase
    C = 6,
        // number of cycles to perform
    I_initial = 70,
        // init. number of iterations for cycle
    I_rate = 0.6666667,
        // rate at which iteration number decreases i.e. 2/3
    compatibility_threshold = 0.6,
        invers_quadratic_mode = false,
        eps = 1e-8;

    /*** Geometry Helper Methods ***/
    function vector_dot_product(p, q) {
        return p.x * q.x + p.y * q.y;
    }

    function edge_as_vector(P) {
        return { 'x': data_nodes[P.target].x - data_nodes[P.source].x,
            'y': data_nodes[P.target].y - data_nodes[P.source].y };
    }

    function edge_length(e) {
        return Math.sqrt(Math.pow(data_nodes[e.source].x - data_nodes[e.target].x, 2) + Math.pow(data_nodes[e.source].y - data_nodes[e.target].y, 2));
    }

    function custom_edge_length(e) {
        return Math.sqrt(Math.pow(e.source.x - e.target.x, 2) + Math.pow(e.source.y - e.target.y, 2));
    }

    function edge_midpoint(e) {
        var middle_x = (data_nodes[e.source].x + data_nodes[e.target].x) / 2.0;
        var middle_y = (data_nodes[e.source].y + data_nodes[e.target].y) / 2.0;
        return { 'x': middle_x, 'y': middle_y };
    }

    function compute_divided_edge_length(e_idx) {
        var length = 0;
        for (var i = 1; i < subdivision_points_for_edge[e_idx].length; i++) {
            var segment_length = euclidean_distance(subdivision_points_for_edge[e_idx][i], subdivision_points_for_edge[e_idx][i - 1]);
            length += segment_length;
        }
        return length;
    }

    function euclidean_distance(p, q) {
        return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
    }

    function project_point_on_line(p, Q) {
        var L = Math.sqrt((Q.target.x - Q.source.x) * (Q.target.x - Q.source.x) + (Q.target.y - Q.source.y) * (Q.target.y - Q.source.y));
        var r = ((Q.source.y - p.y) * (Q.source.y - Q.target.y) - (Q.source.x - p.x) * (Q.target.x - Q.source.x)) / (L * L);

        return { 'x': Q.source.x + r * (Q.target.x - Q.source.x), 'y': Q.source.y + r * (Q.target.y - Q.source.y) };
    }

    /*** ********************** ***/

    /*** Initialization Methods ***/
    function initialize_edge_subdivisions() {
        for (var i = 0; i < data_edges.length; i++) {
            if (P_initial == 1) subdivision_points_for_edge[i] = []; //0 subdivisions
            else {
                    subdivision_points_for_edge[i] = [];
                    subdivision_points_for_edge[i].push(data_nodes[data_edges[i].source]);
                    subdivision_points_for_edge[i].push(data_nodes[data_edges[i].target]);
                }
        }
    }

    function initialize_compatibility_lists() {
        for (var i = 0; i < data_edges.length; i++) {
            compatibility_list_for_edge[i] = [];
        } //0 compatible edges.
    }

    function filter_self_loops(edgelist) {
        var filtered_edge_list = [];
        for (var e = 0; e < edgelist.length; e++) {
            if (data_nodes[edgelist[e].source].x != data_nodes[edgelist[e].target].x && data_nodes[edgelist[e].source].y != data_nodes[edgelist[e].target].y) {
                //or smaller than eps
                filtered_edge_list.push(edgelist[e]);
            }
        }

        return filtered_edge_list;
    }
    /*** ********************** ***/

    /*** Force Calculation Methods ***/
    function apply_spring_force(e_idx, i, kP) {

        var prev = subdivision_points_for_edge[e_idx][i - 1];
        var next = subdivision_points_for_edge[e_idx][i + 1];
        var crnt = subdivision_points_for_edge[e_idx][i];

        var x = prev.x - crnt.x + next.x - crnt.x;
        var y = prev.y - crnt.y + next.y - crnt.y;

        x *= kP;
        y *= kP;

        return { 'x': x, 'y': y };
    }

    function apply_electrostatic_force(e_idx, i, S) {
        var sum_of_forces = { 'x': 0, 'y': 0 };
        var compatible_edges_list = compatibility_list_for_edge[e_idx];

        for (var oe = 0; oe < compatible_edges_list.length; oe++) {
            var force = { 'x': subdivision_points_for_edge[compatible_edges_list[oe]][i].x - subdivision_points_for_edge[e_idx][i].x,
                'y': subdivision_points_for_edge[compatible_edges_list[oe]][i].y - subdivision_points_for_edge[e_idx][i].y };

            if (Math.abs(force.x) > eps || Math.abs(force.y) > eps) {

                var diff = 1 / Math.pow(custom_edge_length({ 'source': subdivision_points_for_edge[compatible_edges_list[oe]][i],
                    'target': subdivision_points_for_edge[e_idx][i] }), 1);

                sum_of_forces.x += force.x * diff;
                sum_of_forces.y += force.y * diff;
            }
        }
        return sum_of_forces;
    }

    function apply_resulting_forces_on_subdivision_points(e_idx, P, S) {
        var kP = K / (edge_length(data_edges[e_idx]) * (P + 1)); // kP=K/|P|(number of segments), where |P| is the initial length of edge P.
        // (length * (num of sub division pts - 1))
        var resulting_forces_for_subdivision_points = [{ 'x': 0, 'y': 0 }];
        for (var i = 1; i < P + 1; i++) {
            // exclude initial end points of the edge 0 and P+1
            var resulting_force = { 'x': 0, 'y': 0 };

            var spring_force = apply_spring_force(e_idx, i, kP);
            var electrostatic_force = apply_electrostatic_force(e_idx, i, S);

            resulting_force.x = S * (spring_force.x + electrostatic_force.x);
            resulting_force.y = S * (spring_force.y + electrostatic_force.y);

            resulting_forces_for_subdivision_points.push(resulting_force);
        }
        resulting_forces_for_subdivision_points.push({ 'x': 0, 'y': 0 });
        return resulting_forces_for_subdivision_points;
    }
    /*** ********************** ***/

    /*** Edge Division Calculation Methods ***/
    function update_edge_divisions(P) {
        for (var e_idx = 0; e_idx < data_edges.length; e_idx++) {

            if (P == 1) {
                subdivision_points_for_edge[e_idx].push(data_nodes[data_edges[e_idx].source]); // source
                subdivision_points_for_edge[e_idx].push(edge_midpoint(data_edges[e_idx])); // mid point
                subdivision_points_for_edge[e_idx].push(data_nodes[data_edges[e_idx].target]); // target
            } else {

                var divided_edge_length = compute_divided_edge_length(e_idx);
                var segment_length = divided_edge_length / (P + 1);
                var current_segment_length = segment_length;
                var new_subdivision_points = [];
                new_subdivision_points.push(data_nodes[data_edges[e_idx].source]); //source

                for (var i = 1; i < subdivision_points_for_edge[e_idx].length; i++) {
                    var old_segment_length = euclidean_distance(subdivision_points_for_edge[e_idx][i], subdivision_points_for_edge[e_idx][i - 1]);

                    while (old_segment_length > current_segment_length) {
                        var percent_position = current_segment_length / old_segment_length;
                        var new_subdivision_point_x = subdivision_points_for_edge[e_idx][i - 1].x;
                        var new_subdivision_point_y = subdivision_points_for_edge[e_idx][i - 1].y;

                        new_subdivision_point_x += percent_position * (subdivision_points_for_edge[e_idx][i].x - subdivision_points_for_edge[e_idx][i - 1].x);
                        new_subdivision_point_y += percent_position * (subdivision_points_for_edge[e_idx][i].y - subdivision_points_for_edge[e_idx][i - 1].y);
                        new_subdivision_points.push({ 'x': new_subdivision_point_x,
                            'y': new_subdivision_point_y });

                        old_segment_length -= current_segment_length;
                        current_segment_length = segment_length;
                    }
                    current_segment_length -= old_segment_length;
                }
                new_subdivision_points.push(data_nodes[data_edges[e_idx].target]); //target
                subdivision_points_for_edge[e_idx] = new_subdivision_points;
            }
        }
    }
    /*** ********************** ***/

    /*** Edge compatibility measures ***/
    function angle_compatibility(P, Q) {
        var result = Math.abs(vector_dot_product(edge_as_vector(P), edge_as_vector(Q)) / (edge_length(P) * edge_length(Q)));
        return result;
    }

    function scale_compatibility(P, Q) {
        var lavg = (edge_length(P) + edge_length(Q)) / 2.0;
        var result = 2.0 / (lavg / Math.min(edge_length(P), edge_length(Q)) + Math.max(edge_length(P), edge_length(Q)) / lavg);
        return result;
    }

    function position_compatibility(P, Q) {
        var lavg = (edge_length(P) + edge_length(Q)) / 2.0;
        var midP = { 'x': (data_nodes[P.source].x + data_nodes[P.target].x) / 2.0,
            'y': (data_nodes[P.source].y + data_nodes[P.target].y) / 2.0 };
        var midQ = { 'x': (data_nodes[Q.source].x + data_nodes[Q.target].x) / 2.0,
            'y': (data_nodes[Q.source].y + data_nodes[Q.target].y) / 2.0 };
        var result = lavg / (lavg + euclidean_distance(midP, midQ));
        return result;
    }

    function edge_visibility(P, Q) {
        var I0 = project_point_on_line(data_nodes[Q.source], { 'source': data_nodes[P.source],
            'target': data_nodes[P.target] });
        var I1 = project_point_on_line(data_nodes[Q.target], { 'source': data_nodes[P.source],
            'target': data_nodes[P.target] }); //send acutal edge points positions
        var midI = { 'x': (I0.x + I1.x) / 2.0,
            'y': (I0.y + I1.y) / 2.0 };
        var midP = { 'x': (data_nodes[P.source].x + data_nodes[P.target].x) / 2.0,
            'y': (data_nodes[P.source].y + data_nodes[P.target].y) / 2.0 };
        var result = Math.max(0, 1 - 2 * euclidean_distance(midP, midI) / euclidean_distance(I0, I1));
        return result;
    }

    function visibility_compatibility(P, Q) {
        return Math.min(edge_visibility(P, Q), edge_visibility(Q, P));
    }

    function compatibility_score(P, Q) {
        var result = angle_compatibility(P, Q) * scale_compatibility(P, Q) * position_compatibility(P, Q) * visibility_compatibility(P, Q);

        return result;
    }

    function are_compatible(P, Q) {
        // console.log('compatibility ' + P.source +' - '+ P.target + ' and ' + Q.source +' '+ Q.target);
        return compatibility_score(P, Q) >= compatibility_threshold;
    }

    function compute_compatibility_lists() {
        for (var e = 0; e < data_edges.length - 1; e++) {
            for (var oe = e + 1; oe < data_edges.length; oe++) {
                // don't want any duplicates
                if (e == oe) continue;else {
                    if (are_compatible(data_edges[e], data_edges[oe])) {
                        compatibility_list_for_edge[e].push(oe);
                        compatibility_list_for_edge[oe].push(e);
                    }
                }
            }
        }
    }

    /*** ************************ ***/

    /*** Main Bundling Loop Methods ***/
    var forcebundle = function forcebundle() {
        var S = S_initial;
        var I = I_initial;
        var P = P_initial;

        initialize_edge_subdivisions();
        initialize_compatibility_lists();
        update_edge_divisions(P);
        compute_compatibility_lists();
        for (var cycle = 0; cycle < C; cycle++) {
            for (var iteration = 0; iteration < I; iteration++) {
                var forces = [];
                for (var edge = 0; edge < data_edges.length; edge++) {
                    forces[edge] = apply_resulting_forces_on_subdivision_points(edge, P, S);
                }
                for (var e = 0; e < data_edges.length; e++) {
                    for (var i = 0; i < P + 1; i++) {
                        subdivision_points_for_edge[e][i].x += forces[e][i].x;
                        subdivision_points_for_edge[e][i].y += forces[e][i].y;
                    }
                }
            }
            //prepare for next cycle
            S = S / 2;
            P = P * 2;
            I = I_rate * I;

            update_edge_divisions(P);
            // console.log('C' + cycle);
            // console.log('P' + P);
            // console.log('S' + S);
        }
        return subdivision_points_for_edge;
    };
    /*** ************************ ***/

    /*** Getters/Setters Methods ***/
    forcebundle.nodes = function (nl) {
        if (arguments.length == 0) {
            return data_nodes;
        } else {
            data_nodes = nl;
        }
        return forcebundle;
    };

    forcebundle.edges = function (ll) {
        if (arguments.length == 0) {
            return data_edges;
        } else {
            data_edges = filter_self_loops(ll); //remove edges to from to the same point
        }
        return forcebundle;
    };

    forcebundle.bundling_stiffness = function (k) {
        if (arguments.length == 0) {
            return K;
        } else {
            K = k;
        }
        return forcebundle;
    };

    forcebundle.step_size = function (step) {
        if (arguments.length == 0) {
            return S_initial;
        } else {
            S_initial = step;
        }
        return forcebundle;
    };

    forcebundle.cycles = function (c) {
        if (arguments.length == 0) {
            return C;
        } else {
            C = c;
        }
        return forcebundle;
    };

    forcebundle.iterations = function (i) {
        if (arguments.length == 0) {
            return I_initial;
        } else {
            I_initial = i;
        }
        return forcebundle;
    };

    forcebundle.iterations_rate = function (i) {
        if (arguments.length == 0) {
            return I_rate;
        } else {
            I_rate = i;
        }
        return forcebundle;
    };

    forcebundle.subdivision_points_seed = function (p) {
        if (arguments.length == 0) {
            return P;
        } else {
            P = p;
        }
        return forcebundle;
    };

    forcebundle.subdivision_rate = function (r) {
        if (arguments.length == 0) {
            return P_rate;
        } else {
            P_rate = r;
        }
        return forcebundle;
    };

    forcebundle.compatbility_threshold = function (t) {
        if (arguments.length == 0) {
            return compatbility_threshold;
        } else {
            compatibility_threshold = t;
        }
        return forcebundle;
    };

    /*** ************************ ***/

    return forcebundle;
};

/**
 * @author kyle / http://nikai.us/
 */

/**
 * Category
 * @param {Object} splitList:
 *   { 
 *       other: 1,
 *       1: 2,
 *       2: 3,
 *       3: 4,
 *       4: 5,
 *       5: 6,
 *       6: 7
 *   }
 */
function Category(splitList) {
    this.splitList = splitList || {
        other: 1
    };
}

Category.prototype.get = function (count) {

    var splitList = this.splitList;

    var value = splitList['other'];

    for (var i in splitList) {
        if (count == i) {
            value = splitList[i];
            break;
        }
    }

    return value;
};

/**
 * 根据DataSet自动生成对应的splitList
 */
Category.prototype.generateByDataSet = function (dataSet) {
    var colors = ['rgba(255, 255, 0, 0.8)', 'rgba(253, 98, 104, 0.8)', 'rgba(255, 146, 149, 0.8)', 'rgba(255, 241, 193, 0.8)', 'rgba(110, 176, 253, 0.8)', 'rgba(52, 139, 251, 0.8)', 'rgba(17, 102, 252, 0.8)'];
    var data = dataSet.get();
    this.splitList = {};
    var count = 0;
    for (var i = 0; i < data.length; i++) {
        if (this.splitList[data[i].count] === undefined) {
            this.splitList[data[i].count] = colors[count];
            count++;
        }
        if (count >= colors.length - 1) {
            break;
        }
    }

    this.splitList['other'] = colors[colors.length - 1];
};

/**
 * @author kyle / http://nikai.us/
 */

/**
 * Choropleth
 * @param {Object} splitList:
 *       [
 *           {
 *               start: 0,
 *               end: 2,
 *               value: randomColor()
 *           },{
 *               start: 2,
 *               end: 4,
 *               value: randomColor()
 *           },{
 *               start: 4,
 *               value: randomColor()
 *           }
 *       ];
 *
 */
function Choropleth(splitList) {
    this.splitList = splitList || [{
        start: 0,
        value: 'red'
    }];
}

Choropleth.prototype.get = function (count) {
    var splitList = this.splitList;

    var value = false;

    for (var i = 0; i < splitList.length; i++) {
        if ((splitList[i].start === undefined || splitList[i].start !== undefined && count >= splitList[i].start) && (splitList[i].end === undefined || splitList[i].end !== undefined && count < splitList[i].end)) {
            value = splitList[i].value;
            break;
        }
    }

    return value;
};

/**
 * 根据DataSet自动生成对应的splitList
 */
Choropleth.prototype.generateByDataSet = function (dataSet) {

    var min = dataSet.getMin('count');
    var max = dataSet.getMax('count');

    this.generateByMinMax(min, max);
};

/**
 * 根据DataSet自动生成对应的splitList
 */
Choropleth.prototype.generateByMinMax = function (min, max) {
    var colors = ['rgba(255, 255, 0, 0.8)', 'rgba(253, 98, 104, 0.8)', 'rgba(255, 146, 149, 0.8)', 'rgba(255, 241, 193, 0.8)', 'rgba(110, 176, 253, 0.8)', 'rgba(52, 139, 251, 0.8)', 'rgba(17, 102, 252, 0.8)'];
    var splitNum = (max - min) / 7;
    var index = min;
    this.splitList = [];
    var count = 0;
    while (index < max) {
        this.splitList.push({
            start: index,
            end: index + splitNum,
            value: colors[count]
        });
        count++;
        index += splitNum;
    }
};

/**
 * Timer
 * @author kyle / http://nikai.us/
 */

var Timer = function () {
    function Timer(callback, options) {
        classCallCheck(this, Timer);

        this._call = callback;
        this._runing = false;
        this.start();
    }

    createClass(Timer, [{
        key: "start",
        value: function start() {
            this._runing = true;
            requestAnimationFrame(this._launch.bind(this));
        }
    }, {
        key: "stop",
        value: function stop() {
            this._runing = false;
        }
    }, {
        key: "_launch",
        value: function _launch(timestamp) {
            if (this._runing) {
                this._call && this._call(timestamp);
                requestAnimationFrame(this._launch.bind(this));
            }
        }
    }]);
    return Timer;
}();

/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

var TWEEN = TWEEN || function () {

	var _tweens = [];

	return {

		getAll: function getAll() {

			return _tweens;
		},

		removeAll: function removeAll() {

			_tweens = [];
		},

		add: function add(tween) {

			_tweens.push(tween);
		},

		remove: function remove(tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}
		},

		update: function update(time, preserve) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : TWEEN.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time) || preserve) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}
			}

			return true;
		}
	};
}();

// Include a performance.now polyfill
(function () {
	// In a browser, use window.performance.now if it is available.
	if (typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined) {

		// This must be bound, because directly assigning this function
		// leads to an invocation exception in Chrome.
		TWEEN.now = window.performance.now.bind(window.performance);
	}
	// Use Date.now if it is available.
	else if (Date.now !== undefined) {
			TWEEN.now = Date.now;
		}
		// Otherwise, use 'new Date().getTime()'.
		else {
				TWEEN.now = function () {
					return new Date().getTime();
				};
			}
})();

TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for (var field in object) {
		_valuesStart[field] = parseFloat(object[field], 10);
	}

	this.to = function (properties, duration) {

		if (duration !== undefined) {
			_duration = duration;
		}

		_valuesEnd = properties;

		return this;
	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : TWEEN.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);
			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			_valuesStart[property] = _object[property];

			if (_valuesStart[property] instanceof Array === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;
		}

		return this;
	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object);
		}

		this.stopChainedTweens();
		return this;
	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}
	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;
	};

	this.repeat = function (times) {

		_repeat = times;
		return this;
	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;
	};

	this.easing = function (easing) {

		_easingFunction = easing;
		return this;
	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;
	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;
	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;
	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;
	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;
	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;
	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object);
			}

			_onStartCallbackFired = true;
		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);
			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof end === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end, 10);
					} else {
						end = parseFloat(end, 10);
					}
				}

				// Protect against non numeric properties.
				if (typeof end === 'number') {
					_object[property] = start + (end - start) * value;
				}
			}
		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof _valuesEnd[property] === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];
				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;
			} else {

				if (_onCompleteCallback !== null) {
					_onCompleteCallback.call(_object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;
			}
		}

		return true;
	};
};

TWEEN.Easing = {

	Linear: {

		None: function None(k) {

			return k;
		}

	},

	Quadratic: {

		In: function In(k) {

			return k * k;
		},

		Out: function Out(k) {

			return k * (2 - k);
		},

		InOut: function InOut(k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return -0.5 * (--k * (k - 2) - 1);
		}

	},

	Cubic: {

		In: function In(k) {

			return k * k * k;
		},

		Out: function Out(k) {

			return --k * k * k + 1;
		},

		InOut: function InOut(k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);
		}

	},

	Quartic: {

		In: function In(k) {

			return k * k * k * k;
		},

		Out: function Out(k) {

			return 1 - --k * k * k * k;
		},

		InOut: function InOut(k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return -0.5 * ((k -= 2) * k * k * k - 2);
		}

	},

	Quintic: {

		In: function In(k) {

			return k * k * k * k * k;
		},

		Out: function Out(k) {

			return --k * k * k * k * k + 1;
		},

		InOut: function InOut(k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);
		}

	},

	Sinusoidal: {

		In: function In(k) {

			return 1 - Math.cos(k * Math.PI / 2);
		},

		Out: function Out(k) {

			return Math.sin(k * Math.PI / 2);
		},

		InOut: function InOut(k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));
		}

	},

	Exponential: {

		In: function In(k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);
		},

		Out: function Out(k) {

			return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
		},

		InOut: function InOut(k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
		}

	},

	Circular: {

		In: function In(k) {

			return 1 - Math.sqrt(1 - k * k);
		},

		Out: function Out(k) {

			return Math.sqrt(1 - --k * k);
		},

		InOut: function InOut(k) {

			if ((k *= 2) < 1) {
				return -0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
		}

	},

	Elastic: {

		In: function In(k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
		},

		Out: function Out(k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;
		},

		InOut: function InOut(k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;
		}

	},

	Back: {

		In: function In(k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);
		},

		Out: function Out(k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;
		},

		InOut: function InOut(k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
		}

	},

	Bounce: {

		In: function In(k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);
		},

		Out: function Out(k) {

			if (k < 1 / 2.75) {
				return 7.5625 * k * k;
			} else if (k < 2 / 2.75) {
				return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
			} else if (k < 2.5 / 2.75) {
				return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
			} else {
				return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
			}
		},

		InOut: function InOut(k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;
		}

	}

};

TWEEN.Interpolation = {

	Linear: function Linear(v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);
	},

	Bezier: function Bezier(v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;
	},

	CatmullRom: function CatmullRom(v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);
		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);
		}
	},

	Utils: {

		Linear: function Linear(p0, p1, t) {

			return (p1 - p0) * t + p0;
		},

		Bernstein: function Bernstein(n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);
		},

		Factorial: function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;
			};
		}(),

		CatmullRom: function CatmullRom(p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
		}

	}

};

/**
 * Abstract handler for animator steps
 */

var global$1 = typeof window === 'undefined' ? {} : window;

var requestAnimationFrame$1 = global$1.requestAnimationFrame || global$1.mozRequestAnimationFrame || global$1.webkitRequestAnimationFrame || global$1.msRequestAnimationFrame || function (callback) {
    return global$1.setTimeout(callback, 1000 / 60);
};

var cancelAnimationFrame = global$1.cancelAnimationFrame || global$1.mozCancelAnimationFrame || global$1.webkitCancelAnimationFrame || global$1.msCancelAnimationFrame || function (id) {
    clearTimeout(id);
};

/**
 * options:
 *    duration in seconds
 *    delay in seconds
 */
function Animator(callback, options) {

    this.running = false;
    this.callback = callback;

    this.setOptions(options);

    this._tick = this._tick.bind(this);
}

Animator.prototype = {

    setOptions: function setOptions(options) {
        this.options = options;
        options.stepsRange = options.stepsRange || {
            start: 0,
            end: 100
        };

        this.duration = options.duration || 10; // 单位秒

        this.stepsRange = options.stepsRange;
        this._add = (this.stepsRange.end - this.stepsRange.start) / (this.duration * 60);
        this._time = this.stepsRange.start;
    },

    start: function start() {

        this.running = true;
        requestAnimationFrame$1(this._tick);
        this.options.onStart && this.options.onStart();
    },

    _tick: function _tick() {
        this._time += this._add;
        if (this._time > this.stepsRange.end) {
            this._time = this.stepsRange.start;
        }
        this.callback && this.callback(this._time);
        if (this.running) {
            requestAnimationFrame$1(this._tick);
        }
    },

    isRunning: function isRunning() {
        return this.running;
    },

    stop: function stop() {
        this.pause();
        this._time = this.stepsRange.start;
        this.options.onStop && this.options.onStop();
    },

    toggle: function toggle() {
        if (this.running) {
            this.pause();
        } else {
            this.start();
        }
    },

    pause: function pause() {
        this.running = false;
        cancelAnimationFrame(this._tick);
        this.options.onPause && this.options.onPause();
    }

};

/**
 * @author Mofei<http://www.zhuwenlong.com>
 */

var MapHelper = function () {
    function MapHelper(id, type, opt) {
        classCallCheck(this, MapHelper);

        if (!id || !type) {
            console.warn('id 和 type 为必填项');
            return false;
        }

        if (type == 'baidu') {
            if (!BMap) {
                console.warn('请先引入百度地图JS API');
                return false;
            }
        } else {
            console.warn('暂不支持你的地图类型');
        }
        this.type = type;
        var center = opt && opt.center ? opt.center : [106.962497, 38.208726];
        var zoom = opt && opt.zoom ? opt.zoom : 5;
        var map = this.map = new BMap.Map(id, {
            enableMapClick: false
        });
        map.centerAndZoom(new BMap.Point(center[0], center[1]), zoom);
        map.enableScrollWheelZoom(true);

        map.setMapStyle({
            style: 'light'
        });
    }

    createClass(MapHelper, [{
        key: 'addLayer',
        value: function addLayer(datas, options) {
            if (this.type == 'baidu') {
                return new mapv.baiduMapLayer(this.map, dataSet, options);
            }
        }
    }, {
        key: 'getMap',
        value: function getMap() {
            return this.map;
        }
    }]);
    return MapHelper;
}();

// function MapHelper(dom, type, opt) {
//     var map = new BMap.Map(dom, {
//         enableMapClick: false
//     });
//     map.centerAndZoom(new BMap.Point(106.962497, 38.208726), 5);
//     map.enableScrollWheelZoom(true);

//     map.setMapStyle({
//         style: 'light'
//     });
// }

/**
 * 一直覆盖在当前地图视野的Canvas对象
 *
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 *
 * @param 
 * {
 *     map 地图实例对象
 * }
 */

function CanvasLayer(options) {
    this.options = options || {};
    this.paneName = this.options.paneName || 'mapPane';
    this.context = this.options.context || '2d';
    this.zIndex = this.options.zIndex || 0;
    this.mixBlendMode = this.options.mixBlendMode || null;
    this.enableMassClear = this.options.enableMassClear;
    this._map = options.map;
    this._lastDrawTime = null;
    this.show();
}

var global$2 = typeof window === 'undefined' ? {} : window;

if (global$2.BMap) {

    CanvasLayer.prototype = new BMap.Overlay();

    CanvasLayer.prototype.initialize = function (map) {
        this._map = map;
        var canvas = this.canvas = document.createElement("canvas");
        canvas.style.cssText = "position:absolute;" + "left:0;" + "top:0;" + "z-index:" + this.zIndex + ";user-select:none;";
        canvas.style.mixBlendMode = this.mixBlendMode;
        this.adjustSize();
        map.getPanes()[this.paneName].appendChild(canvas);
        var that = this;
        map.addEventListener('resize', function () {
            that.adjustSize();
            that._draw();
        });
        return this.canvas;
    };

    CanvasLayer.prototype.adjustSize = function () {
        var size = this._map.getSize();
        var canvas = this.canvas;

        var devicePixelRatio = this.devicePixelRatio = global$2.devicePixelRatio;

        canvas.width = size.width * devicePixelRatio;
        canvas.height = size.height * devicePixelRatio;
        if (this.context == '2d') {
            canvas.getContext(this.context).scale(devicePixelRatio, devicePixelRatio);
        }

        canvas.style.width = size.width + "px";
        canvas.style.height = size.height + "px";
    };

    CanvasLayer.prototype.draw = function () {
        var self = this;
        clearTimeout(self.timeoutID);
        self.timeoutID = setTimeout(function () {
            self._draw();
        }, 15);
    };

    CanvasLayer.prototype._draw = function () {
        var map = this._map;
        var size = map.getSize();
        var center = map.getCenter();
        if (center) {
            var pixel = map.pointToOverlayPixel(center);
            this.canvas.style.left = pixel.x - size.width / 2 + 'px';
            this.canvas.style.top = pixel.y - size.height / 2 + 'px';
            this.dispatchEvent('draw');
            this.options.update && this.options.update.call(this);
        }
    };

    CanvasLayer.prototype.getContainer = function () {
        return this.canvas;
    };

    CanvasLayer.prototype.show = function () {
        if (!this.canvas) {
            this._map.addOverlay(this);
        }
        this.canvas.style.display = "block";
    };

    CanvasLayer.prototype.hide = function () {
        this.canvas.style.display = "none";
        //this._map.removeOverlay(this);
    };

    CanvasLayer.prototype.setZIndex = function (zIndex) {
        this.canvas.style.zIndex = zIndex;
    };

    CanvasLayer.prototype.getZIndex = function () {
        return this.zIndex;
    };
}

/**
 * @author Mofei Zhu<mapv@zhuwenlong.com>
 * This file is to draw text
 */

var drawText = {
    draw: function draw(context, dataSet, options) {
        var data = dataSet.get();
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // set from options
        for (var key in options) {
            context[key] = options[key];
        }

        var offset = options.offset || {
            x: 0,
            y: 0
        };

        var textKey = options.textKey || 'text';

        for (var i = 0, len = data.length; i < len; i++) {
            var coordinates = data[i].geometry._coordinates || data[i].geometry.coordinates;
            context.fillText(data[i][textKey], coordinates[0] + offset.x, coordinates[1] + offset.y);
        }
    }
};

/**
 * @author Mofei Zhu<mapv@zhuwenlong.com>
 * This file is to draw text
 */

var drawIcon = {
    draw: function draw(context, dataSet, options) {
        var data = dataSet instanceof DataSet ? dataSet.get() : dataSet;

        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        var offset = options.offset || {
            x: 0,
            y: 0
        };

        // set from options
        // for (var key in options) {
        //     context[key] = options[key];
        // }
        // console.log(data)
        for (var i = 0, len = data.length; i < len; i++) {

            if (data[i].geometry) {
                var icon = data[i].icon || options.icon;
                var coordinates = data[i].geometry._coordinates || data[i].geometry.coordinates;
                context.drawImage(icon, coordinates[0] - icon.width / 2 + offset.x, coordinates[1] - icon.height / 2 + offset.y);
            }
        }
    }
};

/**
 * @author kyle / http://nikai.us/
 */

if (typeof window !== 'undefined') {
    requestAnimationFrame(animate);
}

function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
}

function Layer(map, dataSet, options) {
    if (!(dataSet instanceof DataSet)) {
        dataSet = new DataSet(dataSet);
    }

    this.dataSet = dataSet;

    var self = this;
    var data = null;
    options = options || {};

    self.map = map;

    self.init(options);
    self.argCheck(options);

    self.transferToMercator();
    this.dataSet.on('change', function () {
        self.transferToMercator();
    });

    var canvasLayer = this.canvasLayer = new CanvasLayer({
        map: map,
        context: this.context,
        paneName: options.paneName,
        mixBlendMode: options.mixBlendMode,
        enableMassClear: options.enableMassClear,
        zIndex: options.zIndex,
        update: function update() {
            self._canvasUpdate();
        }
    });

    dataSet.on('change', function () {
        canvasLayer.draw();
    });

    this.clickEvent = this.clickEvent.bind(this);
    this.mousemoveEvent = this.mousemoveEvent.bind(this);

    this.bindEvent();
}

Layer.prototype.clickEvent = function (e) {
    var pixel = e.pixel;
    var context = this.canvasLayer.canvas.getContext(this.context);
    var data = this.dataSet.get();
    for (var i = 0; i < data.length; i++) {
        context.beginPath();
        pathSimple.draw(context, data[i], this.options);
        if (context.isPointInPath(pixel.x * this.canvasLayer.devicePixelRatio, pixel.y * this.canvasLayer.devicePixelRatio)) {
            this.options.methods.click(data[i], e);
            return;
        }
    }

    this.options.methods.click(null, e);
};

Layer.prototype.mousemoveEvent = function (e) {
    var pixel = e.pixel;
    var context = this.canvasLayer.canvas.getContext(this.context);
    var data = this.dataSet.get();
    for (var i = 0; i < data.length; i++) {
        context.beginPath();
        pathSimple.draw(context, data[i], this.options);
        if (context.isPointInPath(pixel.x * this.canvasLayer.devicePixelRatio, pixel.y * this.canvasLayer.devicePixelRatio)) {
            this.options.methods.mousemove(data[i], e);
            return;
        }
    }
    this.options.methods.mousemove(null, e);
};

Layer.prototype.bindEvent = function (e) {
    var map = this.map;

    if (this.options.methods) {
        if (this.options.methods.click) {
            map.setDefaultCursor("default");
            map.addEventListener('click', this.clickEvent);
        }
        if (this.options.methods.mousemove) {
            map.addEventListener('mousemove', this.mousemoveEvent);
        }
    }
};

Layer.prototype.unbindEvent = function (e) {
    var map = this.map;

    if (this.options.methods) {
        if (this.options.methods.click) {
            map.removeEventListener('click', this.clickEvent);
        }
        if (this.options.methods.mousemove) {
            map.removeEventListener('mousemove', this.mousemoveEvent);
        }
    }
};

// 经纬度左边转换为墨卡托坐标
Layer.prototype.transferToMercator = function () {
    var projection = this.map.getMapType().getProjection();

    if (this.options.coordType !== 'bd09mc') {
        var data = this.dataSet.get();
        data = this.dataSet.transferCoordinate(data, function (coordinates) {
            var pixel = projection.lngLatToPoint({
                lng: coordinates[0],
                lat: coordinates[1]
            });
            return [pixel.x, pixel.y];
        }, 'coordinates', 'coordinates_mercator');
        this.dataSet._set(data);
    }
};

Layer.prototype._canvasUpdate = function (time) {
    if (!this.canvasLayer) {
        return;
    }

    var self = this;

    var animationOptions = self.options.animation;

    var map = this.canvasLayer._map;

    var zoomUnit = Math.pow(2, 18 - map.getZoom());
    var projection = map.getMapType().getProjection();

    var mcCenter = projection.lngLatToPoint(map.getCenter());
    var nwMc = new BMap.Pixel(mcCenter.x - map.getSize().width / 2 * zoomUnit, mcCenter.y + map.getSize().height / 2 * zoomUnit); //左上角墨卡托坐标

    //console.time('update')
    var context = this.canvasLayer.canvas.getContext(self.context);

    if (self.isEnabledTime()) {
        if (time === undefined) {
            clear(context);
            return;
        }
        if (this.context == '2d') {
            context.save();
            context.globalCompositeOperation = 'destination-out';
            context.fillStyle = 'rgba(0, 0, 0, .1)';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            context.restore();
        }
    } else {
        clear(context);
    }

    if (this.context == '2d') {
        for (var key in self.options) {
            context[key] = self.options[key];
        }
    } else {
        context.clear(context.COLOR_BUFFER_BIT);
    }

    var scale = 1;
    if (this.context != '2d') {
        scale = this.canvasLayer.devicePixelRatio;
    }

    var dataGetOptions = {
        fromColumn: self.options.coordType == 'bd09mc' ? 'coordinates' : 'coordinates_mercator',
        transferCoordinate: function transferCoordinate(coordinate) {

            // if (self.options.coordType == 'bd09mc') {
            var x = (coordinate[0] - nwMc.x) / zoomUnit * scale;
            var y = (nwMc.y - coordinate[1]) / zoomUnit * scale;
            return [x, y];
            // }

            // var pixel = map.pointToPixel(new BMap.Point(coordinate[0], coordinate[1]));
            // return [pixel.x, pixel.y];
        }
    };

    if (time !== undefined) {
        dataGetOptions.filter = function (item) {
            var trails = animationOptions.trails || 10;
            if (time && item.time > time - trails && item.time < time) {
                return true;
            } else {
                return false;
            }
        };
    }

    // get data from data set
    var data = self.dataSet.get(dataGetOptions);

    // deal with data based on draw

    // TODO: 部分情况下可以不用循环，比如heatmap
    //console.time('setstyle');

    var draw = self.options.draw;
    if (draw == 'bubble' || draw == 'intensity' || draw == 'category' || draw == 'choropleth' || draw == 'simple') {

        for (var i = 0; i < data.length; i++) {
            var item = data[i];

            if (self.options.draw == 'bubble') {
                data[i]._size = self.intensity.getSize(item.count);
            } else {
                data[i]._size = undefined;
            }

            if (self.options.draw == 'intensity') {
                if (data[i].geometry.type === 'LineString') {
                    data[i].strokeStyle = item.strokeStyle || self.intensity.getColor(item.count);
                } else {
                    data[i].fillStyle = item.fillStyle || self.intensity.getColor(item.count);
                }
            } else if (self.options.draw == 'category') {
                data[i].fillStyle = item.fillStyle || self.category.get(item.count);
            } else if (self.options.draw == 'choropleth') {
                data[i].fillStyle = item.fillStyle || self.choropleth.get(item.count);
            }
        }
    }

    //console.timeEnd('setstyle');

    if (self.options.minZoom && map.getZoom() < self.options.minZoom || self.options.maxZoom && map.getZoom() > self.options.maxZoom) {
        return;
    }

    //console.time('draw');
    // draw

    if (self.options.unit == 'm' && self.options.size) {
        self.options._size = self.options.size / zoomUnit;
    } else {
        self.options._size = self.options.size;
    }

    switch (self.options.draw) {
        case 'heatmap':
            drawHeatmap.draw(context, new DataSet(data), self.options);
            break;
        case 'grid':
        case 'honeycomb':
            /*
            if (data.length <= 0) {
                break;
            }
             var minx = data[0].geometry.coordinates[0];
            var maxy = data[0].geometry.coordinates[1];
            for (var i = 1; i < data.length; i++) {
                minx = Math.min(data[i].geometry.coordinates[0], minx);
                maxy = Math.max(data[i].geometry.coordinates[1], maxy);
            }
            var nwPixel = map.pointToPixel(new BMap.Point(minx, maxy));
            */
            var nwPixel = map.pointToPixel(new BMap.Point(0, 0));
            self.options.offset = {
                x: nwPixel.x,
                y: nwPixel.y
            };
            if (self.options.draw == 'grid') {
                drawGrid.draw(context, new DataSet(data), self.options);
            } else {
                drawHoneycomb.draw(context, new DataSet(data), self.options);
            }
            break;
        case 'text':
            drawText.draw(context, new DataSet(data), self.options);
            break;
        case 'icon':
            drawIcon.draw(context, data, self.options);
            break;
        case 'clip':
            context.save();
            context.fillStyle = self.options.fillStyle || 'rgba(0, 0, 0, 0.5)';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            drawSimple.draw(context, data, self.options);
            context.beginPath();
            pathSimple.drawDataSet(context, new DataSet(data), self.options);
            context.clip();
            clear(context);
            context.restore();
            break;
        default:
            if (self.options.context == "webgl") {
                webglDrawSimple.draw(self.canvasLayer.canvas.getContext('webgl'), data, self.options);
            } else {
                drawSimple.draw(context, data, self.options);
            }
    }
    //console.timeEnd('draw');

    //console.timeEnd('update')
    self.options.updateCallback && self.options.updateCallback(time);
};

Layer.prototype.isEnabledTime = function () {

    var animationOptions = this.options.animation;

    var flag = animationOptions && !(animationOptions.enabled === false);

    return flag;
};

Layer.prototype.argCheck = function (options) {
    if (options.draw == 'heatmap') {
        if (options.strokeStyle) {
            console.warn('[heatmap] options.strokeStyle is discard, pleause use options.strength [eg: options.strength = 0.1]');
        }
    }
};

Layer.prototype.init = function (options) {
    var self = this;

    self.options = options;

    this.context = self.options.context || '2d';

    self.intensity = new Intensity({
        maxSize: self.options.maxSize,
        minSize: self.options.minSize,
        gradient: self.options.gradient,
        max: self.options.max || this.dataSet.getMax('count')
    });

    self.category = new Category(self.options.splitList);
    self.choropleth = new Choropleth(self.options.splitList);
    if (self.options.splitList === undefined) {
        self.category.generateByDataSet(this.dataSet);
    }

    if (self.options.zIndex) {
        this.canvasLayer && this.canvasLayer.setZIndex(self.options.zIndex);
    }

    if (self.options.splitList === undefined) {
        var min = self.options.min || this.dataSet.getMin('count');
        var max = self.options.max || this.dataSet.getMax('count');
        self.choropleth.generateByMinMax(min, max);
    }

    var animationOptions = self.options.animation;

    if (self.options.draw == 'time' || self.isEnabledTime()) {
        //if (!self.animator) {
        if (!animationOptions.stepsRange) {
            animationOptions.stepsRange = {
                start: this.dataSet.getMin('time') || 0,
                end: this.dataSet.getMax('time') || 0
            };
        }

        var steps = { step: animationOptions.stepsRange.start };
        self.animator = new TWEEN.Tween(steps).onUpdate(function () {
            self._canvasUpdate(this.step);
        }).repeat(Infinity);

        self.map.addEventListener('movestart', function () {
            if (self.isEnabledTime() && self.animator) {
                self.animator.stop();
            }
        });

        self.map.addEventListener('moveend', function () {
            if (self.isEnabledTime() && self.animator) {
                self.animator.start();
            }
        });
        //}

        var duration = animationOptions.duration * 1000 || 5000;

        self.animator.to({ step: animationOptions.stepsRange.end }, duration);
        self.animator.start();
    } else {
        self.animator && self.animator.stop();
    }
};

Layer.prototype.show = function () {
    this.map.addOverlay(this.canvasLayer);
};

Layer.prototype.hide = function () {
    this.map.removeOverlay(this.canvasLayer);
};

Layer.prototype.destroy = function () {
    this.unbindEvent();
    this.hide();
};

/**
 * obj.options
 */
Layer.prototype.update = function (obj) {
    var self = this;
    var _options = obj.options;
    var options = self.options;
    for (var i in _options) {
        options[i] = _options[i];
    }
    self.init(options);
    self.canvasLayer.draw();
};

Layer.prototype.setOptions = function (options) {
    var self = this;
    self.init(options);
    self.canvasLayer.draw();
};

Layer.prototype.set = function (obj) {
    var conf = {
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        imageSmoothingEnabled: true,
        strokeStyle: '#000000',
        fillStyle: '#000000',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        lineDashOffset: 0,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic'
    };
    var self = this;
    var ctx = self.canvasLayer.canvas.getContext(self.context);
    for (var i in conf) {
        ctx[i] = conf[i];
    }
    self.init(obj.options);
    self.canvasLayer.draw();
};

Layer.prototype.getLegend = function (options) {
    var draw = this.options.draw;
    var legend = null;
    if (self.options.draw == 'intensity' || self.options.draw == 'heatmap') {
        return this.intensity.getLegend(options);
    }
};

/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Extends OverlayView to provide a canvas "Layer".
 * @author Brendan Kenny
 */

/**
 * A map layer that provides a canvas over the slippy map and a callback
 * system for efficient animation. Requires canvas and CSS 2D transform
 * support.
 * @constructor
 * @extends google.maps.OverlayView
 * @param {CanvasLayerOptions=} opt_options Options to set in this CanvasLayer.
 */
function CanvasLayer$2(opt_options) {
  /**
   * If true, canvas is in a map pane and the OverlayView is fully functional.
   * See google.maps.OverlayView.onAdd for more information.
   * @type {boolean}
   * @private
   */
  this.isAdded_ = false;

  /**
   * If true, each update will immediately schedule the next.
   * @type {boolean}
   * @private
   */
  this.isAnimated_ = false;

  /**
   * The name of the MapPane in which this layer will be displayed.
   * @type {string}
   * @private
   */
  this.paneName_ = CanvasLayer$2.DEFAULT_PANE_NAME_;

  /**
   * A user-supplied function called whenever an update is required. Null or
   * undefined if a callback is not provided.
   * @type {?function=}
   * @private
   */
  this.updateHandler_ = null;

  /**
   * A user-supplied function called whenever an update is required and the
   * map has been resized since the last update. Null or undefined if a
   * callback is not provided.
   * @type {?function}
   * @private
   */
  this.resizeHandler_ = null;

  /**
   * The LatLng coordinate of the top left of the current view of the map. Will
   * be null when this.isAdded_ is false.
   * @type {google.maps.LatLng}
   * @private
   */
  this.topLeft_ = null;

  /**
   * The map-pan event listener. Will be null when this.isAdded_ is false. Will
   * be null when this.isAdded_ is false.
   * @type {?function}
   * @private
   */
  this.centerListener_ = null;

  /**
   * The map-resize event listener. Will be null when this.isAdded_ is false.
   * @type {?function}
   * @private
   */
  this.resizeListener_ = null;

  /**
   * If true, the map size has changed and this.resizeHandler_ must be called
   * on the next update.
   * @type {boolean}
   * @private
   */
  this.needsResize_ = true;

  /**
   * A browser-defined id for the currently requested callback. Null when no
   * callback is queued.
   * @type {?number}
   * @private
   */
  this.requestAnimationFrameId_ = null;

  var canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.pointerEvents = 'none';

  /**
   * The canvas element.
   * @type {!HTMLCanvasElement}
   */
  this.canvas = canvas;

  /**
   * The CSS width of the canvas, which may be different than the width of the
   * backing store.
   * @private {number}
   */
  this.canvasCssWidth_ = 300;

  /**
   * The CSS height of the canvas, which may be different than the height of
   * the backing store.
   * @private {number}
   */
  this.canvasCssHeight_ = 150;

  /**
   * A value for scaling the CanvasLayer resolution relative to the CanvasLayer
   * display size.
   * @private {number}
   */
  this.resolutionScale_ = 1;

  /**
   * Simple bind for functions with no args for bind-less browsers (Safari).
   * @param {Object} thisArg The this value used for the target function.
   * @param {function} func The function to be bound.
   */
  function simpleBindShim(thisArg, func) {
    return function () {
      func.apply(thisArg);
    };
  }

  /**
   * A reference to this.repositionCanvas_ with this bound as its this value.
   * @type {function}
   * @private
   */
  this.repositionFunction_ = simpleBindShim(this, this.repositionCanvas_);

  /**
   * A reference to this.resize_ with this bound as its this value.
   * @type {function}
   * @private
   */
  this.resizeFunction_ = simpleBindShim(this, this.resize_);

  /**
   * A reference to this.update_ with this bound as its this value.
   * @type {function}
   * @private
   */
  this.requestUpdateFunction_ = simpleBindShim(this, this.update_);

  // set provided options, if any
  if (opt_options) {
    this.setOptions(opt_options);
  }
}

var global$3 = typeof window === 'undefined' ? {} : window;

if (global$3.google && global$3.google.maps) {

  CanvasLayer$2.prototype = new google.maps.OverlayView();

  /**
   * The default MapPane to contain the canvas.
   * @type {string}
   * @const
   * @private
   */
  CanvasLayer$2.DEFAULT_PANE_NAME_ = 'overlayLayer';

  /**
   * Transform CSS property name, with vendor prefix if required. If browser
   * does not support transforms, property will be ignored.
   * @type {string}
   * @const
   * @private
   */
  CanvasLayer$2.CSS_TRANSFORM_ = function () {
    var div = document.createElement('div');
    var transformProps = ['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
    for (var i = 0; i < transformProps.length; i++) {
      var prop = transformProps[i];
      if (div.style[prop] !== undefined) {
        return prop;
      }
    }

    // return unprefixed version by default
    return transformProps[0];
  }();

  /**
   * The requestAnimationFrame function, with vendor-prefixed or setTimeout-based
   * fallbacks. MUST be called with window as thisArg.
   * @type {function}
   * @param {function} callback The function to add to the frame request queue.
   * @return {number} The browser-defined id for the requested callback.
   * @private
   */
  CanvasLayer$2.prototype.requestAnimFrame_ = global$3.requestAnimationFrame || global$3.webkitRequestAnimationFrame || global$3.mozRequestAnimationFrame || global$3.oRequestAnimationFrame || global$3.msRequestAnimationFrame || function (callback) {
    return global$3.setTimeout(callback, 1000 / 60);
  };

  /**
   * The cancelAnimationFrame function, with vendor-prefixed fallback. Does not
   * fall back to clearTimeout as some platforms implement requestAnimationFrame
   * but not cancelAnimationFrame, and the cost is an extra frame on onRemove.
   * MUST be called with window as thisArg.
   * @type {function}
   * @param {number=} requestId The id of the frame request to cancel.
   * @private
   */
  CanvasLayer$2.prototype.cancelAnimFrame_ = global$3.cancelAnimationFrame || global$3.webkitCancelAnimationFrame || global$3.mozCancelAnimationFrame || global$3.oCancelAnimationFrame || global$3.msCancelAnimationFrame || function (requestId) {};

  /**
   * Sets any options provided. See CanvasLayerOptions for more information.
   * @param {CanvasLayerOptions} options The options to set.
   */
  CanvasLayer$2.prototype.setOptions = function (options) {
    if (options.animate !== undefined) {
      this.setAnimate(options.animate);
    }

    if (options.paneName !== undefined) {
      this.setPaneName(options.paneName);
    }

    if (options.updateHandler !== undefined) {
      this.setUpdateHandler(options.updateHandler);
    }

    if (options.resizeHandler !== undefined) {
      this.setResizeHandler(options.resizeHandler);
    }

    if (options.resolutionScale !== undefined) {
      this.setResolutionScale(options.resolutionScale);
    }

    if (options.map !== undefined) {
      this.setMap(options.map);
    }
  };

  /**
   * Set the animated state of the layer. If true, updateHandler will be called
   * repeatedly, once per frame. If false, updateHandler will only be called when
   * a map property changes that could require the canvas content to be redrawn.
   * @param {boolean} animate Whether the canvas is animated.
   */
  CanvasLayer$2.prototype.setAnimate = function (animate) {
    this.isAnimated_ = !!animate;

    if (this.isAnimated_) {
      this.scheduleUpdate();
    }
  };

  /**
   * @return {boolean} Whether the canvas is animated.
   */
  CanvasLayer$2.prototype.isAnimated = function () {
    return this.isAnimated_;
  };

  /**
   * Set the MapPane in which this layer will be displayed, by name. See
   * {@code google.maps.MapPanes} for the panes available.
   * @param {string} paneName The name of the desired MapPane.
   */
  CanvasLayer$2.prototype.setPaneName = function (paneName) {
    this.paneName_ = paneName;

    this.setPane_();
  };

  /**
   * @return {string} The name of the current container pane.
   */
  CanvasLayer$2.prototype.getPaneName = function () {
    return this.paneName_;
  };

  /**
   * Adds the canvas to the specified container pane. Since this is guaranteed to
   * execute only after onAdd is called, this is when paneName's existence is
   * checked (and an error is thrown if it doesn't exist).
   * @private
   */
  CanvasLayer$2.prototype.setPane_ = function () {
    if (!this.isAdded_) {
      return;
    }

    // onAdd has been called, so panes can be used
    var panes = this.getPanes();
    if (!panes[this.paneName_]) {
      throw new Error('"' + this.paneName_ + '" is not a valid MapPane name.');
    }

    panes[this.paneName_].appendChild(this.canvas);
  };

  /**
   * Set a function that will be called whenever the parent map and the overlay's
   * canvas have been resized. If opt_resizeHandler is null or unspecified, any
   * existing callback is removed.
   * @param {?function=} opt_resizeHandler The resize callback function.
   */
  CanvasLayer$2.prototype.setResizeHandler = function (opt_resizeHandler) {
    this.resizeHandler_ = opt_resizeHandler;
  };

  /**
   * Sets a value for scaling the canvas resolution relative to the canvas
   * display size. This can be used to save computation by scaling the backing
   * buffer down, or to support high DPI devices by scaling it up (by e.g.
   * window.devicePixelRatio).
   * @param {number} scale
   */
  CanvasLayer$2.prototype.setResolutionScale = function (scale) {
    if (typeof scale === 'number') {
      this.resolutionScale_ = scale;
      this.resize_();
    }
  };

  /**
   * Set a function that will be called when a repaint of the canvas is required.
   * If opt_updateHandler is null or unspecified, any existing callback is
   * removed.
   * @param {?function=} opt_updateHandler The update callback function.
   */
  CanvasLayer$2.prototype.setUpdateHandler = function (opt_updateHandler) {
    this.updateHandler_ = opt_updateHandler;
  };

  /**
   * @inheritDoc
   */
  CanvasLayer$2.prototype.onAdd = function () {
    if (this.isAdded_) {
      return;
    }

    this.isAdded_ = true;
    this.setPane_();

    this.resizeListener_ = google.maps.event.addListener(this.getMap(), 'resize', this.resizeFunction_);
    this.centerListener_ = google.maps.event.addListener(this.getMap(), 'center_changed', this.repositionFunction_);

    this.resize_();
    this.repositionCanvas_();
  };

  /**
   * @inheritDoc
   */
  CanvasLayer$2.prototype.onRemove = function () {
    if (!this.isAdded_) {
      return;
    }

    this.isAdded_ = false;
    this.topLeft_ = null;

    // remove canvas and listeners for pan and resize from map
    this.canvas.parentElement.removeChild(this.canvas);
    if (this.centerListener_) {
      google.maps.event.removeListener(this.centerListener_);
      this.centerListener_ = null;
    }
    if (this.resizeListener_) {
      google.maps.event.removeListener(this.resizeListener_);
      this.resizeListener_ = null;
    }

    // cease canvas update callbacks
    if (this.requestAnimationFrameId_) {
      this.cancelAnimFrame_.call(global$3, this.requestAnimationFrameId_);
      this.requestAnimationFrameId_ = null;
    }
  };

  /**
   * The internal callback for resize events that resizes the canvas to keep the
   * map properly covered.
   * @private
   */
  CanvasLayer$2.prototype.resize_ = function () {
    if (!this.isAdded_) {
      return;
    }

    var map = this.getMap();
    var mapWidth = map.getDiv().offsetWidth;
    var mapHeight = map.getDiv().offsetHeight;

    var newWidth = mapWidth * this.resolutionScale_;
    var newHeight = mapHeight * this.resolutionScale_;
    var oldWidth = this.canvas.width;
    var oldHeight = this.canvas.height;

    // resizing may allocate a new back buffer, so do so conservatively
    if (oldWidth !== newWidth || oldHeight !== newHeight) {
      this.canvas.width = newWidth;
      this.canvas.height = newHeight;

      this.needsResize_ = true;
      this.scheduleUpdate();
    }

    // reset styling if new sizes don't match; resize of data not needed
    if (this.canvasCssWidth_ !== mapWidth || this.canvasCssHeight_ !== mapHeight) {
      this.canvasCssWidth_ = mapWidth;
      this.canvasCssHeight_ = mapHeight;
      this.canvas.style.width = mapWidth + 'px';
      this.canvas.style.height = mapHeight + 'px';
    }
  };

  /**
   * @inheritDoc
   */
  CanvasLayer$2.prototype.draw = function () {
    this.repositionCanvas_();
  };

  /**
   * Internal callback for map view changes. Since the Maps API moves the overlay
   * along with the map, this function calculates the opposite translation to
   * keep the canvas in place.
   * @private
   */
  CanvasLayer$2.prototype.repositionCanvas_ = function () {
    // TODO(bckenny): *should* only be executed on RAF, but in current browsers
    //     this causes noticeable hitches in map and overlay relative
    //     positioning.

    var map = this.getMap();

    // topLeft can't be calculated from map.getBounds(), because bounds are
    // clamped to -180 and 180 when completely zoomed out. Instead, calculate
    // left as an offset from the center, which is an unwrapped LatLng.
    var top = map.getBounds().getNorthEast().lat();
    var center = map.getCenter();
    var scale = Math.pow(2, map.getZoom());
    var left = center.lng() - this.canvasCssWidth_ * 180 / (256 * scale);
    this.topLeft_ = new google.maps.LatLng(top, left);

    // Canvas position relative to draggable map's container depends on
    // overlayView's projection, not the map's. Have to use the center of the
    // map for this, not the top left, for the same reason as above.
    var projection = this.getProjection();
    var divCenter = projection.fromLatLngToDivPixel(center);
    var offsetX = -Math.round(this.canvasCssWidth_ / 2 - divCenter.x);
    var offsetY = -Math.round(this.canvasCssHeight_ / 2 - divCenter.y);
    this.canvas.style[CanvasLayer$2.CSS_TRANSFORM_] = 'translate(' + offsetX + 'px,' + offsetY + 'px)';

    this.scheduleUpdate();
  };

  /**
   * Internal callback that serves as main animation scheduler via
   * requestAnimationFrame. Calls resize and update callbacks if set, and
   * schedules the next frame if overlay is animated.
   * @private
   */
  CanvasLayer$2.prototype.update_ = function () {
    this.requestAnimationFrameId_ = null;

    if (!this.isAdded_) {
      return;
    }

    if (this.isAnimated_) {
      this.scheduleUpdate();
    }

    if (this.needsResize_ && this.resizeHandler_) {
      this.needsResize_ = false;
      this.resizeHandler_();
    }

    if (this.updateHandler_) {
      this.updateHandler_();
    }
  };

  /**
   * A convenience method to get the current LatLng coordinate of the top left of
   * the current view of the map.
   * @return {google.maps.LatLng} The top left coordinate.
   */
  CanvasLayer$2.prototype.getTopLeft = function () {
    return this.topLeft_;
  };

  /**
   * Schedule a requestAnimationFrame callback to updateHandler. If one is
   * already scheduled, there is no effect.
   */
  CanvasLayer$2.prototype.scheduleUpdate = function () {
    if (this.isAdded_ && !this.requestAnimationFrameId_) {
      this.requestAnimationFrameId_ = this.requestAnimFrame_.call(global$3, this.requestUpdateFunction_);
    }
  };
}

/**
 * @author kyle / http://nikai.us/
 */

function Layer$2(map, dataSet, options) {
    var intensity = new Intensity({
        maxSize: options.maxSize,
        gradient: options.gradient,
        max: options.max
    });

    var category = new Category(options.splitList);

    var choropleth = new Choropleth(options.splitList);

    var resolutionScale = window.devicePixelRatio || 1;

    // initialize the canvasLayer
    var canvasLayerOptions = {
        map: map,
        animate: false,
        updateHandler: update,
        resolutionScale: resolutionScale
    };

    var canvasLayer = new CanvasLayer$2(canvasLayerOptions);

    function update() {

        var context = canvasLayer.canvas.getContext('2d');

        clear(context);

        for (var key in options) {
            context[key] = options[key];
        }

        var pointCount = 0;
        var lineCount = 0;
        var polygonCount = 0;

        /* We need to scale and translate the map for current view.
         * see https://developers.google.com/maps/documentation/javascript/maptypes#MapCoordinates
         */
        var mapProjection = map.getProjection();

        // scale is just 2^zoom
        // If canvasLayer is scaled (with resolutionScale), we need to scale by
        // the same amount to account for the larger canvas.
        var scale = Math.pow(2, map.zoom) * resolutionScale;

        var offset = mapProjection.fromLatLngToPoint(canvasLayer.getTopLeft());

        var data = dataSet.get({
            transferCoordinate: function transferCoordinate(coordinate) {
                var latLng = new google.maps.LatLng(coordinate[1], coordinate[0]);
                var worldPoint = mapProjection.fromLatLngToPoint(latLng);
                var pixel = {
                    x: (worldPoint.x - offset.x) * scale,
                    y: (worldPoint.y - offset.y) * scale
                };
                return [pixel.x, pixel.y];
            }
        });

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (options.draw == 'bubble') {
                data[i].size = intensity.getSize(item.count);
            } else if (options.draw == 'intensity') {
                if (data[i].geometry.type === 'LineString') {
                    data[i].strokeStyle = intensity.getColor(item.count);
                } else {
                    data[i].fillStyle = intensity.getColor(item.count);
                }
            } else if (options.draw == 'category') {
                data[i].fillStyle = category.get(item.count);
            } else if (options.draw == 'choropleth') {
                data[i].fillStyle = choropleth.get(item.count);
            }
        }

        var maxCount = Math.max(Math.max(pointCount, lineCount), polygonCount);

        if (options.draw == 'heatmap') {
            drawHeatmap.draw(context, new DataSet(data), options);
        } else if (options.draw == 'grid' || options.draw == 'honeycomb') {
            var data1 = dataSet.get();
            var minx = data1[0].geometry.coordinates[0];
            var maxy = data1[0].geometry.coordinates[1];
            for (var i = 1; i < data1.length; i++) {
                if (data1[i].geometry.coordinates[0] < minx) {
                    minx = data1[i].geometry.coordinates[0];
                }
                if (data1[i].geometry.coordinates[1] > maxy) {
                    maxy = data1[i].geometry.coordinates[1];
                }
            }

            var latLng = new google.maps.LatLng(minx, maxy);
            var worldPoint = mapProjection.fromLatLngToPoint(latLng);

            options.offset = {
                x: (worldPoint.x - offset.x) * scale,
                y: (worldPoint.y - offset.y) * scale
            };
            if (options.draw == 'grid') {
                drawGrid.draw(context, new DataSet(data), options);
            } else {
                drawHoneycomb.draw(context, new DataSet(data), options);
            }
        } else {
            console.log('hehe');
            drawSimple.draw(context, new DataSet(data), options);
        }
    }
}

/**
 * @author kyle / http://nikai.us/
 */

var geojson = {
    getDataSet: function getDataSet(geoJson) {

        var data = [];
        var features = geoJson.features;
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var geometry = feature.geometry;
            var properties = feature.properties;
            var item = {};
            for (var key in properties) {
                item[key] = properties[key];
            }
            item.geometry = geometry;
            data.push(item);
        }
        return new DataSet(data);
    }
};

/**
 * @author kyle / http://nikai.us/
 */

var csv = {
    CSVToArray: function CSVToArray(strData, strDelimiter) {
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = strDelimiter || ",";

        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
        // Delimiters.
        "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

        // Quoted fields.
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

        // Standard fields.
        "([^\"\\" + strDelimiter + "\\r\\n]*))", "gi");

        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches = null;

        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while (arrMatches = objPattern.exec(strData)) {

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[1];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {

                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push([]);
            }

            var strMatchedValue;

            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[2]) {

                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
            } else {

                // We found a non-quoted value.
                strMatchedValue = arrMatches[3];
            }

            // Now that we have our value string, let's add
            // it to the data array.
            arrData[arrData.length - 1].push(strMatchedValue);
        }

        // Return the parsed data.
        return arrData;
    },

    getDataSet: function getDataSet(csvStr) {

        var arr = this.CSVToArray(csvStr, ',');

        var data = [];

        var header = arr[0];

        for (var i = 1; i < arr.length - 1; i++) {
            var line = arr[i];
            var item = {};
            for (var j = 0; j < line.length; j++) {
                var value = line[j];
                if (header[j] == 'geometry') {
                    value = JSON.parse(value);
                }
                item[header[j]] = value;
            }
            data.push(item);
        }

        return new DataSet(data);
    }
};

exports.version = version;
exports.Three = THREE$1;
exports.x = X;
exports.X = X;
exports.Flate = Flate;
exports.Earth = Earth;
exports.canvasClear = clear;
exports.canvasResolutionScale = resolutionScale;
exports.canvasDrawSimple = drawSimple;
exports.canvasDrawHeatmap = drawHeatmap;
exports.canvasDrawGrid = drawGrid;
exports.canvasDrawHoneycomb = drawHoneycomb;
exports.webglDrawSimple = webglDrawSimple;
exports.webglDrawPoint = point;
exports.webglDrawLine = line;
exports.webglDrawPolygon = polygon;
exports.utilCityCenter = cityCenter;
exports.utilCurve = curve;
exports.utilForceEdgeBundling = ForceEdgeBundling;
exports.utilDataRangeIntensity = Intensity;
exports.utilDataRangeCategory = Category;
exports.utilDataRangeChoropleth = Choropleth;
exports.Timer = Timer;
exports.Animator = Animator;
exports.Map = MapHelper;
exports.baiduMapCanvasLayer = CanvasLayer;
exports.baiduMapLayer = Layer;
exports.googleMapCanvasLayer = CanvasLayer$2;
exports.googleMapLayer = Layer$2;
exports.DataSet = DataSet;
exports.geojson = geojson;
exports.csv = csv;

Object.defineProperty(exports, '__esModule', { value: true });

})));