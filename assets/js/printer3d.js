( function () {

	// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
	//
	//    Orbit - left mouse / touch: one-finger move
	//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
	//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

	const _changeEvent = {
		type: 'change'
	};
	const _startEvent = {
		type: 'start'
	};
	const _endEvent = {
		type: 'end'
	};

	class OrbitControls extends THREE.EventDispatcher {

		constructor( object, domElement ) {

			super();
			if ( domElement === undefined ) console.warn( 'THREE.OrbitControls: The second parameter "domElement" is now mandatory.' );
			if ( domElement === document ) console.error( 'THREE.OrbitControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.' );
			this.object = object;
			this.domElement = domElement; // Set to false to disable this control

			this.enabled = true; // "target" sets the location of focus, where the object orbits around

			this.target = new THREE.Vector3(); // How far you can dolly in and out ( PerspectiveCamera only )

			this.minDistance = 0;
			this.maxDistance = Infinity; // How far you can zoom in and out ( OrthographicCamera only )

			this.minZoom = 0;
			this.maxZoom = Infinity; // How far you can orbit vertically, upper and lower limits.
			// Range is 0 to Math.PI radians.

			this.minPolarAngle = 0; // radians

			this.maxPolarAngle = Math.PI; // radians
			// How far you can orbit horizontally, upper and lower limits.
			// If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )

			this.minAzimuthAngle = - Infinity; // radians

			this.maxAzimuthAngle = Infinity; // radians
			// Set to true to enable damping (inertia)
			// If damping is enabled, you must call controls.update() in your animation loop

			this.enableDamping = false;
			this.dampingFactor = 0.05; // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
			// Set to false to disable zooming

			this.enableZoom = true;
			this.zoomSpeed = 1.0; // Set to false to disable rotating

			this.enableRotate = true;
			this.rotateSpeed = 1.0; // Set to false to disable panning

			this.enablePan = true;
			this.panSpeed = 1.0;
			this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up

			this.keyPanSpeed = 7.0; // pixels moved per arrow key push
			// Set to true to automatically rotate around the target
			// If auto-rotate is enabled, you must call controls.update() in your animation loop

			this.autoRotate = false;
			this.autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60
			// The four arrow keys

			this.keys = {
				LEFT: 'ArrowLeft',
				UP: 'ArrowUp',
				RIGHT: 'ArrowRight',
				BOTTOM: 'ArrowDown'
			}; // Mouse buttons

			this.mouseButtons = {
				LEFT: THREE.MOUSE.ROTATE,
				MIDDLE: THREE.MOUSE.DOLLY,
				RIGHT: THREE.MOUSE.PAN
			}; // Touch fingers

			this.touches = {
				ONE: THREE.TOUCH.ROTATE,
				TWO: THREE.TOUCH.DOLLY_PAN
			}; // for reset

			this.target0 = this.target.clone();
			this.position0 = this.object.position.clone();
			this.zoom0 = this.object.zoom; // the target DOM element for key events

			this._domElementKeyEvents = null; //
			// public methods
			//

			this.getPolarAngle = function () {

				return spherical.phi;

			};

			this.getAzimuthalAngle = function () {

				return spherical.theta;

			};

			this.listenToKeyEvents = function ( domElement ) {

				domElement.addEventListener( 'keydown', onKeyDown );
				this._domElementKeyEvents = domElement;

			};

			this.saveState = function () {

				scope.target0.copy( scope.target );
				scope.position0.copy( scope.object.position );
				scope.zoom0 = scope.object.zoom;

			};

			this.reset = function () {

				scope.target.copy( scope.target0 );
				scope.object.position.copy( scope.position0 );
				scope.object.zoom = scope.zoom0;
				scope.object.updateProjectionMatrix();
				scope.dispatchEvent( _changeEvent );
				scope.update();
				state = STATE.NONE;

			}; // this method is exposed, but perhaps it would be better if we can make it private...


			this.update = function () {

				const offset = new THREE.Vector3(); // so camera.up is the orbit axis

				const quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
				const quatInverse = quat.clone().invert();
				const lastPosition = new THREE.Vector3();
				const lastQuaternion = new THREE.Quaternion();
				const twoPI = 2 * Math.PI;
				return function update() {

					const position = scope.object.position;
					offset.copy( position ).sub( scope.target ); // rotate offset to "y-axis-is-up" space

					offset.applyQuaternion( quat ); // angle from z-axis around y-axis

					spherical.setFromVector3( offset );

					if ( scope.autoRotate && state === STATE.NONE ) {

						rotateLeft( getAutoRotationAngle() );

					}

					if ( scope.enableDamping ) {

						spherical.theta += sphericalDelta.theta * scope.dampingFactor;
						spherical.phi += sphericalDelta.phi * scope.dampingFactor;

					} else {

						spherical.theta += sphericalDelta.theta;
						spherical.phi += sphericalDelta.phi;

					} // restrict theta to be between desired limits


					let min = scope.minAzimuthAngle;
					let max = scope.maxAzimuthAngle;

					if ( isFinite( min ) && isFinite( max ) ) {

						if ( min < - Math.PI ) min += twoPI; else if ( min > Math.PI ) min -= twoPI;
						if ( max < - Math.PI ) max += twoPI; else if ( max > Math.PI ) max -= twoPI;

						if ( min <= max ) {

							spherical.theta = Math.max( min, Math.min( max, spherical.theta ) );

						} else {

							spherical.theta = spherical.theta > ( min + max ) / 2 ? Math.max( min, spherical.theta ) : Math.min( max, spherical.theta );

						}

					} // restrict phi to be between desired limits


					spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );
					spherical.makeSafe();
					spherical.radius *= scale; // restrict radius to be between desired limits

					spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) ); // move target to panned location

					if ( scope.enableDamping === true ) {

						scope.target.addScaledVector( panOffset, scope.dampingFactor );

					} else {

						scope.target.add( panOffset );

					}

					offset.setFromSpherical( spherical ); // rotate offset back to "camera-up-vector-is-up" space

					offset.applyQuaternion( quatInverse );
					position.copy( scope.target ).add( offset );
					scope.object.lookAt( scope.target );

					if ( scope.enableDamping === true ) {

						sphericalDelta.theta *= 1 - scope.dampingFactor;
						sphericalDelta.phi *= 1 - scope.dampingFactor;
						panOffset.multiplyScalar( 1 - scope.dampingFactor );

					} else {

						sphericalDelta.set( 0, 0, 0 );
						panOffset.set( 0, 0, 0 );

					}

					scale = 1; // update condition is:
					// min(camera displacement, camera rotation in radians)^2 > EPS
					// using small-angle approximation cos(x/2) = 1 - x^2 / 8

					if ( zoomChanged || lastPosition.distanceToSquared( scope.object.position ) > EPS || 8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

						scope.dispatchEvent( _changeEvent );
						lastPosition.copy( scope.object.position );
						lastQuaternion.copy( scope.object.quaternion );
						zoomChanged = false;
						return true;

					}

					return false;

				};

			}();

			this.dispose = function () {

				scope.domElement.removeEventListener( 'contextmenu', onContextMenu );
				scope.domElement.removeEventListener( 'pointerdown', onPointerDown );
				scope.domElement.removeEventListener( 'wheel', onMouseWheel );
				scope.domElement.removeEventListener( 'touchstart', onTouchStart );
				scope.domElement.removeEventListener( 'touchend', onTouchEnd );
				scope.domElement.removeEventListener( 'touchmove', onTouchMove );
				scope.domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
				scope.domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

				if ( scope._domElementKeyEvents !== null ) {

					scope._domElementKeyEvents.removeEventListener( 'keydown', onKeyDown );

				} //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

			}; //
			// internals
			//


			const scope = this;
			const STATE = {
				NONE: - 1,
				ROTATE: 0,
				DOLLY: 1,
				PAN: 2,
				TOUCH_ROTATE: 3,
				TOUCH_PAN: 4,
				TOUCH_DOLLY_PAN: 5,
				TOUCH_DOLLY_ROTATE: 6
			};
			let state = STATE.NONE;
			const EPS = 0.000001; // current position in spherical coordinates

			const spherical = new THREE.Spherical();
			const sphericalDelta = new THREE.Spherical();
			let scale = 1;
			const panOffset = new THREE.Vector3();
			let zoomChanged = false;
			const rotateStart = new THREE.Vector2();
			const rotateEnd = new THREE.Vector2();
			const rotateDelta = new THREE.Vector2();
			const panStart = new THREE.Vector2();
			const panEnd = new THREE.Vector2();
			const panDelta = new THREE.Vector2();
			const dollyStart = new THREE.Vector2();
			const dollyEnd = new THREE.Vector2();
			const dollyDelta = new THREE.Vector2();

			function getAutoRotationAngle() {

				return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

			}

			function getZoomScale() {

				return Math.pow( 0.95, scope.zoomSpeed );

			}

			function rotateLeft( angle ) {

				sphericalDelta.theta -= angle;

			}

			function rotateUp( angle ) {

				sphericalDelta.phi -= angle;

			}

			const panLeft = function () {

				const v = new THREE.Vector3();
				return function panLeft( distance, objectMatrix ) {

					v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix

					v.multiplyScalar( - distance );
					panOffset.add( v );

				};

			}();

			const panUp = function () {

				const v = new THREE.Vector3();
				return function panUp( distance, objectMatrix ) {

					if ( scope.screenSpacePanning === true ) {

						v.setFromMatrixColumn( objectMatrix, 1 );

					} else {

						v.setFromMatrixColumn( objectMatrix, 0 );
						v.crossVectors( scope.object.up, v );

					}

					v.multiplyScalar( distance );
					panOffset.add( v );

				};

			}(); // deltaX and deltaY are in pixels; right and down are positive


			const pan = function () {

				const offset = new THREE.Vector3();
				return function pan( deltaX, deltaY ) {

					const element = scope.domElement;

					if ( scope.object.isPerspectiveCamera ) {

						// perspective
						const position = scope.object.position;
						offset.copy( position ).sub( scope.target );
						let targetDistance = offset.length(); // half of the fov is center to top of screen

						targetDistance *= Math.tan( scope.object.fov / 2 * Math.PI / 180.0 ); // we use only clientHeight here so aspect ratio does not distort speed

						panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
						panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

					} else if ( scope.object.isOrthographicCamera ) {

						// orthographic
						panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
						panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

					} else {

						// camera neither orthographic nor perspective
						console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
						scope.enablePan = false;

					}

				};

			}();

			function dollyOut( dollyScale ) {

				if ( scope.object.isPerspectiveCamera ) {

					scale /= dollyScale;

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
					scope.object.updateProjectionMatrix();
					zoomChanged = true;

				} else {

					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
					scope.enableZoom = false;

				}

			}

			function dollyIn( dollyScale ) {

				if ( scope.object.isPerspectiveCamera ) {

					scale *= dollyScale;

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
					scope.object.updateProjectionMatrix();
					zoomChanged = true;

				} else {

					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
					scope.enableZoom = false;

				}

			} //
			// event callbacks - update the object state
			//


			function handleMouseDownRotate( event ) {

				rotateStart.set( event.clientX, event.clientY );

			}

			function handleMouseDownDolly( event ) {

				dollyStart.set( event.clientX, event.clientY );

			}

			function handleMouseDownPan( event ) {

				panStart.set( event.clientX, event.clientY );

			}

			function handleMouseMoveRotate( event ) {

				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
				const element = scope.domElement;
				rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

				rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );
				rotateStart.copy( rotateEnd );
				scope.update();

			}

			function handleMouseMoveDolly( event ) {

				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					dollyOut( getZoomScale() );

				} else if ( dollyDelta.y < 0 ) {

					dollyIn( getZoomScale() );

				}

				dollyStart.copy( dollyEnd );
				scope.update();

			}

			function handleMouseMovePan( event ) {

				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
				pan( panDelta.x, panDelta.y );
				panStart.copy( panEnd );
				scope.update();

			}

			function handleMouseUp( ) { // no-op
			}

			function handleMouseWheel( event ) {

				if ( event.deltaY < 0 ) {

					dollyIn( getZoomScale() );

				} else if ( event.deltaY > 0 ) {

					dollyOut( getZoomScale() );

				}

				scope.update();

			}

			function handleKeyDown( event ) {

				let needsUpdate = false;

				switch ( event.code ) {

					case scope.keys.UP:
						pan( 0, scope.keyPanSpeed );
						needsUpdate = true;
						break;

					case scope.keys.BOTTOM:
						pan( 0, - scope.keyPanSpeed );
						needsUpdate = true;
						break;

					case scope.keys.LEFT:
						pan( scope.keyPanSpeed, 0 );
						needsUpdate = true;
						break;

					case scope.keys.RIGHT:
						pan( - scope.keyPanSpeed, 0 );
						needsUpdate = true;
						break;

				}

				if ( needsUpdate ) {

					// prevent the browser from scrolling on cursor keys
					event.preventDefault();
					scope.update();

				}

			}

			function handleTouchStartRotate( event ) {

				if ( event.touches.length == 1 ) {

					rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					rotateStart.set( x, y );

				}

			}

			function handleTouchStartPan( event ) {

				if ( event.touches.length == 1 ) {

					panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					panStart.set( x, y );

				}

			}

			function handleTouchStartDolly( event ) {

				const dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				const dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				const distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );

			}

			function handleTouchStartDollyPan( event ) {

				if ( scope.enableZoom ) handleTouchStartDolly( event );
				if ( scope.enablePan ) handleTouchStartPan( event );

			}

			function handleTouchStartDollyRotate( event ) {

				if ( scope.enableZoom ) handleTouchStartDolly( event );
				if ( scope.enableRotate ) handleTouchStartRotate( event );

			}

			function handleTouchMoveRotate( event ) {

				if ( event.touches.length == 1 ) {

					rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					rotateEnd.set( x, y );

				}

				rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
				const element = scope.domElement;
				rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

				rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );
				rotateStart.copy( rotateEnd );

			}

			function handleTouchMovePan( event ) {

				if ( event.touches.length == 1 ) {

					panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					panEnd.set( x, y );

				}

				panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
				pan( panDelta.x, panDelta.y );
				panStart.copy( panEnd );

			}

			function handleTouchMoveDolly( event ) {

				const dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				const dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				const distance = Math.sqrt( dx * dx + dy * dy );
				dollyEnd.set( 0, distance );
				dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );
				dollyOut( dollyDelta.y );
				dollyStart.copy( dollyEnd );

			}

			function handleTouchMoveDollyPan( event ) {

				if ( scope.enableZoom ) handleTouchMoveDolly( event );
				if ( scope.enablePan ) handleTouchMovePan( event );

			}

			function handleTouchMoveDollyRotate( event ) {

				if ( scope.enableZoom ) handleTouchMoveDolly( event );
				if ( scope.enableRotate ) handleTouchMoveRotate( event );

			}

			function handleTouchEnd( ) { // no-op
			} //
			// event handlers - FSM: listen for events and reset state
			//


			function onPointerDown( event ) {

				if ( scope.enabled === false ) return;

				switch ( event.pointerType ) {

					case 'mouse':
					case 'pen':
						onMouseDown( event );
						break;
        // TODO touch

				}

			}

			function onPointerMove( event ) {

				if ( scope.enabled === false ) return;

				switch ( event.pointerType ) {

					case 'mouse':
					case 'pen':
						onMouseMove( event );
						break;
        // TODO touch

				}

			}

			function onPointerUp( event ) {

				switch ( event.pointerType ) {

					case 'mouse':
					case 'pen':
						onMouseUp( event );
						break;
        // TODO touch

				}

			}

			function onMouseDown( event ) {

				// Prevent the browser from scrolling.
				event.preventDefault(); // Manually set the focus since calling preventDefault above
				// prevents the browser from setting it automatically.

				scope.domElement.focus ? scope.domElement.focus() : window.focus();
				let mouseAction;

				switch ( event.button ) {

					case 0:
						mouseAction = scope.mouseButtons.LEFT;
						break;

					case 1:
						mouseAction = scope.mouseButtons.MIDDLE;
						break;

					case 2:
						mouseAction = scope.mouseButtons.RIGHT;
						break;

					default:
						mouseAction = - 1;

				}

				switch ( mouseAction ) {

					case THREE.MOUSE.DOLLY:
						if ( scope.enableZoom === false ) return;
						handleMouseDownDolly( event );
						state = STATE.DOLLY;
						break;

					case THREE.MOUSE.ROTATE:
						if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

							if ( scope.enablePan === false ) return;
							handleMouseDownPan( event );
							state = STATE.PAN;

						} else {

							if ( scope.enableRotate === false ) return;
							handleMouseDownRotate( event );
							state = STATE.ROTATE;

						}

						break;

					case THREE.MOUSE.PAN:
						if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

							if ( scope.enableRotate === false ) return;
							handleMouseDownRotate( event );
							state = STATE.ROTATE;

						} else {

							if ( scope.enablePan === false ) return;
							handleMouseDownPan( event );
							state = STATE.PAN;

						}

						break;

					default:
						state = STATE.NONE;

				}

				if ( state !== STATE.NONE ) {

					scope.domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove );
					scope.domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp );
					scope.dispatchEvent( _startEvent );

				}

			}

			function onMouseMove( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault();

				switch ( state ) {

					case STATE.ROTATE:
						if ( scope.enableRotate === false ) return;
						handleMouseMoveRotate( event );
						break;

					case STATE.DOLLY:
						if ( scope.enableZoom === false ) return;
						handleMouseMoveDolly( event );
						break;

					case STATE.PAN:
						if ( scope.enablePan === false ) return;
						handleMouseMovePan( event );
						break;

				}

			}

			function onMouseUp( event ) {

				scope.domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
				scope.domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );
				if ( scope.enabled === false ) return;
				handleMouseUp( event );
				scope.dispatchEvent( _endEvent );
				state = STATE.NONE;

			}

			function onMouseWheel( event ) {

				if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE ) return;
				event.preventDefault();
				scope.dispatchEvent( _startEvent );
				handleMouseWheel( event );
				scope.dispatchEvent( _endEvent );

			}

			function onKeyDown( event ) {

				if ( scope.enabled === false || scope.enablePan === false ) return;
				handleKeyDown( event );

			}

			function onTouchStart( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault(); // prevent scrolling

				switch ( event.touches.length ) {

					case 1:
						switch ( scope.touches.ONE ) {

							case THREE.TOUCH.ROTATE:
								if ( scope.enableRotate === false ) return;
								handleTouchStartRotate( event );
								state = STATE.TOUCH_ROTATE;
								break;

							case THREE.TOUCH.PAN:
								if ( scope.enablePan === false ) return;
								handleTouchStartPan( event );
								state = STATE.TOUCH_PAN;
								break;

							default:
								state = STATE.NONE;

						}

						break;

					case 2:
						switch ( scope.touches.TWO ) {

							case THREE.TOUCH.DOLLY_PAN:
								if ( scope.enableZoom === false && scope.enablePan === false ) return;
								handleTouchStartDollyPan( event );
								state = STATE.TOUCH_DOLLY_PAN;
								break;

							case THREE.TOUCH.DOLLY_ROTATE:
								if ( scope.enableZoom === false && scope.enableRotate === false ) return;
								handleTouchStartDollyRotate( event );
								state = STATE.TOUCH_DOLLY_ROTATE;
								break;

							default:
								state = STATE.NONE;

						}

						break;

					default:
						state = STATE.NONE;

				}

				if ( state !== STATE.NONE ) {

					scope.dispatchEvent( _startEvent );

				}

			}

			function onTouchMove( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault(); // prevent scrolling

				switch ( state ) {

					case STATE.TOUCH_ROTATE:
						if ( scope.enableRotate === false ) return;
						handleTouchMoveRotate( event );
						scope.update();
						break;

					case STATE.TOUCH_PAN:
						if ( scope.enablePan === false ) return;
						handleTouchMovePan( event );
						scope.update();
						break;

					case STATE.TOUCH_DOLLY_PAN:
						if ( scope.enableZoom === false && scope.enablePan === false ) return;
						handleTouchMoveDollyPan( event );
						scope.update();
						break;

					case STATE.TOUCH_DOLLY_ROTATE:
						if ( scope.enableZoom === false && scope.enableRotate === false ) return;
						handleTouchMoveDollyRotate( event );
						scope.update();
						break;

					default:
						state = STATE.NONE;

				}

			}

			function onTouchEnd( event ) {

				if ( scope.enabled === false ) return;
				handleTouchEnd( event );
				scope.dispatchEvent( _endEvent );
				state = STATE.NONE;

			}

			function onContextMenu( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault();

			} //


			scope.domElement.addEventListener( 'contextmenu', onContextMenu );
			scope.domElement.addEventListener( 'pointerdown', onPointerDown );
			scope.domElement.addEventListener( 'wheel', onMouseWheel, {
				passive: false
			} );
			scope.domElement.addEventListener( 'touchstart', onTouchStart, {
				passive: false
			} );
			scope.domElement.addEventListener( 'touchend', onTouchEnd );
			scope.domElement.addEventListener( 'touchmove', onTouchMove, {
				passive: false
			} ); // force an update at start

			this.update();

		}

	} // This set of controls performs orbiting, dollying (zooming), and panning.
	// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
	// This is very similar to OrbitControls, another set of touch behavior
	//
	//    Orbit - right mouse, or left mouse + ctrl/meta/shiftKey / touch: two-finger rotate
	//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
	//    Pan - left mouse, or arrow keys / touch: one-finger move


	class MapControls extends OrbitControls {

		constructor( object, domElement ) {

			super( object, domElement );
			this.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up

			this.mouseButtons.LEFT = THREE.MOUSE.PAN;
			this.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
			this.touches.ONE = THREE.TOUCH.PAN;
			this.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

		}

	}

	THREE.MapControls = MapControls;
	THREE.OrbitControls = OrbitControls;

} )();

