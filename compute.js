import { edgeStruct, nodeStruct, uniformsStruct } from "./structs.js";
import { global_invocation_index } from "./linear_indexing.js";

export const computeShaderCode = /* wgsl */ `
${global_invocation_index}

${nodeStruct().code}
${edgeStruct().code}
${uniformsStruct}


@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<storage, read_write> nodes : array<Node>;
@group(0) @binding(2) var<storage, read_write> edges : array<Edge>; 



// TODO: better workgroup size UPDATE THE GLOBAL INDEX CALC IF CHANGED
@compute @workgroup_size(1) fn applyPhysics(
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
    @builtin(num_workgroups) num_workgroups: vec3<u32>) {
        let id = global_invocation_index(workgroup_id, local_invocation_index, num_workgroups,
                                         1 /* CHANGE ME WHEN WORKGROUP SIZE CHANGES */);

        let restitution = .2;
        let damping = .999;

        // WILDLY INEFFICIENT
        for(var i = 0u; i < arrayLength(&edges); i++) {
            let edge = edges[i];
            // todo: forces pass then velocities pass to avoid double checking
            if(edge.nodes[0] == id || edge.nodes[1] == id) {
                // TODO: select
                var otherId : u32;
                if(edge.nodes[0] == id) { otherId = edge.nodes[1]; }
                if(edge.nodes[1] == id) { otherId = edge.nodes[0]; }

                let delta = nodes[otherId].position - nodes[id].position;
                let currentLength = length(delta);
                let currentForce = (edge.idealLength - currentLength) * -edge.k;
                nodes[id].velocity += delta * (currentForce / currentLength);
            }
        }

        nodes[id].velocity += uniforms.gravity;
        nodes[id].velocity *= damping;
        nodes[id].position += nodes[id].velocity;

        // TODO: other walls?
        // TODO: branchless?
        if(nodes[id].position.y < -1) {
            nodes[id].position.y = -1;
            nodes[id].velocity.y *= -1 * restitution;
        }
        if(nodes[id].position.y > 1) {
            nodes[id].position.y = 1;
            nodes[id].velocity.y *= -1 * restitution;
        }
        if(nodes[id].position.x < -1) {
            nodes[id].position.x = -1;
            nodes[id].velocity.x *= -1 * restitution;
        }
        if(nodes[id].position.x > 1) {
            nodes[id].position.x = 1;
            nodes[id].velocity.x *= -1 * restitution;
        }
    }
`;