function burnCpu(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        Math.sqrt(Math.random());
    }
}

function randomLoadPattern() {
    const spikeChance = Math.random();

    if (spikeChance > 0.8) {
        console.log("🔥 CPU SPIKE MODE");
        burnCpu(500);
    } else {
        burnCpu(50);
    }
}

console.log("Dummy metric producer started...");

setInterval(() => {
    randomLoadPattern();
}, 100);
