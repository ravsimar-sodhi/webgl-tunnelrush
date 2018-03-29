function Polyhedron(n,radius,depth,zoffset)
{
    this.n = n;
    this.radius = radius;
    this.depth = depth;
    this.zoffset = zoffset;
    this.createShape = createPolyhedron(this.n, this.radius, this.depth,  this.zoffset);
    this.createBuffers = initPolyhedronBuffers(gl, this.createShape);
    return this;
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
    var normals = [];
    // normals = positions;
    var k = 0;
    var angle = Math.PI/n;
    for (var i = 0; i < n; i++) {
        normals[k++] = Math.cos(angle);
        normals[k++] = Math.sin(angle);
        // normals[k++] = zoffset;
        normals[k++] = 0;

        normals[k++] = Math.cos(angle);
        normals[k++] = Math.sin(angle);
        // normals[k++] = zoffset;
        normals[k++] = 0;
        
        angle += (2* Math.PI)/n;

        normals[k++] = Math.cos(angle);
        normals[k++] = Math.sin(angle);
        // normals[k++] = zoffset;
        normals[k++] = 0;
        
        normals[k++] = Math.cos(angle);
        normals[k++] = Math.sin(angle);
        // normals[k++] = zoffset;
        normals[k++] = 0;
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
   
    /* var faceColors = [];
    for(var i=0;i<n;i++)
    {
        faceColors[i] = tileColors[Math.floor(Math.random()*n)];
    } */
    return {
        // 'faceColors': faceColors,
        'colNumComponents': 4,
        'posNumComponents': 3,
        'vertexCount': 48,
        'positions': positions,
        'normals': normals,
        'indices': indices,
        'zoffset': zoffset,
    }
}
function initPolyhedronBuffers(gl, shape) {
    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    indexBuffer = gl.createBuffer();
    textureBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();

    // Create a buffer for the cube's vertex positions.
    var positions = shape.positions;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    var normals = shape.normals;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // Convert the array of colors into a table for all the vertices.

    /*  var colors = [];
     var faceColors = shape.faceColors;
 
     for (var j = 0; j < faceColors.length; ++j) {
         const c = faceColors[j];
         // Repeat each color four times for the four vertices of the face
         colors = colors.concat(c, c, c, c);
     }
 
     gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); */

    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    var textureCoordinates = [];
    var k = 0;
    for (var i = 0; i < shape.indices.length / 3; i++) {
        textureCoordinates[k++] = 0.0;
        textureCoordinates[k++] = 0.0;

        textureCoordinates[k++] = 1.0;
        textureCoordinates[k++] = 0.0;

        textureCoordinates[k++] = 1.0;
        textureCoordinates[k++] = 1.0;

        textureCoordinates[k++] = 0.0;
        textureCoordinates[k++] = 1.0;
    }


    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
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
        // color: colorBuffer,
        position: positionBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        texture: textureBuffer,
        vertexCount: shape.vertexCount,
        posNumComponents: shape.posNumComponents,
        colNumComponents: shape.colNumComponents,
    };
}