( function () {

	/**
 * https://github.com/google/model-viewer/blob/master/packages/model-viewer/src/three-components/EnvironmentScene.ts
 */

	class RoomEnvironment extends THREE.Scene {

		constructor() {

			super();
			const geometry = new THREE.BoxGeometry();
			geometry.deleteAttribute( 'uv' );
			const roomMaterial = new THREE.MeshStandardMaterial( {
				side: THREE.BackSide
			} );
			const boxMaterial = new THREE.MeshStandardMaterial();
			const mainLight = new THREE.PointLight( 0xffffff, 5.0, 28, 2 );
			mainLight.position.set( 0.418, 16.199, 0.300 );
			this.add( mainLight );
			const room = new THREE.Mesh( geometry, roomMaterial );
			room.position.set( - 0.757, 13.219, 0.717 );
			room.scale.set( 31.713, 28.305, 28.591 );
			this.add( room );
			const box1 = new THREE.Mesh( geometry, boxMaterial );
			box1.position.set( - 10.906, 2.009, 1.846 );
			box1.rotation.set( 0, - 0.195, 0 );
			box1.scale.set( 2.328, 7.905, 4.651 );
			this.add( box1 );
			const box2 = new THREE.Mesh( geometry, boxMaterial );
			box2.position.set( - 5.607, - 0.754, - 0.758 );
			box2.rotation.set( 0, 0.994, 0 );
			box2.scale.set( 1.970, 1.534, 3.955 );
			this.add( box2 );
			const box3 = new THREE.Mesh( geometry, boxMaterial );
			box3.position.set( 6.167, 0.857, 7.803 );
			box3.rotation.set( 0, 0.561, 0 );
			box3.scale.set( 3.927, 6.285, 3.687 );
			this.add( box3 );
			const box4 = new THREE.Mesh( geometry, boxMaterial );
			box4.position.set( - 2.017, 0.018, 6.124 );
			box4.rotation.set( 0, 0.333, 0 );
			box4.scale.set( 2.002, 4.566, 2.064 );
			this.add( box4 );
			const box5 = new THREE.Mesh( geometry, boxMaterial );
			box5.position.set( 2.291, - 0.756, - 2.621 );
			box5.rotation.set( 0, - 0.286, 0 );
			box5.scale.set( 1.546, 1.552, 1.496 );
			this.add( box5 );
			const box6 = new THREE.Mesh( geometry, boxMaterial );
			box6.position.set( - 2.193, - 0.369, - 5.547 );
			box6.rotation.set( 0, 0.516, 0 );
			box6.scale.set( 3.875, 3.487, 2.986 );
			this.add( box6 ); // -x right

			const light1 = new THREE.Mesh( geometry, createAreaLightMaterial( 50 ) );
			light1.position.set( - 16.116, 14.37, 8.208 );
			light1.scale.set( 0.1, 2.428, 2.739 );
			this.add( light1 ); // -x left

			const light2 = new THREE.Mesh( geometry, createAreaLightMaterial( 50 ) );
			light2.position.set( - 16.109, 18.021, - 8.207 );
			light2.scale.set( 0.1, 2.425, 2.751 );
			this.add( light2 ); // +x

			const light3 = new THREE.Mesh( geometry, createAreaLightMaterial( 17 ) );
			light3.position.set( 14.904, 12.198, - 1.832 );
			light3.scale.set( 0.15, 4.265, 6.331 );
			this.add( light3 ); // +z

			const light4 = new THREE.Mesh( geometry, createAreaLightMaterial( 43 ) );
			light4.position.set( - 0.462, 8.89, 14.520 );
			light4.scale.set( 4.38, 5.441, 0.088 );
			this.add( light4 ); // -z

			const light5 = new THREE.Mesh( geometry, createAreaLightMaterial( 20 ) );
			light5.position.set( 3.235, 11.486, - 12.541 );
			light5.scale.set( 2.5, 2.0, 0.1 );
			this.add( light5 ); // +y

			const light6 = new THREE.Mesh( geometry, createAreaLightMaterial( 100 ) );
			light6.position.set( 0.0, 20.0, 0.0 );
			light6.scale.set( 1.0, 0.1, 1.0 );
			this.add( light6 );

		}

	}

	function createAreaLightMaterial( intensity ) {

		const material = new THREE.MeshBasicMaterial();
		material.color.setScalar( intensity );
		return material;

	}

	THREE.RoomEnvironment = RoomEnvironment;

} )();

