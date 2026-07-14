// Want to recompute layouts?
// G here! https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html
export const triangleStruct = () => { 
    const code = /* wgsl */`
        struct Triangle {
            color: vec4f, // 16 bytes
            vertices: array<vec2f, 3>, // 24 bytes
            // pad  8 bytes
        } // Total: 48 bytes
    `
    const byteCount = 48;
    const floatCount = byteCount / 4;
    const createEmptyArray = (triangleCount) => {
        const data = new ArrayBuffer(byteCount * triangleCount);
        return {
            data,
            views: {
                colorView: new Float32Array(data, 0),
                vertexView: new Float32Array(data, 16),
            },
            count: triangleCount
        };
    };
    const createFilledArray = (triangleData) => {
        const data = createEmptyArray(triangleData.length);
        const {colorView, vertexView} = data.views;
        triangleData.forEach(({color, vertices}, i) => {
            console.log(color, vertices, i);
            colorView.set(color, i*floatCount);
            console.log("falt");
            console.log(vertices.flat());
            vertexView.set(vertices.flat(), i*floatCount);
        });
        return data;
    };
    return {
        code,
        byteCount,
        floatCount,
        createEmptyArray,
        createFilledArray
    };
};