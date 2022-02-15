import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { join, onPeers, onPeerLeave } from "./hms";

// Setup

function init() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#bg"),
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.setZ(30);
  camera.position.setX(-3);

  renderer.render(scene, camera);

  // Lights

  const pointLight = new THREE.PointLight(0xffffff);
  pointLight.position.set(5, 5, 5);

  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(pointLight, ambientLight);

  // Helpers

  // const lightHelper = new THREE.PointLightHelper(pointLight)
  // const gridHelper = new THREE.GridHelper(200, 50);
  // scene.add(lightHelper, gridHelper)

  const controls = new OrbitControls(camera, renderer.domElement);

  function addStar() {
    const geometry = new THREE.SphereGeometry(0.25, 24, 24);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geometry, material);

    const [x, y, z] = Array(3)
      .fill()
      .map(() => THREE.MathUtils.randFloatSpread(100));

    star.position.set(x, y, z);
    scene.add(star);
  }

  Array(200).fill().forEach(addStar);

  // Background

  const spaceTexture = new THREE.TextureLoader().load("space.jpg");
  scene.background = spaceTexture;

  // Audio Setup
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const allAudio = {};

  // Avatar

  const meshes = {};

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // join
  join();
  onPeers(() => {});
  onPeers((peers) => {
    for (let peer of peers) {
      const video = peer.video;
      let mesh;
      if (video && !meshes[peer.peer.id]) {
        const texture = new THREE.VideoTexture(video);
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(5, 5, 0),
          new THREE.MeshBasicMaterial({
            map: texture,
          })
        );
        scene.add(mesh);
        mesh.position.z = getRandomInt(-20, 20);
        mesh.position.x = getRandomInt(-20, 20);
        mesh.position.y = getRandomInt(0, 20);
        meshes[peer.peer.id] = mesh;
        console.log("added mesh for peer ", peer, mesh);
      } else if (meshes[peer.peer.id]) {
        mesh = meshes[peer.peer.id];
      }
      const audioTracks = peer.audioTracks;
      for (let audioTrack of audioTracks) {
        console.log("new audio", audioTrack, allAudio);
        if (audioTrack && !allAudio[audioTrack.trackId]) {
          try {
            const audioStream = new MediaStream([audioTrack.nativeTrack]);
            console.log("adding audio", audioTrack);
            let audioSource = new THREE.PositionalAudio(listener);
            audioSource.setMediaStreamSource(audioStream);
            console.log("adding audio to scene");
            mesh.add(audioSource);
            console.log("added audio", audioTrack);
            allAudio[audioTrack.trackId] = audioSource;
          } catch (err) {
            console.error("playing audio ", err);
          }
        }
      }
    }
  });

  onPeerLeave((peer) => {
    if (meshes[peer.id]) {
      console.log("peer left, removing mesh", peer);
      const mesh = meshes[peer.id];
      mesh.geometry.dispose();
      mesh.material.dispose();
      scene.remove(meshes[peer.id]);
      delete meshes[peer.id];
    }
  });

  // Animation Loop

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", onWindowResize);
}

const btn = document.getElementById("join");
const canvas = document.getElementById("bg");
btn.onclick = () => {
  init();
  btn.style.display = "none";
  canvas.style.display = null;
};
