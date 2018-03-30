var tileRotation = 0.0;
var obsRotation = 0.0;
var gameSpeed = 0.05;
// var gameSpeed = 0.0;
var levelScore = 50;
var covDis = 0.0;
var currPos = {x: 0.0,y:0.7,z:covDis};
var left,right,jump;
var texture;
var mode = 0;

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
function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}
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
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([200, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);
        
        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn of mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
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
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    return { projectionMatrix, modelViewMatrix, normalMatrix };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, texture, deltaTime, projectionMatrix, modelViewMatrix, normalMatrix) {
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
/*     {
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
    } */
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
    }

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.textureCoord);
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
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix);

    // Specify the texture to map onto the faces.

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    {
        const vertexCount = buffers.vertexCount;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

    // Update the rotation for the next draw

    // tileRotation += deltaTime;
}
function coldrawScene(gl, programInfo, buffers, deltaTime, projectionMatrix, modelViewMatrix, normalMatrix) {
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
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
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
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix);

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
var gl;
function main() {
    const canvas = document.querySelector('#glcanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
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
        if(event.keyCode == 84)
        {
            mode = !mode;
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

    vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;
    
    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;
    
    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vTextureCoord = aTextureCoord;
      // Apply lighting effect
      highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
      highp vec3 directionalLightColor = vec3(1, 1, 1);
      highp vec3 directionalVector = normalize(vec3(0.5, -1.0, 1.0));
      
      highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
      
      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);
    }
  `;

    // Fragment shader program

    const fsSource = `
    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;
    
    uniform sampler2D uSampler;
    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
      gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
    }
  `;
    const colvsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uNormalMatrix;
    varying highp vec2 vTextureCoord;
    
    uniform mat4 uProjectionMatrix;
    varying highp vec3 vLighting;

    varying highp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
      highp vec3 directionalLightColor = vec3(1, 1, 1);
      highp vec3 directionalVector = normalize(vec3(0.5, -1.0, 1.0));
      
      highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
      
      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);
      vColor = aVertexColor;
    }
  `;

    // Fragment shader program

    const colfsSource = `
    varying highp vec4 vColor;
    varying highp vec3 vLighting;
    uniform sampler2D uSampler;
    varying highp vec2 vTextureCoord;
    
    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
      texelColor= vColor;
      gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
    }
    `;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const colshaderProgram = initShaderProgram(gl, colvsSource, colfsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        },
    };
    const colprogramInfo = {
        program: colshaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(colshaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(colshaderProgram, 'aVertexNormal'),
            vertexColor: gl.getAttribLocation(colshaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(colshaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(colshaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(colshaderProgram, 'uNormalMatrix'),
            uSampler: gl.getUniformLocation(colshaderProgram, 'uSampler'),
            
        },
    }

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.

    var tunnelN = 50;
    var obstacN = 5;
    var wall = [];
    var wallBuffers = [];
    var obstac = [];
    var obstacBuffers = [];
    var radius = 1.1;
    var n = 8;
    var depth = 0.5;
    var i = 0;
    
    brickTexture = loadTexture(gl, 'brickTexture.jpeg');
    // brickTexture2 = loadTexture(gl, 'cubetexture.png');

    brickTexture2 = loadTexture(gl, 'metalTexture.jpeg');

    for(;i<tunnelN;i++)
    {
        // wall[i] = createPolyhedron(n,radius,depth,-2*i*depth);
        wall[i] = new Polyhedron(n,radius,depth,-2*i*depth);
        // wall[i] = wall[i].createShape;
        wallBuffers[i] = wall[i].createBuffers;
        // wallBuffers[i] = initBuffers(gl,wall[i]);
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
        for(var l=0;l<wall.length;l++)
        {
            if(mode == 1)
            {
                drawScene(gl, programInfo, wallBuffers[l], brickTexture, deltaTime, gMat.projectionMatrix, gMat.modelViewMatrix, gMat.normalMatrix);
            }
            else
            {
                coldrawScene(gl, colprogramInfo, wallBuffers[l],  deltaTime, gMat.projectionMatrix, gMat.modelViewMatrix, gMat.normalMatrix);
            }

        }
        if(-wall[0].zoffset < covDis)
        {
            wall.shift();
            wallBuffers.shift();
            var last = new Polyhedron(n, radius, depth, -2*(k++)*depth);
            // var last = createPolyhedron(n,radius,depth, -2*(k++)*depth);
            wall.push(last);
            // console.log(i);
            wallBuffers.push(last.createBuffers);
            if(k%10 == 0)
            {
                
                rot = Math.random()*3;
                rotSpeed = Math.random()*0.05;
                // obs = createObstacle(n, radius, 0.5, -covDis-15);
                if(k%20 == 0)
                {
                    obs  = new Obstacle2(n, radius, 0.5, -covDis-15, 0, rotSpeed);
                    obs2  = new Obstacle2(n, radius, 0.5, -covDis-15, 0+Math.PI/2, rotSpeed);
                    obstac.push(obs);
                    obstac.push(obs2);
                    // obstacBuffers.push(initBuffers(gl, obs));
                    obstacBuffers.push(obs.createBuffers);
                    obstacBuffers.push(obs2.createBuffers);
                }
                else
                {
                    obs  = new Obstacle(n, radius, 0.5, -covDis-15, rot, rotSpeed);
                    obstac.push(obs);
                    obstacBuffers.push(obs.createBuffers);
                }
                while(-obstac[0].zoffset < covDis) {
                    obstac.shift();
                    obstacBuffers.shift();
                }
            }
            
            if(k%20 == 0)
            {
                if(tileColors.length == 8)
                {
                    tileColors = [
                        [1.0, 1.0, 1.0, 1.0],
                        [0.0, 0.0, 0.0, 1.0],
                    ]
                }
                else if (tileColors.length == 2) {
                    tileColors = [
                        [0.2, 0.2, 1.0, 1.0],    // blue
                        [0.6, 0.7, 0.8, 1.0],    // red
                        [0.1, 1.0, 0.1, 1.0],    // green
                        [1.0, 0.7, 0.2, 1.0],    // orange
                        [0.5, 0.1, 0.5, 1.0],    // dark purple
                        [1.0, 1.0, 0.0, 1.0],    // yellow
                        [1.0, 0.0, 1.0, 1.0],    // purple
                        [0.2, 1.0, 1.0, 1.0],    // turqoise
                    ]
                }
            }
        }
        for(var i= 0;i<obstac.length;i++)
        {
            // console.log(obstac[i].rot);
            var obsModelViewMatrix = mat4.create();
            mat4.rotate(obsModelViewMatrix,  // destination matrix
                    gMat.modelViewMatrix,  // matrix to rotate
                    // obsRotation,
                    obstac[i].rot,     // amount to rotate in radians
                    [0, 0, 1]);       // axis to rotate around (Z)
            // console.log(obstac[i].rotSpeed);
            obstac[i].rot += obstac[i].rotSpeed;
            if (obstac[i].rot > 2 * Math.PI) {
                obstac[i].rot -= 2 * Math.PI;
            }
            if (obstac[i].rot < 0) {
                obstac[i].rot += 2 * Math.PI;
            }
            if(mode == 1)
            {
                drawScene(gl, programInfo, obstacBuffers[i], brickTexture2, deltaTime, gMat.projectionMatrix, obsModelViewMatrix,gMat.normalMatrix);
            }
            else
            {
                coldrawScene(gl, colprogramInfo, obstacBuffers[i],  deltaTime, gMat.projectionMatrix, obsModelViewMatrix,gMat.normalMatrix);
            }
            if(Math.abs(-covDis - obstac[i].zoffset) < 0.02  && Math.abs(tileRotation - obstac[i].collrot) < Math.PI)
            {
                console.log("collision");
            }
            // console.log(covDis);
            // console.log(i,obstac[i].zoffset);
        }

        requestAnimationFrame(render);
        
        covDis += gameSpeed;
        currPos.z = covDis;
        // obsRotation -= gameSpeed/3;
        // console.log(tileRotation);
        if (left == 1) {
            tileRotation += 2*deltaTime;
            left = 0;
        }
        if (right == 1) {
            tileRotation -= 2*deltaTime;
            right = 0;
        }
        if(tileRotation > 2 * Math.PI)
        {
            tileRotation -= 2*Math.PI;
        }
        if (tileRotation < 0) {
            tileRotation += 2 * Math.PI;
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
        document.getElementById('score').innerHTML=Math.floor(covDis);
        if(covDis > levelScore && gameSpeed < 0.2)
        {
            levelScore += 50;
            gameSpeed=gameSpeed + 0.05;
        }
    }
    requestAnimationFrame(render);
}


