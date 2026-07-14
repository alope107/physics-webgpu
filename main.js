import { renderShaderCode } from "./render.js";
import { startResizeObservation } from "./resize.js";
import { nodeStruct, triangleStruct } from "./structs.js";
import { randClip } from "./random.js";

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

    const nodes = nodeStruct().createFilledArray([
        {
            position: [0, .1],
            velocity: [randClip()*.05, randClip()*.05]
        },
        {
            position: [.1, 0],
            velocity: [randClip()*.05, randClip()*.05]
        },
        {
            position: [-.1, 0],
            velocity: [randClip()*.05, randClip()*.05]
        },
        {
            position: [0, -.1],
            velocity: [randClip()*.05, randClip()*.05]
        },
        {
            position: [.1, 0],
            velocity: [randClip()*.05, randClip()*.05]
        },
        {
            position: [-.1, 0],
            velocity: [randClip()*.05, randClip()*.05]
        },
    ]
    );

    const triangles = triangleStruct().createFilledArray(
        [
            {
                color: [0.001, .2, .3, 1],
                vertices: [
                    0, 1, 2
                ]
            },
            {
                color: [.41, .1, 0.0061, 1],
                vertices: [
                    3, 4, 5
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

    const triangleBuffer = device.createBuffer({
        label: "triangleBuffer",
        size: triangles.data.byteLength,
        usage: GPUBufferUsage.STORAGE |
               GPUBufferUsage.COPY_DST |
               GPUBufferUsage.VERTEX
    });

    const renderBindGroup = device.createBindGroup({
        label: "renderBindGroup",
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: nodeBuffer},
            {binding: 1, resource: triangleBuffer}
        ]
    });

    console.log(triangles.views.colorView);

    device.queue.writeBuffer(nodeBuffer, 0, nodes.data);
    device.queue.writeBuffer(triangleBuffer, 0, triangles.data);

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder({label: "encoder"});
        const renderPass = encoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.draw(3, triangles.count);
        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    };

    const animationFrame = (timestamp) => {
        render();
        requestAnimationFrame(animationFrame);
    };
    requestAnimationFrame(animationFrame);
};

main();