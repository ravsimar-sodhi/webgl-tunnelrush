var tileRotation = 0.0;
var obsRotation = 0.0;
var gameSpeed = 0.05;
var covDis = 0.0;
var currPos = {x: 0.0,y:0.7,z:covDis};
var left,right,jump;
var tileColors = [
    [0.2, 0.2, 1.0, 1.0],    // blue
    [0.6, 0.7, 0.8, 1.0],    // red
    [0.1, 1.0, 0.1, 1.0],    // green
    [1.0, 0.7, 0.2, 1.0],    // orange
    [0.5, 0.1, 0.5, 1.0],    // dark purple
    [1.0, 1.0, 0.0, 1.0],    // yellow
    [1.0, 0.0, 1.0, 1.0],    // purple
    [0.2, 1.0, 1.0, 1.0],    // turqoise
]
main();

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createPolyhedron(n, radius, depth, zoffset) {
    var r = radius;
    var k = 0;
    var angle = 0;
    var positions = [];
    for (var i = 0; i < n; i++) {
        positions[k++] = r * Math.cos(angle);
        positions[k++] = r * Math.sin(angle);
        positions[k++] = zoffset - depth;

        positions[k++] = r * Math.cos(angle);
        positions[k++] = r * Math.sin(angle);
        positions[k++] = zoffset + depth;

        angle += (2 * Math.PI) / n;

        positions[k++] = r * Math.cos(angle);
        positions[k++] = r * Math.sin(angle);
        positions[k++] = zoffset - depth;

        positions[k++] = r * Math.cos(angle);
        positions[k++] = r * Math.sin(angle);
        positions[k++] = zoffset + depth;
    }

    var indices = [];
    var k = 0;
    for (var i = 0; i < n; i++) {
        indices[k++] = (4 * i) % (4 * n);
        indices[k++] = (4 * i + 1) % (4 * n);
        indices[k++] = (4 * i + 2) % (4 * n);

        indices[k++] = (4 * i + 1) % (4 * n);
        indices[k++] = (4 * i + 2) % (4 * n);
        indices[k++] = (4 * i + 3) % (4 * n);
    }
    var faceColors = [];
    for(var i=0;i<n;i++)
    {
        faceColors[i] = tileColors[Math.floor(Math.random()*n)];
    }
    return {
        'faceColors': faceColors,
        'indices': indices,
        'colNumComponents': 4,
        'posNumComponents': 3,
        'vertexCount': 48,
        'positions': positions,
        'zoffset': zoffset,
    }
}
function createObstacle(n, radius, depth, zoffset)
{
    var r = radius;
    var k = 0;
    var angle = 0;
    var positions = [];
    positions[k++] = 0;
    positions[k++] = 0;
    positions[k++] = zoffset;
    for (var i = 0; i <= n/2; i++) {
        positions[k++] = r * Math.cos(angle);
        positions[k++] = r * Math.sin(angle);
        positions[k++] = zoffset;
        angle += (2*Math.PI) / n;

    }

    var indices = [];
    var k = 0;
    for (var i = 0; i < n/2; i++) {
        indices[k++] = 0;
        indices[k++] = (i+1);
        indices[k++] = (i+2);
        console.log(k);
    }
    var faceColors = [];
    for (var i = 0; i < n/2; i++) {
        faceColors[i] = [1.0, 0.0, 0.0, 1.0];
    }
    return {
        'faceColors': faceColors,
        'indices': indices,
        'colNumComponents': 4,
        'posNumComponents': 3,
        'vertexCount': 12,
        'positions': positions,
        'zoffset': zoffset,
    }
}
function initScene(gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,     // destination matrix
        modelViewMatrix,     // matrix to translate
        [currPos.x, currPos.y, currPos.z]);  // amount to translate
    mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,  // matrix to rotate
        tileRotation,     // amount to rotate in radians
        [0, 0, 1]);       // axis to rotate around (Z)
    return { projectionMatrix, modelViewMatrix };
}
function initBuffers(gl, shape) {
    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    indexBuffer = gl.createBuffer();
    // Create a buffer for the cube's vertex positions.
    var positions = shape.positions;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Convert the array of colors into a table for all the vertices.

    var colors = [];
    var faceColors = shape.faceColors;

    for (var j = 0; j < faceColors.length; ++j) {
        const c = faceColors[j];
        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.
    // Now send the element array to GL
    var indices = shape.indices;

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        indices: indexBuffer,
        vertexCount: shape.vertexCount,
        posNumComponents: shape.posNumComponents,
        colNumComponents: shape.colNumComponents,  
    };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, deltaTime, projectionMatrix, modelViewMatrix) {
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute

    {
        const numComponents = buffers.posNumComponents;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = buffers.colNumComponents;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    {
        const vertexCount = buffers.vertexCount;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

    // Update the rotation for the next draw

    // tileRotation += deltaTime;
}
//
// Start here
//
function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    document.addEventListener('keydown', function (event) {
        if (event.keyCode == 65) {
            left = 1;
            // tileRotation += 0.02;
            // alert('Left was pressed');
        }
        if (event.keyCode == 68) {
            right = 1;
            // tileRotation -= 0.02;
            // alert('Right was pressed');
        }


    });
    document.addEventListener('keyup', function (event) {
        if (event.keyCode == 32) {
            jump = 1;
        }
    })
    // If we don't have a GL context, give up now

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Vertex shader program

    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

    // Fragment shader program

    const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.

    var tunnelN = 100;
    var obstacN = 5;
    var wall = [];
    var wallBuffers = [];
    var obstac = [];
    var obstacBuffers = [];
    var radius = 1.1;
    var n = 8;
    var depth = 0.5;
    var i = 0;
    for(;i<tunnelN;i++)
    {
        wall[i] = createPolyhedron(n,radius,depth,-2*i*depth);
        wallBuffers[i] = initBuffers(gl,wall[i]);
    }
    var then = 0;
    var k = i;
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;
        //
        gMat = initScene(gl);
        //
        for(var i=0;i<wall.length;i++)
        {
            drawScene(gl, programInfo, wallBuffers[i], deltaTime, gMat.projectionMatrix, gMat.modelViewMatrix);
        }
        if(-wall[0].zoffset < covDis)
        {
            wall.shift();
            wallBuffers.shift();
            var last = createPolyhedron(n,radius,depth, -2*(k++)*depth);
            wall.push(last);
            // console.log(i);
            wallBuffers.push(initBuffers(gl,last));
            if(k%10 == 0)
            {
                obs = createObstacle(n, radius, 0.5, -covDis-15);
                obstac.push(obs);
                obstacBuffers.push(initBuffers(gl, obs));
            }
        }
        for(var i= 0;i<obstac.length;i++)
        {
            var obsModelViewMatrix = mat4.create();
            mat4.rotate(obsModelViewMatrix,  // destination matrix
                    gMat.modelViewMatrix,  // matrix to rotate
                    obsRotation,     // amount to rotate in radians
                    [0, 0, 1]);       // axis to rotate around (Z)
            drawScene(gl, programInfo, obstacBuffers[i], deltaTime, gMat.projectionMatrix, obsModelViewMatrix);
        }

        requestAnimationFrame(render);
        
        covDis += gameSpeed;
        currPos.z = covDis;
        obsRotation -= gameSpeed/3;
        
        if (left == 1) {
            tileRotation += 2*deltaTime;
            left = 0;
        }
        if (right == 1) {
            tileRotation -= 2*deltaTime;
            right = 0;
        }
        if(jump == 1)
        {
            if(currPos.y > -0.5)
            {
                currPos.y  -= 2*deltaTime;
            }
            else
            {
                jump = 0;
            }
        }
        else
        {
            if(currPos.y < 0.7)
            {
                currPos.y += 2*deltaTime;
            }
        }
        
    }
    requestAnimationFrame(render);
}


