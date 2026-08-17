import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { LOW_GFX } from '../config/constants.js';

const container = document.getElementById('app');

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8cbce6);
scene.fog = new THREE.Fog(0x8cbce6, 1500, 2600);

export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 30000);
camera.position.set(0, 9, 26);

const urlParams = new URLSearchParams(window.location.search);
const useWebGL = urlParams.has('webgl') || urlParams.get('backend') === 'webgl' || typeof navigator === 'undefined' || !navigator.gpu;

export const renderer = new WebGPURenderer({ 
    antialias: !LOW_GFX, 
    alpha: false,
    powerPreference: 'high-performance',
    forceWebGL: useWebGL
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(LOW_GFX ? 0.5 : Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = !LOW_GFX;
renderer.shadowMap.type = LOW_GFX ? THREE.BasicShadowMap : THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

renderer.onDeviceLost = (info) => {
    console.warn('WebGPU Device Lost:', info.message, info.reason);
    const overlay = document.getElementById('debug-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.innerHTML = '<div style="font-family: sans-serif; font-size: 15px; line-height: 1.6; max-width: 600px; margin: 0 auto; text-align: center;">' +
            '<div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">WebGPU Device Lost</div>' +
            '<div style="font-size: 13px; opacity: 0.9; margin-bottom: 16px;">' + (info.message || 'The GPU device context was lost.') + '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: center;">' +
                '<a href="?webgl=1" style="display: inline-block; padding: 8px 16px; background: #ffffff; color: #000000; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px;">Switch to WebGL Fallback</a>' +
                '<button onclick="window.location.reload()" style="padding: 8px 16px; background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid #ffffff; border-radius: 4px; font-weight: bold; font-size: 13px; cursor: pointer;">Reload</button>' +
            '</div>' +
        '</div>';
    }
};

if (container) {
    container.appendChild(renderer.domElement);
}

export const clock = new THREE.Clock();
