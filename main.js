import { computeShaderCode } from "./compute.js";
import { renderShaderCode } from "./render.js";
import { startResizeObservation } from "./resize.js";
import { edgeStruct, nodeStruct, triangleStruct } from "./structs.js";
import { randClip } from "./random.js";
import { dist } from "./vectors.js";

let defaultAccel = {x:0, y: -9.8, z:0};
let accel = {x: 0, y:0, z:0};

const main = async () => {
    const device = await (await navigator.gpu?.requestAdapter( {
        powerPreference: "high-performance",
    }))?.requestDevice();

    let renderTarget;
    if(device) {        
        renderTarget = document.body.appendChild(document.createElement("canvas"));
        renderTarget.id = "renderTarget";
    } else {
        let errorMessage = document.body.appendChild(document.createElement("span"));
        errorMessage.innerText = "No WebGPU support :( "
        console.error("No WebGPU support :(");
        return;
    }

    // These errors are automatically surfaced in the chrome terminal,
    // but need to be explicitly listened for on webkit
    device.addEventListener("uncapturederror", (e) => {
        console.error("Uncaptured error: ", e.error.message);
    });

    startResizeObservation(renderTarget, device.limits.maxTextureDimension2D);

    const renderFormat = navigator.gpu.getPreferredCanvasFormat();
    const ctx = renderTarget.getContext("webgpu");
    ctx.configure( {
        device,
        format: renderFormat
    });

    const computeModule = device.createShaderModule({
        label: "compute shader module",
        code:computeShaderCode
    })
    const physicsPipeline = device.createComputePipeline({
        label: "physics pipeline",
        layout: "auto",
        compute: {
            module: computeModule,
            entryPoint: "applyPhysics"
        }
    });

    const renderModule = device.createShaderModule({
        label: "render module",
        code: renderShaderCode
    });
    const renderPipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: "auto",
        vertex: {
            entryPoint: "triangle",
            module: renderModule
        },
        fragment:{
            entryPoint: "solidColor",
            module: renderModule,
            targets: [{format: renderFormat}]
        }
    });
    const renderPassDescriptor = {
        label: "render pass descriptor",
        colorAttachments: [
            {
                clearValue: [0, 0, 0, 1],
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    };

    const vels = [[0,0],[0,0]];
    const transDown = .35;
    const scale = 2;
    const jsNodes = [
        {
            position: [0*scale, (.1-transDown)*scale],
            velocity: vels[0]
        },
        {
            position: [-.1*scale, (0-transDown)*scale],
            velocity: vels[0]
        },
        {
            position: [0*scale, (-.1-transDown)*scale],
            velocity: vels[1]
        },
        {
            position: [.1*scale, (0-transDown)*scale],
            velocity: vels[1]
        },
        {
            position: [.1*scale, (.1-transDown)*scale],
            velocity: vels[1]
        },
        {
            position: [-.1, -.05],
            velocity: vels[1]
        },
        {
            position: [-.2, -.1],
            velocity: vels[1]
        },
        {
            position: [-.2, -.4],
            velocity: vels[1]
        },
    ];
    const nodes = nodeStruct().createFilledArray(jsNodes);

    const k = .2;
    const edges = edgeStruct().createFilledArray([
        {
            nodes: [0, 1],
            idealLength: dist(jsNodes[0].position, jsNodes[1].position),
            k
        },
        {
            nodes: [0, 3],
            idealLength: dist(jsNodes[0].position, jsNodes[3].position),
            k
        },
        {
            nodes: [1, 3],
            idealLength: dist(jsNodes[1].position, jsNodes[3].position),
            k
        },
        {
            nodes: [1, 2],
            idealLength: dist(jsNodes[1].position, jsNodes[2].position),
            k
        },
        {
            nodes: [2, 3],
            idealLength: dist(jsNodes[2].position, jsNodes[3].position),
            k
        },
        {
            nodes: [4, 3],
            idealLength: dist(jsNodes[4].position, jsNodes[3].position),
            k
        },
        {
            nodes: [4, 0],
            idealLength: dist(jsNodes[4].position, jsNodes[0].position),
            k
        },
        {
            nodes: [5, 6],
            idealLength: dist(jsNodes[5].position, jsNodes[6].position),
            k
        },
        {
            nodes: [5, 7],
            idealLength: dist(jsNodes[5].position, jsNodes[7].position),
            k
        },
        {
            nodes: [6, 7],
            idealLength: dist(jsNodes[6].position, jsNodes[7].position),
            k
        },
    ]);

    const triangles = triangleStruct().createFilledArray(
        [
            {
                color: [.7, .3, 0.6, 1],
                vertices: [
                    0, 1, 3
                ]
            },
            {
                color: [.7, .3, 0.6, 1],
                vertices: [
                    1, 2, 3
                ]
            },
            {
                color: [.7, .3, 0.6, 1],
                vertices: [
                    0, 3, 4
                ]
            },
            {
                color: [.4, .7, 0.1, 1],
                vertices: [
                    5, 6, 7
                ]
            },
        ]
    );

    const nodeBuffer = device.createBuffer({
        label: "nodeBuffer",
        size: nodes.data.byteLength,
        usage: GPUBufferUsage.STORAGE |
               GPUBufferUsage.COPY_DST |
               GPUBufferUsage.VERTEX
    });

    const edgeBuffer = device.createBuffer({
        label: "edgeBuffer",
        size: edges.data.byteLength,
        usage: GPUBufferUsage.STORAGE |
               GPUBufferUsage.COPY_DST 
    });

    const triangleBuffer = device.createBuffer({
        label: "triangleBuffer",
        size: triangles.data.byteLength,
        usage: GPUBufferUsage.STORAGE |
               GPUBufferUsage.COPY_DST |
               GPUBufferUsage.VERTEX
    });

    const uniformFloatCount = 2;
    const uniformData = new Float32Array(uniformFloatCount);

    const uniformBuffer = device.createBuffer({
        label: "uniform buffer",
        size: uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | 
               GPUBufferUsage.COPY_DST 
    });

    const physicsBindGroup = device.createBindGroup({
        label: "physicsBindGroup",
        layout: physicsPipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: uniformBuffer},
            {binding: 1, resource: nodeBuffer},
            {binding: 2, resource: edgeBuffer},
            
        ]
    });

    const renderBindGroup = device.createBindGroup({
        label: "renderBindGroup",
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: nodeBuffer},
            {binding: 1, resource: triangleBuffer}
        ]
    });

    console.log(new Float32Array(edges.data));

    device.queue.writeBuffer(nodeBuffer, 0, nodes.data);
    device.queue.writeBuffer(edgeBuffer, 0, edges.data);
    device.queue.writeBuffer(triangleBuffer, 0, triangles.data);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder({label: "encoder"});
        
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(physicsPipeline);
        computePass.setBindGroup(0, physicsBindGroup);
        computePass.dispatchWorkgroups(nodes.count);
        computePass.end();
        
        const renderPass = encoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.draw(3, triangles.count);
        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    };

    const animationFrame = (timestamp) => {
        const factor = 40000;
        uniformData[0] = accel.x/factor;
        uniformData[1] = accel.y/factor;
        device.queue.writeBuffer(uniformBuffer, 0, uniformData);
        render();
        requestAnimationFrame(animationFrame);
    };
    requestAnimationFrame(animationFrame);
};

const initializeAccelerometer = async (e) => {
    document.getElementById("disp").remove();
    window.addEventListener("devicemotion", (event) => {
        let accelInclG = event.accelerationIncludingGravity;
        if(accelInclG.x == null) {
            accel = {...defaultAccel};
        } else {
            accel.x = accelInclG.x*-1;
            accel.y = accelInclG.y*-1;
            accel.z = accelInclG.z;
        }
    });
    main();
}

// Only need user input if on mobile so accelerometer can be accessed
// Otherwise just start immedately on desktop
if(!window.matchMedia('(hover: hover)').matches && window.matchMedia('(pointer: coarse)').matches) {
    let display = document.body.appendChild(document.createElement("h1"));
    display.innerText = "Press me";
    display.id="disp";
    display.addEventListener("pointerup", initializeAccelerometer);
} else {
    accel = defaultAccel;
    main();
}



