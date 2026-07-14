import { triangleStruct } from "./structs.js";

export const renderShaderCode = /* wgsl */ `
${triangleStruct().code}

struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) color : vec4f
}

@group(0) @binding(0) var<storage, read> triangles : array<Triangle>;

@vertex fn triangle(
    @builtin(vertex_index) vertexIdx : u32,
    @builtin(instance_index) triangleIdx: u32) -> VertexOutput {
        
        return VertexOutput(
            vec4(triangles[triangleIdx].vertices[vertexIdx], 0, 1),
            triangles[triangleIdx].color
        );
}

@fragment fn solidColor(fragInput : VertexOutput) -> @location(0) vec4f {
    return fragInput.color;
}
`;