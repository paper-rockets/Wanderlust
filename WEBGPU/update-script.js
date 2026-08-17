import fs from 'fs';

const filePath = './src/main.js';
let content = fs.readFileSync(filePath, 'utf8');
const isCRLF = content.includes('\r\n');
let normContent = content.replace(/\r\n/g, '\n');

const target = `        // Update God Rays sun screen position
        if (godRaysPass.enabled && typeof staticSun !== 'undefined') {
            const activeCam = isGodMode ? godCamera : camera;
            tempVecSunFwd.copy(staticSun.position).sub(activeCam.position).normalize();
            activeCam.getWorldDirection(tempVec1);
            const dotFwd = tempVec1.dot(tempVecSunFwd);

            if (dotFwd > -0.2) {
                tempVec2.copy(staticSun.position).project(activeCam);
                const sunScreenX = (tempVec2.x + 1.0) * 0.5;
                const sunScreenY = (tempVec2.y + 1.0) * 0.5;
                godRaysPass.uniforms.uSunScreenPos.value.set(sunScreenX, sunScreenY);

                const offScreen = Math.max(Math.abs(sunScreenX - 0.5), Math.abs(sunScreenY - 0.5));
                const screenFade = 1.0 - Math.min(1.0, Math.max(0.0, (offScreen - 0.5) * 1.5));
                const twilightFade = timePhase === 2 ? 0.0 : 1.0;
                const fwdFade = Math.max(0.0, Math.min(1.0, (dotFwd + 0.2) * 2.5));
                godRaysPass.uniforms.uSunVisible.value = fwdFade * screenFade * twilightFade;
            } else {
                godRaysPass.uniforms.uSunVisible.value = 0.0;
            }
        }`;

const replacement = `        // Update God Rays sun screen position
        if (godRaysPass.enabled && typeof staticSun !== 'undefined') {
            const activeCam = isGodMode ? godCamera : camera;
            const sunWorldPos = staticSun.position.clone();
            sunWorldPos.project(activeCam);
            const sunScreenX = (sunWorldPos.x + 1.0) * 0.5;
            const sunScreenY = (sunWorldPos.y + 1.0) * 0.5;
            if (godRaysPass.uniforms.uSunScreenPos.value && typeof godRaysPass.uniforms.uSunScreenPos.value.set === 'function') {
                godRaysPass.uniforms.uSunScreenPos.value.set(sunScreenX, sunScreenY);
            }
            const behindCamera = sunWorldPos.z > 1.0 ? 0.0 : 1.0;
            const offScreen = Math.max(Math.abs(sunScreenX - 0.5), Math.abs(sunScreenY - 0.5));
            const screenFade = 1.0 - Math.min(1.0, Math.max(0.0, (offScreen - 0.5) * 1.5));
            const twilightFade = timePhase === 2 ? 0.0 : 1.0;
            godRaysPass.uniforms.uSunVisible.value = behindCamera * screenFade * twilightFade;
        }`;

if (normContent.includes(target)) {
    normContent = normContent.replace(target, replacement);
    const finalContent = isCRLF ? normContent.replace(/\n/g, '\r\n') : normContent;
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log('Successfully updated WEBGPU main.js');
} else {
    console.error('Target still not found in normalized content');
}
