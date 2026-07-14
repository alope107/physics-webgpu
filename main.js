const main = async () => {
    const device = (await navigator.gpu?.requestAdapter( {
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
} ;

main();