( function () {

	const _tempNormal = new THREE.Vector3();

	function getUv( faceDirVector, normal, uvAxis, projectionAxis, radius, sideLength ) {

		const totArcLength = 2 * Math.PI * radius / 4; // length of the planes between the arcs on each axis

		const centerLength = Math.max( sideLength - 2 * radius, 0 );
		const halfArc = Math.PI / 4; // Get the vector projected onto the Y plane

		_tempNormal.copy( normal );

		_tempNormal[ projectionAxis ] = 0;

		_tempNormal.normalize(); // total amount of UV space alloted to a single arc


		const arcUvRatio = 0.5 * totArcLength / ( totArcLength + centerLength ); // the distance along one arc the point is at

		const arcAngleRatio = 1.0 - _tempNormal.angleTo( faceDirVector ) / halfArc;

		if ( Math.sign( _tempNormal[ uvAxis ] ) === 1 ) {

			return arcAngleRatio * arcUvRatio;

		} else {

			// total amount of UV space alloted to the plane between the arcs
			const lenUv = centerLength / ( totArcLength + centerLength );
			return lenUv + arcUvRatio + arcUvRatio * ( 1.0 - arcAngleRatio );

		}

	}

	class RoundedBoxGeometry extends THREE.BoxGeometry {

		constructor( width = 1, height = 1, depth = 1, segments = 2, radius = 0.1 ) {

			// ensure segments is odd so we have a plane connecting the rounded corners
			segments = segments * 2 + 1; // ensure radius isn't bigger than shortest side

			radius = Math.min( width / 2, height / 2, depth / 2, radius );
			super( 1, 1, 1, segments, segments, segments ); // if we just have one segment we're the same as a regular box

			if ( segments === 1 ) return;
			const geometry2 = this.toNonIndexed();
			this.index = null;
			this.attributes.position = geometry2.attributes.position;
			this.attributes.normal = geometry2.attributes.normal;
			this.attributes.uv = geometry2.attributes.uv; //

			const position = new THREE.Vector3();
			const normal = new THREE.Vector3();
			const box = new THREE.Vector3( width, height, depth ).divideScalar( 2 ).subScalar( radius );
			const positions = this.attributes.position.array;
			const normals = this.attributes.normal.array;
			const uvs = this.attributes.uv.array;
			const faceTris = positions.length / 6;
			const faceDirVector = new THREE.Vector3();
			const halfSegmentSize = 0.5 / segments;

			for ( let i = 0, j = 0; i < positions.length; i += 3, j += 2 ) {

				position.fromArray( positions, i );
				normal.copy( position );
				normal.x -= Math.sign( normal.x ) * halfSegmentSize;
				normal.y -= Math.sign( normal.y ) * halfSegmentSize;
				normal.z -= Math.sign( normal.z ) * halfSegmentSize;
				normal.normalize();
				positions[ i + 0 ] = box.x * Math.sign( position.x ) + normal.x * radius;
				positions[ i + 1 ] = box.y * Math.sign( position.y ) + normal.y * radius;
				positions[ i + 2 ] = box.z * Math.sign( position.z ) + normal.z * radius;
				normals[ i + 0 ] = normal.x;
				normals[ i + 1 ] = normal.y;
				normals[ i + 2 ] = normal.z;
				const side = Math.floor( i / faceTris );

				switch ( side ) {

					case 0:
						// right
						// generate UVs along Z then Y
						faceDirVector.set( 1, 0, 0 );
						uvs[ j + 0 ] = getUv( faceDirVector, normal, 'z', 'y', radius, depth );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'z', radius, height );
						break;

					case 1:
						// left
						// generate UVs along Z then Y
						faceDirVector.set( - 1, 0, 0 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'z', 'y', radius, depth );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'z', radius, height );
						break;

					case 2:
						// top
						// generate UVs along X then Z
						faceDirVector.set( 0, 1, 0 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'x', 'z', radius, width );
						uvs[ j + 1 ] = getUv( faceDirVector, normal, 'z', 'x', radius, depth );
						break;

					case 3:
						// bottom
						// generate UVs along X then Z
						faceDirVector.set( 0, - 1, 0 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'x', 'z', radius, width );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'z', 'x', radius, depth );
						break;

					case 4:
						// front
						// generate UVs along X then Y
						faceDirVector.set( 0, 0, 1 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'x', 'y', radius, width );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'x', radius, height );
						break;

					case 5:
						// back
						// generate UVs along X then Y
						faceDirVector.set( 0, 0, - 1 );
						uvs[ j + 0 ] = getUv( faceDirVector, normal, 'x', 'y', radius, width );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'x', radius, height );
						break;

				}

			}

		}

	}

	THREE.RoundedBoxGeometry = RoundedBoxGeometry;

} )();

