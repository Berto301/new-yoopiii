import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildPropertyThreeDMedia } from "../property-3d.js";
import { resolveAssetUrl } from "../../../lib/utils/asset-url.js";

export const ThreeDPropertyViewer = ({ property }) => {
  const containerRef = useRef(null);
  const mediaItems = useMemo(
    () =>
      buildPropertyThreeDMedia(property)
        .map((item) => ({
          ...item,
          resolvedUrl: resolveAssetUrl(item.url)
        }))
        .filter((item) => item.resolvedUrl),
    [property]
  );

  useEffect(() => {
    const hostElement = containerRef.current;

    if (!hostElement || !mediaItems.length) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#09090b");
    scene.fog = new THREE.Fog("#09090b", 10, 28);

    const camera = new THREE.PerspectiveCamera(55, hostElement.clientWidth / Math.max(hostElement.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 3.2, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(hostElement.clientWidth, hostElement.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    hostElement.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.target.set(0, 2.2, 0);

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.6);
    const keyLight = new THREE.DirectionalLight("#fef3c7", 2.4);
    keyLight.position.set(7, 10, 6);
    const rimLight = new THREE.PointLight("#38bdf8", 18, 32, 2);
    rimLight.position.set(-6, 4, -6);
    scene.add(ambientLight, keyLight, rimLight);

    const floorGeometry = new THREE.CircleGeometry(9, 64);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#111827",
      metalness: 0.2,
      roughness: 0.92
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const ringGeometry = new THREE.TorusGeometry(7.5, 0.08, 20, 100);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: "#c9a66b",
      emissive: "#c9a66b",
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.35
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    scene.add(ring);

    const imageGroup = new THREE.Group();
    scene.add(imageGroup);

    const textureLoader = new THREE.TextureLoader();
    const meshes = [];
    const materials = [];
    const textures = [];
    const geometries = [];

    mediaItems.forEach((item, index) => {
      textureLoader.load(item.resolvedUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const aspectRatio = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 16 / 10;
        const planeHeight = 3;
        const planeWidth = planeHeight * aspectRatio;
        const angle = (index / Math.max(mediaItems.length, 1)) * Math.PI * 2;
        const radius = 6.6;
        const position = new THREE.Vector3(
          Math.cos(angle) * radius,
          2 + ((index % 2) * 0.32),
          Math.sin(angle) * radius
        );

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          metalness: 0.08,
          roughness: 0.62
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.lookAt(0, 2, 0);

        imageGroup.add(mesh);
        meshes.push(mesh);
        geometries.push(geometry);
        materials.push(material);
        textures.push(texture);
      });
    });

    const onResize = () => {
      const width = hostElement.clientWidth || 1;
      const height = hostElement.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      imageGroup.rotation.y = elapsed * 0.08;
      ring.rotation.z = elapsed * 0.05;
      controls.update();
      renderer.render(scene, camera);
    });

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      meshes.forEach((mesh) => imageGroup.remove(mesh));
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      floorGeometry.dispose();
      floorMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === hostElement) {
        hostElement.removeChild(renderer.domElement);
      }
    };
  }, [mediaItems]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(201,166,107,0.18),transparent_25%),linear-gradient(145deg,rgba(12,10,9,0.96),rgba(12,10,9,0.82))]">
      <div ref={containerRef} className="h-[540px] w-full" />
    </div>
  );
};
