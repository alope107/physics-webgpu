import { edgeStruct, nodeStruct, uniformsStruct } from "./structs.js";
import { global_invocation_index } from "./linear_indexing.js";
import { intersection } from "./vectors.js";

export const computeShaderCode = /* wgsl */ `
${global_invocation_index}

${nodeStruct().code}
${edgeStruct().code}
${uniformsStruct}
${intersection}


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

        var restitution = .2;
        let damping = .999;

        nodes[id].overlapping = 0;

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

                // EVEN MORE WILDLY INEFFICIENT
                // ALSO WRONG
                for(var j = 0u; j < arrayLength(&edges); j++) {
                    // if(j == i) {continue;}
                    let otherEdge = edges[j];
                    restitution += 0.000000001 * nodes[otherEdge.nodes[0]].velocity.x;//nodes[99].position.x;
                    // if(otherEdge.nodes[0] != id && otherEdge.nodes[1] != id &&
                    //    otherEdge.nodes[0] != otherId && otherEdge.nodes[1] != otherId) {
                    // if(otherEdge.k > 0.0) {
                    //     // if(intersection(nodes[id].position, nodes[otherId].position,
                    //     //                 nodes[otherEdge.nodes[0]].position, nodes[otherEdge.nodes[1]].position).z != 0) {
                    //     //                     // nodes[id].overlapping = 1;
                    //     //                                         restitution += 0.000000001;
                    //     //                 }
                    //     restitution += 0.000000001 * nodes[otherEdge.nodes[0]].position.x;
                    // }
                }

            
            }

            
        }

        nodes[id].velocity += uniforms.gravity;
        nodes[id].velocity *= damping;
        // nodes[id].position += nodes[id].velocity;

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