// Printer model for the opening sequence and the printer explorer.
// A hand-built reconstruction of the Bambu Lab H2S from its published outer size
// (about 492 x 514 x 626 mm) and the parts named on Bambu Lab's "H2S introduction" page.
// It is not Bambu Lab's engineering model. One unit is 10 cm.
(function () {
  "use strict";
  var T = window.THREE;
  var IDS = ["frame", "top", "door", "gantry", "toolhead", "bed", "screws", "screen", "key"];

  function supported() {
    if (!T) return false;
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
  }
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function create(canvas, opts) {
    opts = opts || {};
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    var scene = new T.Scene();
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    var camera = new T.PerspectiveCamera(30, 1, 0.1, 200);
    var root = new T.Group();
    scene.add(root);

    var small = Math.min(window.innerWidth, window.innerHeight) < 600;
    var key = new T.DirectionalLight(0xffffff, 2.0);
    key.position.set(7, 12, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 11; key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1; key.shadow.camera.far = 40; key.shadow.bias = -0.0004; key.shadow.radius = 4;
    scene.add(key);
    var rim = new T.DirectionalLight(0xbfe6d2, 1.6);
    rim.position.set(-9, 6, -10);
    scene.add(rim);
    var chamber = new T.PointLight(0xfff1dc, 3.2, 9, 2);
    chamber.position.set(0, 5.6, 1.2);
    root.add(chamber);

    var floor = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: opts.hero ? 0.55 : 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.085; floor.receiveShadow = true;
    scene.add(floor);

    // ---- materials (a fresh one per part so a highlight never leaks)
    var mats = [];
    function mat(kind) {
      var m;
      if (kind === "shell") m = new T.MeshStandardMaterial({ color: 0x17191b, metalness: 0.55, roughness: 0.46 });
      else if (kind === "panel") m = new T.MeshStandardMaterial({ color: 0x121416, metalness: 0.4, roughness: 0.6 });
      else if (kind === "plastic") m = new T.MeshStandardMaterial({ color: 0x0f1113, metalness: 0.1, roughness: 0.58 });
      else if (kind === "steel") m = new T.MeshStandardMaterial({ color: 0xd3d8dc, metalness: 1, roughness: 0.18 });
      else if (kind === "alu") m = new T.MeshStandardMaterial({ color: 0x8b9298, metalness: 0.9, roughness: 0.38 });
      else if (kind === "belt") m = new T.MeshStandardMaterial({ color: 0x08090a, metalness: 0, roughness: 0.92 });
      else if (kind === "plate") m = new T.MeshStandardMaterial({ color: 0x9c7a2a, metalness: 0.65, roughness: 0.52 });
      else if (kind === "brass") m = new T.MeshStandardMaterial({ color: 0xb08a3c, metalness: 1, roughness: 0.3 });
      else if (kind === "rubber") m = new T.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0, roughness: 0.95 });
      else if (kind === "green") m = new T.MeshStandardMaterial({ color: 0x00ae42, metalness: 0.2, roughness: 0.45, emissive: 0x00ae42, emissiveIntensity: 0.25 });
      else if (kind === "display") m = new T.MeshStandardMaterial({ color: 0x05080a, metalness: 0.2, roughness: 0.08, emissive: 0x1c6f52, emissiveIntensity: 0.9 });
      else if (kind === "glass") m = new T.MeshPhysicalMaterial({ color: 0xb9cdc8, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.14, side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03 });
      if (kind !== "glass" && kind !== "steel" && kind !== "brass") m.envMapIntensity = 0.55;
      m.userData.base = { emissive: m.emissive ? m.emissive.getHex() : 0, intensity: m.emissiveIntensity || 0, opacity: m.opacity };
      mats.push(m);
      return m;
    }

    var parts = {};
    function part(id, order) {
      var g = new T.Group();
      g.userData = { id: id, order: order, pieces: [], mats: {} };
      parts[id] = g;
      root.add(g);
      return g;
    }
    function pm(g, kind) { return g.userData.mats[kind] || (g.userData.mats[kind] = mat(kind)); }
    // Add a piece. off = how far it travels when the printer is pulled apart; rot = how far it turns.
    function piece(g, mesh, off, rot, pivot) {
      var holder = new T.Group();
      if (pivot) { holder.position.set(pivot[0], pivot[1], pivot[2]); mesh.position.sub(holder.position); }
      holder.add(mesh);
      holder.userData = { home: holder.position.clone(), off: new T.Vector3(off[0], off[1], off[2]), rot: rot || [0, 0, 0] };
      mesh.traverse(function (o) { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = !o.material.transparent; } });
      g.add(holder); g.userData.pieces.push(holder);
      return holder;
    }
    function rbox(w, h, d, r, m, x, y, z) {
      var rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
      var mesh = new T.Mesh(rr > 0.004 ? new T.RoundedBoxGeometry(w, h, d, 3, rr) : new T.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z); return mesh;
    }
    function cyl(r, h, m, x, y, z, axis, seg) {
      var mesh = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 28), m);
      if (axis === "x") mesh.rotation.z = Math.PI / 2;
      if (axis === "z") mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z); return mesh;
    }
    function group() { var g = new T.Group(); for (var i = 0; i < arguments.length; i++) g.add(arguments[i]); return g; }

    var W = 4.92, D = 5.14, H = 6.26, BASE = 0.78, POST = 0.36, RING = 0.3;
    var inH = H - BASE - RING;           // open height between the base and the top ring
    var midY = BASE + inH / 2;

    // ---- frame and enclosure
    var frame = part("frame", 0);
    piece(frame, rbox(W, BASE, D, 0.09, pm(frame, "shell"), 0, BASE / 2, 0), [0, 0, 0]);
    piece(frame, rbox(W - 0.5, 0.03, D - 0.5, 0, pm(frame, "panel"), 0, BASE + 0.015, 0), [0, 0, 0]);
    var feet = new T.Group();
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { feet.add(cyl(0.2, 0.09, pm(frame, "rubber"), sx * (W / 2 - 0.45), -0.04, sz * (D / 2 - 0.45))); }); });
    piece(frame, feet, [0, 0, 0]);
    var posts = new T.Group();
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { posts.add(rbox(POST, inH, POST, 0.06, pm(frame, "shell"), sx * (W / 2 - POST / 2), midY, sz * (D / 2 - POST / 2))); }); });
    piece(frame, posts, [0, 0, 0]);
    var ring = group(
      rbox(W, RING, POST, 0.06, pm(frame, "shell"), 0, H - RING / 2, D / 2 - POST / 2),
      rbox(W, RING, POST, 0.06, pm(frame, "shell"), 0, H - RING / 2, -(D / 2 - POST / 2)),
      rbox(POST, RING, D, 0.06, pm(frame, "shell"), W / 2 - POST / 2, H - RING / 2, 0),
      rbox(POST, RING, D, 0.06, pm(frame, "shell"), -(W / 2 - POST / 2), H - RING / 2, 0));
    piece(frame, ring, [0, 0, 0]);
    // Side and back panels slide outwards when the printer is pulled apart.
    piece(frame, rbox(0.07, inH, D - 2 * POST, 0.02, pm(frame, "panel"), -(W / 2 - 0.05), midY, 0), [-1.9, 0, 0]);
    piece(frame, rbox(0.07, inH, D - 2 * POST, 0.02, pm(frame, "panel"), W / 2 - 0.05, midY, 0), [1.9, 0, 0]);
    var back = group(rbox(W - 2 * POST, inH, 0.07, 0.02, pm(frame, "panel"), 0, midY, -(D / 2 - 0.05)));
    var fan = new T.Mesh(new T.TorusGeometry(0.42, 0.045, 10, 40), pm(frame, "plastic")); fan.position.set(1.2, H - 1.25, -(D / 2 + 0.0));
    back.add(fan, cyl(0.4, 0.03, pm(frame, "rubber"), 1.2, H - 1.25, -(D / 2 - 0.01), "z"), cyl(0.1, 0.05, pm(frame, "plastic"), 1.2, H - 1.25, -(D / 2 + 0.01), "z"));
    for (var s = 0; s < 6; s++) { var spoke = rbox(0.78, 0.03, 0.03, 0, pm(frame, "plastic"), 1.2, H - 1.25, -(D / 2 + 0.02)); spoke.rotation.z = (s * Math.PI) / 6; back.add(spoke); }
    back.add(rbox(0.62, 0.38, 0.06, 0.03, pm(frame, "plastic"), -1.55, BASE + 0.45, -(D / 2 + 0.01)));
    piece(frame, back, [0, 0, -2.6]);

    // ---- top cover: glass in a slim surround
    var top = part("top", 1);
    var lid = group(rbox(W - 0.2, 0.06, D - 0.2, 0.02, pm(top, "glass"), 0, H + 0.07, 0));
    [[W - 0.12, 0.1, 0.16, 0, D / 2 - 0.14], [W - 0.12, 0.1, 0.16, 0, -(D / 2 - 0.14)], [0.16, 0.1, D - 0.12, W / 2 - 0.14, 0], [0.16, 0.1, D - 0.12, -(W / 2 - 0.14), 0]].forEach(function (b) {
      lid.add(rbox(b[0], b[1], b[2], 0.04, pm(top, "plastic"), b[3], H + 0.07, b[4]));
    });
    piece(top, lid, [0, 2.3, -0.3], [-0.16, 0, 0]);

    // ---- front door: glass, surround and handle, hinged on the right
    var door = part("door", 2);
    var dw = W - 2 * POST + 0.2, dh = inH - 0.06, dz = D / 2 + 0.03;
    var leaf = group(rbox(dw, dh, 0.06, 0.02, pm(door, "glass"), 0, midY, dz));
    [[dw, 0.14, 0, midY + dh / 2 - 0.07], [dw, 0.14, 0, midY - dh / 2 + 0.07]].forEach(function (b) { leaf.add(rbox(b[0], b[1], 0.09, 0.03, pm(door, "plastic"), b[2], b[3], dz)); });
    [-1, 1].forEach(function (sx) { leaf.add(rbox(0.14, dh, 0.09, 0.03, pm(door, "plastic"), sx * (dw / 2 - 0.07), midY, dz)); });
    leaf.add(rbox(0.07, 1.5, 0.12, 0.03, pm(door, "steel"), -(dw / 2 - 0.3), midY + 0.2, dz + 0.1));
    piece(door, leaf, [0.5, 0, 2.3], [0, -0.55, 0], [dw / 2, midY, dz]);

    // ---- CoreXY motion system
    var gantry = part("gantry", 3);
    var gy = H - RING - 0.42, railX = W / 2 - POST - 0.22, railLen = D - 2 * POST - 0.5;
    var gx = group();
    [-1, 1].forEach(function (sx) {
      gx.add(cyl(0.055, railLen, pm(gantry, "steel"), sx * railX, gy, 0, "z"));
      gx.add(cyl(0.055, railLen, pm(gantry, "steel"), sx * railX, gy - 0.24, 0, "z"));
      gx.add(rbox(0.46, 0.5, 0.46, 0.05, pm(gantry, "plastic"), sx * railX, gy - 0.18, -(railLen / 2 + 0.05)));
      gx.add(cyl(0.11, 0.14, pm(gantry, "steel"), sx * railX, gy + 0.14, -(railLen / 2 + 0.05)));
      gx.add(cyl(0.09, 0.1, pm(gantry, "steel"), sx * railX, gy + 0.12, railLen / 2 + 0.02));
      gx.add(rbox(0.03, 0.07, railLen, 0, pm(gantry, "belt"), sx * (railX + 0.1), gy + 0.12, 0));
      gx.add(rbox(0.3, 0.36, 0.42, 0.05, pm(gantry, "plastic"), sx * railX, gy - 0.12, 0.45));
    });
    gx.add(rbox(2 * railX, 0.2, 0.26, 0.04, pm(gantry, "alu"), 0, gy - 0.12, 0.45));
    gx.add(cyl(0.04, 2 * railX - 0.3, pm(gantry, "steel"), 0, gy + 0.03, 0.45, "x"));
    gx.add(rbox(2 * railX, 0.07, 0.03, 0, pm(gantry, "belt"), 0, gy + 0.12, 0.33));
    piece(gantry, gx, [0, 1.25, 0]);

    // ---- tool head
    var toolhead = part("toolhead", 4);
    var tx = 0.55, tz = 0.82;
    var th = group(
      rbox(0.66, 0.92, 0.6, 0.08, pm(toolhead, "plastic"), tx, gy - 0.34, tz),
      rbox(0.6, 0.62, 0.05, 0.02, pm(toolhead, "shell"), tx, gy - 0.3, tz + 0.31),
      rbox(0.3, 0.03, 0.06, 0, pm(toolhead, "green"), tx, gy - 0.02, tz + 0.32),
      cyl(0.17, 0.05, pm(toolhead, "rubber"), tx, gy - 0.42, tz + 0.33, "z"),
      rbox(0.24, 0.24, 0.24, 0.02, pm(toolhead, "alu"), tx, gy - 0.9, tz),
      rbox(0.2, 0.12, 0.2, 0.01, pm(toolhead, "steel"), tx, gy - 1.06, tz));
    var nozzle = new T.Mesh(new T.ConeGeometry(0.07, 0.14, 20), pm(toolhead, "brass")); nozzle.rotation.x = Math.PI; nozzle.position.set(tx, gy - 1.18, tz);
    th.add(nozzle);
    piece(toolhead, th, [0, 1.25, 2.1]);

    // ---- heatbed and build plate
    var bed = part("bed", 5);
    var by = 3.0;
    var slab = group(rbox(3.7, 0.12, 3.5, 0.03, pm(bed, "panel"), 0, by, 0.1), rbox(3.9, 0.1, 0.3, 0.03, pm(bed, "alu"), 0, by - 0.13, -1.45), rbox(0.3, 0.1, 3.3, 0.03, pm(bed, "alu"), -1.7, by - 0.13, 0.1), rbox(0.3, 0.1, 3.3, 0.03, pm(bed, "alu"), 1.7, by - 0.13, 0.1));
    piece(bed, slab, [0, -0.25, 1.7]);
    var plate = group(rbox(3.56, 0.035, 3.36, 0.012, pm(bed, "plate"), 0, by + 0.08, 0.1), rbox(0.5, 0.035, 0.16, 0.012, pm(bed, "plate"), 1.2, by + 0.08, 1.84));
    piece(bed, plate, [0, 0.55, 1.7]);

    // ---- Z axis: three lead screws with their guide rods
    var screws = part("screws", 6);
    var zs = group();
    [[-2.02, -1.5], [2.02, -1.5], [0, 2.0]].forEach(function (p) {
      zs.add(cyl(0.05, inH - 0.5, pm(screws, "steel"), p[0], midY - 0.2, p[1] * 0.93, "y", 16));
      zs.add(cyl(0.1, 0.16, pm(screws, "brass"), p[0], by - 0.2, p[1] * 0.93));
      zs.add(cyl(0.13, 0.12, pm(screws, "plastic"), p[0], BASE + 0.07, p[1] * 0.93));
    });
    [-1, 1].forEach(function (sx) { zs.add(cyl(0.06, inH - 0.5, pm(screws, "steel"), sx * 1.6, midY - 0.2, -1.62)); });
    piece(screws, zs, [0, 0, -1.6]);

    // ---- touchscreen on the top front edge
    var screen = part("screen", 7);
    var scr = group(rbox(1.32, 0.86, 0.1, 0.05, pm(screen, "plastic"), 0, 0, 0));
    var glassFace = new T.Mesh(new T.PlaneGeometry(1.16, 0.7), pm(screen, "display")); glassFace.position.z = 0.052; scr.add(glassFace);
    scr.rotation.x = -0.5; scr.position.set(1.5, H + 0.12, D / 2 - 0.2);
    piece(screen, scr, [0.9, 0.5, 2.6]);

    // ---- safety key on the back
    var keyPart = part("key", 8);
    piece(keyPart, group(rbox(0.34, 0.22, 0.2, 0.04, pm(keyPart, "green"), -1.6, BASE + 1.0, -(D / 2 + 0.12)), rbox(0.2, 0.1, 0.12, 0.02, pm(keyPart, "steel"), -1.6, BASE + 1.0, -(D / 2 + 0.02))), [0, 0, -3.1]);

    // ---- state
    var explode = 0, selected = null, exposure = 1;
    var accent = new T.Color(0x0b9a4a);
    function applyExplode() {
      IDS.forEach(function (id) {
        var g = parts[id], e = smooth(g.userData.order * 0.055, g.userData.order * 0.055 + 0.56, explode);
        g.userData.pieces.forEach(function (h) {
          h.position.copy(h.userData.home).addScaledVector(h.userData.off, e);
          h.rotation.set(h.userData.rot[0] * e, h.userData.rot[1] * e, h.userData.rot[2] * e);
        });
      });
    }
    function paint() {
      IDS.forEach(function (id) {
        var on = id === selected, g = parts[id];
        Object.keys(g.userData.mats).forEach(function (k) {
          var m = g.userData.mats[k], b = m.userData.base;
          if (on) { m.emissive.copy(accent); m.emissiveIntensity = k === "glass" ? 0.5 : 0.75; if (k === "glass") m.opacity = 0.34; }
          else { m.emissive.setHex(b.emissive); m.emissiveIntensity = b.intensity; m.opacity = b.opacity; }
        });
      });
    }
    var tmp = new T.Vector3(), box = new T.Box3();
    var api = {
      ids: IDS, camera: camera, scene: scene, root: root, renderer: renderer,
      setExplode: function (e) { explode = e; applyExplode(); },
      getExplode: function () { return explode; },
      setYaw: function (y) { root.rotation.y = y; },
      setExposure: function (x) { exposure = x; renderer.toneMappingExposure = x; },
      select: function (id) { selected = id; paint(); },
      selected: function () { return selected; },
      resize: function (w, h) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      },
      // Screen position (CSS pixels) of the middle of a part.
      project: function (id, w, h) {
        box.setFromObject(parts[id]); box.getCenter(tmp); tmp.project(camera);
        return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
      },
      pick: function (nx, ny) {
        var ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(nx, ny), camera);
        var hits = ray.intersectObjects(root.children, true);
        var hit = hits.filter(function (hh) { return !hh.object.material.transparent; })[0] || hits[0];
        var n = hit && hit.object;
        while (n && !(n.userData && n.userData.id)) n = n.parent;
        return n ? n.userData.id : null;
      },
      render: function () { renderer.render(scene, camera); }
    };
    applyExplode();
    return api;
  }

  // The printer explorer page: orbit, zoom, pick a part, pull apart, reset.
  function mountExplorer() {
    var canvas = document.getElementById("explorer-canvas");
    var stage = canvas && canvas.parentElement;
    var label = document.getElementById("explorer-label");
    var fallback = document.getElementById("explorer-fallback");
    var status = document.getElementById("part-status");
    var explodeButton = document.getElementById("explode-toggle");
    var resetButton = document.getElementById("reset-view");
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".part-button"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || !stage || !explodeButton || !resetButton || canvas.dataset.mounted) return false;
    var p;
    try { if (!supported()) throw new Error("no webgl"); p = create(canvas, {}); } catch (e) {
      canvas.hidden = true; explodeButton.hidden = true; resetButton.hidden = true; if (fallback) fallback.hidden = false; return false;
    }
    canvas.dataset.mounted = "1";
    var HOME = new T.Vector3(11.5, 8.2, 16.5), TARGET = new T.Vector3(0, 3.3, 0.2);
    p.camera.position.copy(HOME);
    var controls = new T.OrbitControls(p.camera, canvas);
    controls.target.copy(TARGET); controls.enablePan = false; controls.enableDamping = true;
    controls.minDistance = 8; controls.maxDistance = 40; controls.maxPolarAngle = Math.PI * 0.55;
    var target = 0, value = 0, dirty = true;

    function select(id, announce) {
      var next = id === p.selected() ? null : id;
      p.select(next);
      buttons.forEach(function (b) { var on = b.dataset.part === next; b.setAttribute("aria-pressed", on ? "true" : "false"); b.parentElement.classList.toggle("is-selected", on); });
      var active = buttons.filter(function (b) { return b.dataset.part === next; })[0];
      if (label) { label.hidden = !active; label.textContent = active ? active.textContent : ""; }
      if (status && announce !== false) { var text = active ? document.getElementById("part-" + next) : null; status.textContent = active ? active.textContent + ". " + (text ? text.textContent : "") : "No part selected."; }
      dirty = true;
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.part); }); });
    function setExplode(on) {
      target = on ? 1 : 0;
      explodeButton.setAttribute("aria-pressed", on ? "true" : "false");
      explodeButton.textContent = on ? "Put the printer back together" : "Pull the parts apart";
      if (reduce.matches) value = target;
      dirty = true;
    }
    explodeButton.addEventListener("click", function () { setExplode(!target); });
    resetButton.addEventListener("click", function () { setExplode(false); p.camera.position.copy(HOME); controls.target.copy(TARGET); if (p.selected()) select(p.selected(), false); dirty = true; });
    var down = null;
    canvas.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; });
    canvas.addEventListener("pointerup", function (e) {
      if (!down) return; var moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved > 6) return;
      var r = canvas.getBoundingClientRect(), id = p.pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (id) select(id);
    });
    controls.addEventListener("change", function () { dirty = true; });
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      p.camera.fov = w < 520 ? 44 : 30; p.resize(w, h); dirty = true;
    }
    window.addEventListener("resize", resize); resize();
    function place() {
      if (!label || label.hidden || !p.selected()) return;
      var pt = p.project(p.selected(), stage.clientWidth, stage.clientHeight);
      label.style.transform = "translate(" + Math.round(Math.min(Math.max(pt.x, 70), stage.clientWidth - 70)) + "px," + Math.round(Math.max(pt.y - 16, 28)) + "px) translate(-50%,-100%)";
    }
    (function loop() {
      if (Math.abs(value - target) > 0.001) { value += (target - value) * 0.09; dirty = true; } else if (value !== target) { value = target; dirty = true; }
      if (controls.update()) dirty = true;
      if (dirty && stage.clientWidth) { p.setExplode(value); p.render(); place(); dirty = false; }
      window.requestAnimationFrame(loop);
    })();
    window.__explorerReady = true;
    return true;
  }

  window.PIRPrinter = { supported: supported, create: create, mountExplorer: mountExplorer, ids: IDS };
  if (document.getElementById("explorer-canvas") && !document.getElementById("guide")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountExplorer); else mountExplorer();
  }
})();
