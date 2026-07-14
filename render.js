export const renderShaderCode = /* wgsl */ `

@vertex fn triangle(@builtin(vertex_index) vertexIdx : u32) -> @builtin(position) vec4f {
    let vertices = array<vec2f, 3>(
        vec2f(0., .1),
        vec2f(.05, 0.),
        vec2f(-.05, 0.)
    );
    return vec4(vertices[vertexIdx], 0, 1);
}

@fragment fn solidColor() -> @location(0) vec4f {
    return vec4(1., 0, 1., 1.);
}
`;