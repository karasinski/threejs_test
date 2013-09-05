window.onload = function() {

  //General

  // if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

  var container, stats;
  var camera, scene, renderer;
  var projector, plane, cube;
  var mouse2D, mouse3D, raycaster,
  rollOveredFace, isShiftDown = false, isCtrlDown = false,
  radious = 1400, phi = 60, theta = 45;

  var rollOverMesh, rollOverMaterial;
  var voxelPosition = new THREE.Vector3(), tmpVec = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  var cubeGeo, cubeMaterial, color = [0xFEB74C, 0x4E46B1, 0x33A982], current_color = color[0];
  var i, intersector, objectHovered;

  (function() {
    color_el = document.getElementById("color");
    current_color_hex = '#' + Math.floor(current_color).toString(16);
    color_el.style.backgroundColor = current_color_hex;
    color_el.innerHTML = current_color_hex;
  })()

  if (docCookies.getItem("map") != null) {
    var map = JSON.parse(docCookies.getItem("map"));
  } else {
    var map = [];
  }

  init();
  animate();

  function init() {
    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.y = radious * Math.sin( phi * Math.PI / 360 );

    scene = new THREE.Scene();

    // roll-over helpers
    rollOverGeo = new THREE.CubeGeometry( 50, 50, 50 );
    rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    rollOverMesh.position.y = 1000;
    scene.add( rollOverMesh );

    // cubes
    cubeGeo = new THREE.CubeGeometry( 50, 50, 50 );
    cubeMaterial = new THREE.MeshLambertMaterial( { color: current_color, ambient: current_color, shading: THREE.FlatShading } );
    document.getElementById("color").style.backgroundColor = '#' + Math.floor(current_color).toString(16);

    // picking
    projector = new THREE.Projector();

    // grid
    var size = 500, step = 50;
    var geometry = new THREE.Geometry();

    for ( var i = - size; i <= size; i += step ) {
      geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
      geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );

      geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
      geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
    }

    var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2 } );

    var line = new THREE.Line( geometry, material );
    line.type = THREE.LinePieces;
    scene.add( line );

    plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
    plane.rotation.x = - Math.PI / 2;
    plane.visible = true;
    scene.add( plane );

    mouse2D = new THREE.Vector3( 0, 10000, 0.5 );

    // Add our old cubes before we bring the lights up.
    add_old_cubes();

    // Lights
    var ambientLight = new THREE.AmbientLight( 0x606060 );
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );

    container.appendChild( renderer.domElement );

    // stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild( stats.domElement );

    document.getElementById("delete").addEventListener("click", deleteCookie, false);
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'keydown', onDocumentKeyDown, false );
    document.addEventListener( 'keyup', onDocumentKeyUp, false );
    document.addEventListener( 'mousewheel', onDocumentMouseWheel, false );
    window.addEventListener( 'resize', onWindowResize, false );
  }

  function add_old_cubes() {
    if (docCookies.getItem("map") != null) {
      console.log('you got dat cookie');
      var temp_map = JSON.parse(docCookies.getItem("map"));

      for (var i = 0; i < temp_map.length; i++) {
        var old_color = temp_map[i].color            
        var oldCubeMaterial = new THREE.MeshLambertMaterial( 
          { color: old_color, ambient: old_color, shading: THREE.FlatShading } );
        var oldCubeGeo = new THREE.CubeGeometry( 50, 50, 50 );
        var cube = new THREE.Mesh( oldCubeGeo, oldCubeMaterial );

        cube.position.x = temp_map[i].position.x;
        cube.position.y = temp_map[i].position.y;
        cube.position.z = temp_map[i].position.z;
        cube.uuid = temp_map[i].id;

        scene.add( cube );
      }
    }
  }

  function getRealIntersector( intersects ) {
    for( i = 0; i < intersects.length; i++ ) {
      intersector = intersects[ i ];

      if ( intersector.object != rollOverMesh ) {
        return intersector;
      }
    }
    return null;
  }

  function setVoxelPosition( intersector ) {
    normalMatrix.getNormalMatrix( intersector.object.matrixWorld );

    if (intersector.face) {
      tmpVec.copy( intersector.face.normal );
      tmpVec.applyMatrix3( normalMatrix ).normalize();
      voxelPosition.addVectors( intersector.point, tmpVec );

      voxelPosition.x = Math.floor( voxelPosition.x / 50 ) * 50 + 25;
      voxelPosition.y = Math.floor( voxelPosition.y / 50 ) * 50 + 25;
      voxelPosition.z = Math.floor( voxelPosition.z / 50 ) * 50 + 25;          
    }
  }

  function animate() {
    requestAnimationFrame( animate );
    render();
    // stats.update();
  }

  function render() {

    if ( objectHovered ) {
      objectHovered.material.opacity = 1;
      objectHovered.material.transparent = false;
      objectHovered = null;
    }

    if ( isShiftDown ) {
      theta += mouse2D.x * 3;
    }

    raycaster = projector.pickingRay( mouse2D.clone(), camera );
    var intersects = raycaster.intersectObjects( scene.children );

    if ( intersects.length > 0 ) {
      intersector = getRealIntersector( intersects );

      if ( intersector ) {
        setVoxelPosition( intersector );
        if (!isCtrlDown) {
          rollOverMesh.position = voxelPosition;
        } else {
          if ( intersector.object.geometry.faces.length == 12 ) {
            rollOverMesh.position.z = 10000;

            objectHovered = intersector.object;
            objectHovered.material.opacity = 0.5;
            objectHovered.material.transparent = true;
          }
        }
      }
    }

    camera.position.x = radious * Math.sin( THREE.Math.degToRad( theta ) );
    camera.position.z = radious * Math.cos( THREE.Math.degToRad( theta ) );

    camera.lookAt( scene.position );
    renderer.render( scene, camera );
  }

  Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  };

  function colorPicker(char) {
    if (char == 1 || char == 2 || char == 3) {
      current_color = color[char - 1];

      cubeMaterial = new THREE.MeshLambertMaterial( { color: current_color, ambient: current_color, shading: THREE.FlatShading } );
      color_el = document.getElementById("color");
      current_color_hex = '#' + Math.floor(current_color).toString(16);
      color_el.style.backgroundColor = current_color_hex;
      color_el.innerHTML = current_color_hex;
    }
  }

  function deleteCube() {
    if ( intersector.object != plane ) {
      scene.remove( intersector.object );
      handleCookie(map, intersector);
    }
  }

  function createCube(intersects) {
    intersector = getRealIntersector( intersects );
    setVoxelPosition( intersector );
    var cubeGeo = new THREE.CubeGeometry( 50, 50, 50 );
    var cubeMaterial = new THREE.MeshLambertMaterial( { color: current_color, ambient: current_color, shading: THREE.FlatShading } );

    var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
    voxel.position.copy( voxelPosition );

    voxel.matrixAutoUpdate = false;
    voxel.updateMatrix();
    scene.add( voxel );

    handleCookie(map, intersector, voxel);
  }

  //Key presses, mouse clicks

  function getChar(event) {
    if (event.which == null) {
      return String.fromCharCode(event.keyCode)
    } else if (event.which!=0 && event.charCode!=0) {
      return String.fromCharCode(event.which)
    } else {
      return null
    }
  }

  document.onkeypress = function(event) {
    var char = getChar(event || window.event)
    if (!char) return
      colorPicker(char);
  }

  function onDocumentKeyDown( event ) {
    switch( event.keyCode ) {
      case 16: isShiftDown = true; break;
      case 17: isCtrlDown = true; break;
    }
  }

  function onDocumentKeyUp( event ) {
    switch ( event.keyCode ) {
      case 16: isShiftDown = false; break;
      case 17: isCtrlDown = false; break;
    }
  }

  function onDocumentMouseWheel( event ) {
    radious -= event.wheelDeltaY;

    camera.position.x = radious * Math.sin( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 );
    camera.position.y = radious * Math.sin( phi * Math.PI / 360 );
    camera.position.z = radious * Math.cos( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 );
    camera.updateMatrix();

    render();
  }

  function onDocumentMouseMove( event ) {
    event.preventDefault();

    mouse2D.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse2D.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  }

  function onDocumentMouseDown( event ) {
    event.preventDefault();
    var intersects = raycaster.intersectObjects( scene.children );

    if ( intersects.length > 0 ) {
      if ( isCtrlDown ) {
        deleteCube();
      } else {
        createCube(intersects);
      }
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }
}
