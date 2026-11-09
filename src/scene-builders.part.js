  _createTrack3D() {
    const trackRadius = 35;
    const trackLength = 50;

    // Stadium curve path
    class StadiumCurve extends THREE.Curve {
      constructor(radius, length) {
        super();
        this.radius = radius;
        this.length = length;
        this.arcLength = Math.PI * radius;
        this.straightLength = length;
        this.totalLength = (2 * this.arcLength) + (2 * this.straightLength);
      }
      getPoint(t, optionalTarget = new THREE.Vector3()) {
        let d = t * this.totalLength;
        if (d < this.arcLength) {
          const angle = -Math.PI/2 + (Math.PI * (d / this.arcLength));
          return optionalTarget.set(this.length/2 + this.radius * Math.cos(angle), 0.3, this.radius * Math.sin(angle));
        }
        d -= this.arcLength;
        if (d < this.straightLength) {
          return optionalTarget.set((this.length/2) - d, 0.3, this.radius);
        }
        d -= this.straightLength;
        if (d < this.arcLength) {
          const angle = Math.PI/2 + (Math.PI * (d / this.arcLength));
          return optionalTarget.set(-this.length/2 + this.radius * Math.cos(angle), 0.3, this.radius * Math.sin(angle));
        }
        d -= this.arcLength;
        return optionalTarget.set((-this.length/2) + d, 0.3, -this.radius);
      }
    }

    this._trainPath = new StadiumCurve(trackRadius, trackLength);

    // Ballast
    const ballastGeo = new THREE.TubeGeometry(this._trainPath, 200, 4, 8, true);
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1 });
    const ballast = new THREE.Mesh(ballastGeo, ballastMat);
    ballast.scale.y = 0.15;
    this._scene3d.add(ballast);

    // Rails
    const railOffset = 1.8;
    const railPointsL = [], railPointsR = [];
    for (let i = 0; i <= 300; i++) {
      const t = i / 300;
      const pt = this._trainPath.getPointAt(t);
      const tangent = this._trainPath.getTangentAt(t);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      railPointsL.push(pt.clone().add(normal.clone().multiplyScalar(railOffset)));
      railPointsR.push(pt.clone().add(normal.clone().multiplyScalar(-railOffset)));
    }
    const railCurveL = new THREE.CatmullRomCurve3(railPointsL, true);
    const railCurveR = new THREE.CatmullRomCurve3(railPointsR, true);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.2 });
    const railMeshL = new THREE.Mesh(new THREE.TubeGeometry(railCurveL, 200, 0.25, 6, true), railMat);
    const railMeshR = new THREE.Mesh(new THREE.TubeGeometry(railCurveR, 200, 0.25, 6, true), railMat);
    railMeshL.position.y = 0.4;
    railMeshR.position.y = 0.4;
    this._scene3d.add(railMeshL);
    this._scene3d.add(railMeshR);
  }

  _createTrain3D() {
    this._trainCars = [];

    // Locomotive - elongated Polar Express style
    const locoGroup = new THREE.Group();
    const boilerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.3 });

    // Main frame/chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 16), boilerMat);
    chassis.position.set(0, 1.8, 0);
    locoGroup.add(chassis);

    // Boiler - longer and properly positioned
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 14, 24), boilerMat);
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 4.2, 1.5);
    boiler.castShadow = true;
    locoGroup.add(boiler);

    // Boiler front (smokebox)
    const smokebox = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 2, 24), boilerMat);
    smokebox.rotation.x = Math.PI / 2;
    smokebox.position.set(0, 4.2, 9);
    locoGroup.add(smokebox);

    // Smokebox door
    const smokeboxDoor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    smokeboxDoor.position.set(0, 4.2, 10.1);
    locoGroup.add(smokeboxDoor);

    // Cab - taller and more detailed
    const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 4.5), boilerMat);
    cab.position.set(0, 5, -6);
    cab.castShadow = true;
    locoGroup.add(cab);

    // Cab roof
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.4, 5), boilerMat);
    cabRoof.position.set(0, 8.2, -6);
    locoGroup.add(cabRoof);

    // Cab windows
    const cabWinMat = new THREE.MeshBasicMaterial({ color: 0x334455 });
    const cabWinFront = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2), cabWinMat);
    cabWinFront.position.set(0, 6, -3.7);
    locoGroup.add(cabWinFront);
    for (let s = -1; s <= 1; s += 2) {
      const cabWinSide = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cabWinMat);
      cabWinSide.rotation.y = s * Math.PI / 2;
      cabWinSide.position.set(s * 2.55, 6, -6);
      locoGroup.add(cabWinSide);
    }

    // Smokestack - taller
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.5, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    stack.position.set(0, 7.5, 7);
    locoGroup.add(stack);

    // Steam dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), boilerMat);
    dome.position.set(0, 6.3, 2);
    locoGroup.add(dome);

    // Sand dome
    const sandDome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), boilerMat);
    sandDome.position.set(0, 6.3, -2);
    locoGroup.add(sandDome);

    // Cowcatcher/pilot
    const cowGeo = new THREE.BoxGeometry(3.5, 1.5, 3);
    const cow = new THREE.Mesh(cowGeo, boilerMat);
    cow.position.set(0, 1.2, 10);
    locoGroup.add(cow);
    
    // Pilot bars
    for (let i = -1.2; i <= 1.2; i += 0.4) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8), boilerMat);
      bar.rotation.x = -Math.PI / 4;
      bar.position.set(i, 1, 11.5);
      locoGroup.add(bar);
    }

    // Headlight
    const lightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    lightHousing.rotation.x = Math.PI / 2;
    lightHousing.position.set(0, 7, 9.5);
    locoGroup.add(lightHousing);

    this._headlightBulb = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    this._headlightBulb.position.set(0, 7, 10.2);
    locoGroup.add(this._headlightBulb);

    this._spotlight = new THREE.SpotLight(0xffaa00, 0, 80, Math.PI / 6, 0.5, 1);
    this._spotlight.position.set(0, 7, 10);
    const target = new THREE.Object3D();
    target.position.set(0, 3, 25);
    locoGroup.add(target);
    this._spotlight.target = target;
    locoGroup.add(this._spotlight);

    // Drive wheels - larger
    const driveWheelGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.5, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    for (let z = -1; z <= 6; z += 3.5) {
      for (let s = -1; s <= 1; s += 2) {
        const w = new THREE.Mesh(driveWheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(s * 2.2, 1.8, z);
        locoGroup.add(w);
        // Wheel rim
        const rim = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.1, 8, 24), rimMat);
        rim.rotation.y = Math.PI / 2;
        rim.position.set(s * 2.5, 1.8, z);
        locoGroup.add(rim);
      }
    }

    // Pilot wheels - smaller
    const pilotWheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 16);
    for (let s = -1; s <= 1; s += 2) {
      const pw = new THREE.Mesh(pilotWheelGeo, wheelMat);
      pw.rotation.z = Math.PI / 2;
      pw.position.set(s * 1.8, 0.9, 9);
      locoGroup.add(pw);
    }

    // Connecting rods (simplified)
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });
    for (let s = -1; s <= 1; s += 2) {
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 10), rodMat);
      rod.position.set(s * 2.6, 1.8, 2.5);
      locoGroup.add(rod);
    }

    locoGroup.userData = { isEngine: true };
    this._scene3d.add(locoGroup);
    this._trainCars.push({ mesh: locoGroup, offset: 0 });

    // Tender - longer and more detailed
    const tenderGroup = new THREE.Group();
    const tenderMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    
    // Tender body
    const tenderBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.5, 10), tenderMat);
    tenderBody.position.y = 3.5;
    tenderBody.castShadow = true;
    tenderGroup.add(tenderBody);

    // Coal pile
    const coalGeo = new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    for (let x = -0.8; x <= 0.8; x += 0.8) {
      for (let z = -2; z <= 2; z += 2) {
        const coal = new THREE.Mesh(coalGeo, coalMat);
        coal.position.set(x, 5.8, z);
        coal.scale.set(0.8, 0.5, 0.8);
        tenderGroup.add(coal);
      }
    }

    this._addBogie3D(tenderGroup, -3.5);
    this._addBogie3D(tenderGroup, 3.5);
    this._scene3d.add(tenderGroup);
    this._trainCars.push({ mesh: tenderGroup, offset: 0.045 });

    // Passenger cars
    const isPolarExpress = this._trainModel === 'Polar Express';
    const numCars = isPolarExpress ? 3 : 1;
    
    for (let i = 0; i < numCars; i++) {
      const carGroup = new THREE.Group();
      const carColor = isPolarExpress ? 0x1e3a5f : 0x8B4513;
      
      // Car body - longer
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.5, 14), new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.3 }));
      body.position.y = 3.8;
      body.castShadow = true;
      carGroup.add(body);

      // Roof - rounded
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14.2, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a4a5a }));
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.y = 6.1;
      roof.scale.set(1.4, 1, 1.5);
      carGroup.add(roof);

      // Clerestory (raised center roof section)
      const clerestory = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0x2a3a4a }));
      clerestory.position.y = 7;
      carGroup.add(clerestory);

      // Windows
      const winMat = new THREE.MeshBasicMaterial({ color: isPolarExpress ? 0xffffcc : 0x556677 });
      for (let s = -1; s <= 1; s += 2) {
        for (let w = -5.5; w <= 5.5; w += 2.2) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), winMat);
          win.rotation.y = s * Math.PI / 2;
          win.position.set(s * 2.15, 4.5, w);
          carGroup.add(win);
        }
      }

      // Window stripe (red for Polar Express)
      if (isPolarExpress) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.4, 14.1), new THREE.MeshStandardMaterial({ color: 0x8b0000 }));
        stripe.position.y = 5.5;
        carGroup.add(stripe);
        
        // Gold trim
        const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.15, 14.1), new THREE.MeshStandardMaterial({ color: 0xc9a227 }));
        goldTrim.position.y = 2.2;
        carGroup.add(goldTrim);
      }

      // Vestibules (end platforms)
      const vestMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      for (let z = -1; z <= 1; z += 2) {
        const vest = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4, 0.6), vestMat);
        vest.position.set(0, 3.8, z * 7.3);
        carGroup.add(vest);
      }

      this._addBogie3D(carGroup, -4.5);
      this._addBogie3D(carGroup, 4.5);
      this._scene3d.add(carGroup);
      this._trainCars.push({ mesh: carGroup, offset: 0.095 + (i * 0.048) });
    }
  }

  _addBogie3D(parent, zPos) {
    const bogieGroup = new THREE.Group();
    bogieGroup.position.set(0, 0.8, zPos);
    bogieGroup.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2.5), new THREE.MeshStandardMaterial({ color: 0x111111 })));
    const wGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.25, 16);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [{ x: 1.2, z: -0.8 }, { x: -1.2, z: -0.8 }, { x: 1.2, z: 0.8 }, { x: -1.2, z: 0.8 }].forEach(pos => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(pos.x, 0, pos.z);
      bogieGroup.add(w);
    });
    parent.add(bogieGroup);
  }

  _createMountains3D() {
    
    // Mountain materials - different shades for depth
    const farMountainMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, flatShading: true });
    const midMountainMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, flatShading: true });
    const nearMountainMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, flatShading: true });
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xeef4f8 });

    // Far mountain range (backdrop)
    const farMountains = [
      { x: -180, z: -200, height: 80, width: 60 },
      { x: -120, z: -220, height: 100, width: 70 },
      { x: -60, z: -210, height: 90, width: 65 },
      { x: 0, z: -230, height: 120, width: 80 },
      { x: 60, z: -215, height: 95, width: 68 },
      { x: 120, z: -225, height: 110, width: 75 },
      { x: 180, z: -205, height: 85, width: 62 },
    ];

    farMountains.forEach(m => {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(m.width, m.height, 6),
        farMountainMat
      );
      mountain.position.set(m.x, m.height / 2, m.z);
      mountain.rotation.y = this._rand() * Math.PI;
      this._scene3d.add(mountain);

      // Snow cap
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(m.width * 0.4, m.height * 0.25, 6),
        snowCapMat
      );
      snowCap.position.set(m.x, m.height * 0.75, m.z);
      snowCap.rotation.y = mountain.rotation.y;
      this._scene3d.add(snowCap);
    });

    // Mid-range mountains
    const midMountains = [
      { x: -150, z: -150, height: 55, width: 45 },
      { x: -90, z: -160, height: 65, width: 50 },
      { x: -30, z: -155, height: 60, width: 48 },
      { x: 30, z: -165, height: 70, width: 55 },
      { x: 90, z: -158, height: 58, width: 46 },
      { x: 150, z: -152, height: 52, width: 42 },
    ];

    midMountains.forEach(m => {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(m.width, m.height, 5),
        midMountainMat
      );
      mountain.position.set(m.x, m.height / 2, m.z);
      mountain.rotation.y = this._rand() * Math.PI;
      this._scene3d.add(mountain);

      // Snow cap
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(m.width * 0.35, m.height * 0.2, 5),
        snowCapMat
      );
      snowCap.position.set(m.x, m.height * 0.8, m.z);
      snowCap.rotation.y = mountain.rotation.y;
      this._scene3d.add(snowCap);
    });

    // Near hills (smaller, more detail)
    const nearHills = [
      { x: -120, z: -100, height: 25, width: 30 },
      { x: -70, z: -110, height: 30, width: 35 },
      { x: 70, z: -105, height: 28, width: 32 },
      { x: 130, z: -95, height: 22, width: 28 },
    ];

    nearHills.forEach(m => {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(m.width, m.height, 5),
        nearMountainMat
      );
      hill.position.set(m.x, m.height / 2, m.z);
      hill.rotation.y = this._rand() * Math.PI;
      this._scene3d.add(hill);

      // Light snow dusting
      const snowDust = new THREE.Mesh(
        new THREE.ConeGeometry(m.width * 0.3, m.height * 0.15, 5),
        snowCapMat
      );
      snowDust.position.set(m.x, m.height * 0.85, m.z);
      snowDust.rotation.y = hill.rotation.y;
      this._scene3d.add(snowDust);
    });

    // Side mountains (left and right edges)
    const sideMountains = [
      { x: -200, z: -80, height: 45, width: 40 },
      { x: -210, z: -40, height: 35, width: 32 },
      { x: 200, z: -70, height: 40, width: 38 },
      { x: 205, z: -30, height: 32, width: 30 },
    ];

    sideMountains.forEach(m => {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(m.width, m.height, 5),
        midMountainMat
      );
      mountain.position.set(m.x, m.height / 2, m.z);
      this._scene3d.add(mountain);
    });
  }

  _createTown3D() {
    
    // Building materials
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2d1810, roughness: 0.7 });
    const snowRoofMat = new THREE.MeshStandardMaterial({ color: 0xf0f5f8 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const darkWindowMat = new THREE.MeshBasicMaterial({ color: 0x334455 });

    // Town buildings positioned outside the track on the left side
    const buildings = [
      { x: -75, z: 20, w: 12, h: 14, d: 10, mat: brickMat, roofType: 'peaked' },
      { x: -85, z: 35, w: 10, h: 10, d: 8, mat: woodMat, roofType: 'peaked' },
      { x: -70, z: 45, w: 14, h: 18, d: 12, mat: stoneMat, roofType: 'peaked' },
      { x: -90, z: 55, w: 8, h: 8, d: 8, mat: woodMat, roofType: 'flat' },
      { x: -75, z: 65, w: 11, h: 12, d: 9, mat: brickMat, roofType: 'peaked' },
      // Additional buildings on right side
      { x: 75, z: 20, w: 10, h: 12, d: 9, mat: brickMat, roofType: 'peaked' },
      { x: 85, z: 35, w: 12, h: 15, d: 10, mat: stoneMat, roofType: 'peaked' },
      { x: 70, z: -20, w: 9, h: 10, d: 8, mat: woodMat, roofType: 'peaked' },
      { x: 80, z: -35, w: 11, h: 13, d: 9, mat: brickMat, roofType: 'peaked' },
      // Buildings near station
      { x: -30, z: -75, w: 10, h: 11, d: 8, mat: woodMat, roofType: 'peaked' },
      { x: 30, z: -75, w: 12, h: 14, d: 10, mat: brickMat, roofType: 'peaked' },
      // More scattered buildings
      { x: -95, z: 0, w: 8, h: 9, d: 7, mat: woodMat, roofType: 'flat' },
      { x: -80, z: -15, w: 10, h: 12, d: 8, mat: stoneMat, roofType: 'peaked' },
      { x: 90, z: 0, w: 9, h: 10, d: 8, mat: brickMat, roofType: 'peaked' },
      { x: 95, z: -20, w: 8, h: 8, d: 7, mat: woodMat, roofType: 'flat' },
    ];

    buildings.forEach(b => {
      const building = new THREE.Group();

      // Main structure
      const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), b.mat);
      body.position.y = b.h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      building.add(body);

      // Roof
      if (b.roofType === 'peaked') {
        const roofHeight = b.w * 0.4;
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.75, roofHeight, 4),
          roofMat
        );
        roof.position.y = b.h + roofHeight / 2;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        building.add(roof);

        // Snow on roof
        const snowRoof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.78, roofHeight * 0.3, 4),
          snowRoofMat
        );
        snowRoof.position.y = b.h + roofHeight * 0.7;
        snowRoof.rotation.y = Math.PI / 4;
        building.add(snowRoof);
      } else {
        // Flat roof with snow
        const flatRoof = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.5, 0.5, b.d + 0.5),
          roofMat
        );
        flatRoof.position.y = b.h + 0.25;
        building.add(flatRoof);

        const snowLayer = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.3, 0.4, b.d + 0.3),
          snowRoofMat
        );
        snowLayer.position.y = b.h + 0.7;
        building.add(snowLayer);
      }

      // Windows
      const numWindowsX = Math.floor(b.w / 4);
      const numWindowsY = Math.floor(b.h / 5);
      for (let wy = 0; wy < numWindowsY; wy++) {
        for (let wx = 0; wx < numWindowsX; wx++) {
          const isLit = this._rand() > 0.3;
          const winX = (wx - (numWindowsX - 1) / 2) * 3;
          const winY = 3 + wy * 4;
          
          // Front windows
          const winFront = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 2),
            isLit ? windowMat : darkWindowMat
          );
          winFront.position.set(winX, winY, b.d / 2 + 0.1);
          building.add(winFront);

          // Back windows
          const winBack = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 2),
            isLit ? windowMat : darkWindowMat
          );
          winBack.position.set(winX, winY, -b.d / 2 - 0.1);
          winBack.rotation.y = Math.PI;
          building.add(winBack);
        }
      }

      // Door
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(2, 3.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x3d2817 })
      );
      door.position.set(0, 1.75, b.d / 2);
      building.add(door);

      building.position.set(b.x, 0, b.z);
      this._scene3d.add(building);
    });

    // Church/Chapel with steeple
    const church = new THREE.Group();
    const churchBody = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 20), stoneMat);
    churchBody.position.y = 6;
    churchBody.castShadow = true;
    church.add(churchBody);

    // Church roof
    const churchRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 12, 8, 4),
      roofMat
    );
    churchRoof.position.y = 16;
    churchRoof.rotation.y = Math.PI / 4;
    church.add(churchRoof);

    // Snow on church roof
    const churchSnow = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 12.5, 2, 4),
      snowRoofMat
    );
    churchSnow.position.y = 13;
    churchSnow.rotation.y = Math.PI / 4;
    church.add(churchSnow);

    // Steeple
    const steeple = new THREE.Mesh(new THREE.BoxGeometry(5, 10, 5), stoneMat);
    steeple.position.set(0, 17, -6);
    church.add(steeple);

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 12, 4),
      roofMat
    );
    spire.position.set(0, 28, -6);
    spire.rotation.y = Math.PI / 4;
    church.add(spire);

    // Church windows (stained glass effect)
    const stainedGlassMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
    for (let z = -6; z <= 6; z += 6) {
      const churchWin = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), stainedGlassMat);
      churchWin.position.set(7.1, 6, z);
      churchWin.rotation.y = Math.PI / 2;
      church.add(churchWin);
      
      const churchWin2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), stainedGlassMat);
      churchWin2.position.set(-7.1, 6, z);
      churchWin2.rotation.y = -Math.PI / 2;
      church.add(churchWin2);
    }

    church.position.set(80, 0, 50);
    this._scene3d.add(church);

    // Water tower
    const waterTower = new THREE.Group();
    
    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 15, 8), legMat);
      leg.position.set(Math.cos(angle) * 4, 7.5, Math.sin(angle) * 4);
      waterTower.add(leg);
    }

    // Tank
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 5, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.7 })
    );
    tank.position.y = 18;
    waterTower.add(tank);

    // Conical roof
    const tankRoof = new THREE.Mesh(
      new THREE.ConeGeometry(6.5, 4, 12),
      roofMat
    );
    tankRoof.position.y = 24;
    waterTower.add(tankRoof);

    // Snow on tank roof
    const tankSnow = new THREE.Mesh(
      new THREE.ConeGeometry(6.8, 1, 12),
      snowRoofMat
    );
    tankSnow.position.y = 23;
    waterTower.add(tankSnow);

    waterTower.position.set(70, 0, -70);
    this._scene3d.add(waterTower);

    // Street lamps around town
    const lampPositions = [
      { x: -65, z: 30 },
      { x: -65, z: 50 },
      { x: -65, z: 70 },
      { x: 75, z: 30 },
      { x: 75, z: 70 },
    ];

    lampPositions.forEach(pos => {
      const lamp = new THREE.Group();
      
      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      );
      pole.position.y = 3;
      lamp.add(pole);

      // Lamp housing
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
      );
      housing.position.y = 6.5;
      lamp.add(housing);

      // Glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffcc })
      );
      glow.position.y = 6;
      lamp.add(glow);

      lamp.add(this._glow(0xffd98a, 7, 0, 6, 0, 'lamp'));

      lamp.position.set(pos.x, 0, pos.z);
      this._scene3d.add(lamp);
    });

    // Fence along town edge
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
    for (let z = 15; z <= 75; z += 3) {
      // Fence post
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 0.3), fenceMat);
      post.position.set(-60, 1.25, z);
      this._scene3d.add(post);

      // Horizontal rails
      if (z < 75) {
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), fenceMat);
        rail1.position.set(-60, 0.8, z + 1.5);
        this._scene3d.add(rail1);
        
        const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), fenceMat);
        rail2.position.set(-60, 1.8, z + 1.5);
        this._scene3d.add(rail2);
      }
    }
  }

  _createTrees3D() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1e3612 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Central Christmas tree
    const centerTree = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const s = 1.0 - (i * 0.2);
      const y = i * 5;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(8 * s, 8, 10), leavesMat);
      cone.position.y = y + 4;
      cone.castShadow = true;
      centerTree.add(cone);
      const snow = new THREE.Mesh(new THREE.ConeGeometry(7 * s, 1.5, 10), snowMat);
      snow.position.y = y + 3;
      centerTree.add(snow);
    }
    const star = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5), new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.5 }));
    star.position.y = 22;
    centerTree.add(star);

    // Christmas lights on tree - spiral pattern
    const lightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500];
    this._christmasLights = [];
    for (let layer = 0; layer < 4; layer++) {
      const layerY = layer * 5 + 2;
      const layerRadius = 7 * (1.0 - layer * 0.2);
      const numLights = Math.floor(12 - layer * 2);
      
      for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2 + layer * 0.5;
        const x = Math.cos(angle) * layerRadius;
        const z = Math.sin(angle) * layerRadius;
        
        const lightColor = lightColors[Math.floor(this._rand() * lightColors.length)];
        const lightBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: lightColor })
        );
        lightBulb.position.set(x, layerY, z);
        centerTree.add(lightBulb);
        this._christmasLights.push({ mesh: lightBulb, baseColor: lightColor });
        
        centerTree.add(this._glow(lightColor, 1.8, x, layerY, z, 'bulb'));
      }
    }

    // Additional string of lights going up the tree
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const spiralAngle = t * Math.PI * 6;
      const spiralY = t * 20 + 2;
      const spiralRadius = 7 * (1 - t * 0.7);
      const x = Math.cos(spiralAngle) * spiralRadius;
      const z = Math.sin(spiralAngle) * spiralRadius;
      
      const lightColor = lightColors[i % lightColors.length];
      const lightBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 6, 6),
        new THREE.MeshBasicMaterial({ color: lightColor })
      );
      lightBulb.position.set(x, spiralY, z);
      centerTree.add(lightBulb);
      centerTree.add(this._glow(lightColor, 1.4, x, spiralY, z, 'bulb'));
      this._christmasLights.push({ mesh: lightBulb, baseColor: lightColor });
    }

    this._scene3d.add(centerTree);

    // Surrounding trees
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 60 + this._rand() * 40;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      // Keep the foreground clear: the camera sits at z = 112.
      if (z > 45 && Math.abs(x) < 70) continue;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 3), trunkMat);
      trunk.position.y = 1.5;
      tree.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 8), leavesMat);
      leaves.position.y = 5;
      tree.add(leaves);
      const treeSnow = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.5, 8), snowMat);
      treeSnow.position.y = 7.5;
      tree.add(treeSnow);

      tree.position.set(x, 0, z);
      const s = 0.6 + this._rand() * 0.5;
      tree.scale.set(s, s, s);
      this._scene3d.add(tree);
    }
  }

  _createStation3D() {
    const stationGroup = new THREE.Group();

    // Station building - rustic wooden style
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2d1810, roughness: 0.7 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });

    // Main building
    const building = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 12), wallMat);
    building.position.y = 5;
    building.castShadow = true;
    stationGroup.add(building);

    // Roof
    const roofGeo = new THREE.ConeGeometry(14, 6, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 13;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    stationGroup.add(roof);

    // Snow on roof
    const snowRoof = new THREE.Mesh(new THREE.ConeGeometry(14.5, 1.5, 4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    snowRoof.position.y = 11;
    snowRoof.rotation.y = Math.PI / 4;
    stationGroup.add(snowRoof);

    // Windows (lit)
    for (let x = -5; x <= 5; x += 5) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3), windowMat);
      win.position.set(x, 5, 6.1);
      stationGroup.add(win);
      const winBack = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3), windowMat);
      winBack.position.set(x, 5, -6.1);
      winBack.rotation.y = Math.PI;
      stationGroup.add(winBack);
    }

    // Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 8), new THREE.MeshStandardMaterial({ color: 0x666666 }));
    platform.position.set(0, 0.5, 10);
    platform.receiveShadow = true;
    stationGroup.add(platform);

    // Platform edge (yellow safety line)
    const safetyLine = new THREE.Mesh(new THREE.BoxGeometry(30, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0xFFD700 }));
    safetyLine.position.set(0, 1.05, 13.5);
    stationGroup.add(safetyLine);

    // Lamp posts
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    for (let x = -12; x <= 12; x += 12) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 8, 8), lampMat);
      pole.position.set(x, 4, 12);
      stationGroup.add(pole);
      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), lampMat);
      lampHead.position.set(x, 8.5, 12);
      stationGroup.add(lampHead);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), glowMat);
      glow.position.set(x, 7.5, 12);
      stationGroup.add(glow);
      stationGroup.add(this._glow(0xffd98a, 8, x, 7.5, 12, 'lamp'));
    }

    // Station sign
    const signMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2d });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 0.3), signMat);
    sign.position.set(0, 11, 6.2);
    stationGroup.add(sign);

    // Position station outside the track
    stationGroup.position.set(0, 0, -55);
    this._scene3d.add(stationGroup);

    // Add some benches on platform
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    for (let x = -8; x <= 8; x += 8) {
      const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 1.2), benchMat);
      benchSeat.position.set(x, 1.8, -45);
      this._scene3d.add(benchSeat);
      const benchBack = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 0.2), benchMat);
      benchBack.position.set(x, 2.5, -45.5);
      this._scene3d.add(benchBack);
      // Bench legs
      for (let lx = -1.5; lx <= 1.5; lx += 3) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), benchMat);
        leg.position.set(x + lx, 1, -45);
        this._scene3d.add(leg);
      }
    }

    // Add a few snowmen near the station
    this._createSnowman(-25, -50);
    this._createSnowman(28, -48);
  }

  _createSnowman(x, z) {
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const snowman = new THREE.Group();

    // Body spheres
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), snowMat);
    bottom.position.y = 2.5;
    snowman.add(bottom);

    const middle = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), snowMat);
    middle.position.y = 6;
    snowman.add(middle);

    const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), snowMat);
    head.position.y = 8.5;
    snowman.add(head);

    // Carrot nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), new THREE.MeshStandardMaterial({ color: 0xff6600 }));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 8.5, 1.3);
    snowman.add(nose);

    // Coal eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), eyeMat);
    eyeL.position.set(-0.4, 8.8, 1);
    snowman.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), eyeMat);
    eyeR.position.set(0.4, 8.8, 1);
    snowman.add(eyeR);

    // Top hat
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16), hatMat);
    hatBrim.position.y = 9.5;
    snowman.add(hatBrim);
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.5, 16), hatMat);
    hatTop.position.y = 10.3;
    snowman.add(hatTop);

    // Buttons
    for (let y = 4.5; y <= 6.5; y += 0.8) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), eyeMat);
      button.position.set(0, y, 1.7);
      snowman.add(button);
    }

    snowman.position.set(x, 0, z);
    this._scene3d.add(snowman);
  }

  _createSnow3D() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions.push(this._rand() * 300 - 150, this._rand() * 200, this._rand() * 300 - 150);
      velocities.push((this._rand() - 0.5) * 0.3, this._rand() * -0.8 - 0.3, (this._rand() - 0.5) * 0.3);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.userData.velocities = velocities;
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1, transparent: true, opacity: 0.8 });
    this._snowSystem = new THREE.Points(geometry, material);
    this._scene3d.add(this._snowSystem);
  }

