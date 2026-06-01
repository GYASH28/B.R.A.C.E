const os = require("node:os");
const fs = require("node:fs");
const si = require("systeminformation");

let cpuPrevious = null;

function cpuUsage(cpus) {
  const snapshot = cpus.map((cpu) => cpu.times);
  if (!cpuPrevious) {
    cpuPrevious = snapshot;
    return 0;
  }
  let idle = 0;
  let total = 0;
  snapshot.forEach((times, index) => {
    const previous = cpuPrevious[index];
    const idleDelta = times.idle - previous.idle;
    const totalDelta = times.user + times.nice + times.sys + times.idle + times.irq - (previous.user + previous.nice + previous.sys + previous.idle + previous.irq);
    idle += idleDelta;
    total += totalDelta;
  });
  cpuPrevious = snapshot;
  return total > 0 ? Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100))) : 0;
}

async function getSystemInfo() {
  const cpus = os.cpus();
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const [fsSize, graphics, network, battery] = await Promise.all([
    si.fsSize().catch(() => []),
    si.graphics().catch(() => ({ controllers: [] })),
    si.networkStats().catch(() => []),
    si.battery().catch(() => ({})),
  ]);
  const mainDisk = fsSize[0];
  const gpu = graphics.controllers?.[0];
  const networkTotal = network.reduce((sum, item) => sum + (item.rx_sec || 0) + (item.tx_sec || 0), 0);
  return {
    cpu: cpuUsage(cpus),
    ram: Math.round(((memTotal - memFree) / memTotal) * 100),
    ramDetail: `${Math.round((memTotal - memFree) / 1024 / 1024 / 1024)} GB of ${Math.round(memTotal / 1024 / 1024 / 1024)} GB`,
    storage: mainDisk ? Math.round(mainDisk.use) : 0,
    storageDetail: mainDisk ? `${mainDisk.fs} ${Math.round(mainDisk.used / 1024 / 1024 / 1024)} GB used` : "Unavailable",
    gpu: gpu ? Math.round(gpu.utilizationGpu || 0) : null,
    gpuDetail: gpu?.model || "GPU data unavailable",
    network: Math.min(100, Math.round(networkTotal / 100000)),
    networkDetail: network.length ? `${network.length} adapter(s) active` : "Unavailable",
    battery: typeof battery.percent === "number" ? Math.round(battery.percent) : null,
    batteryDetail: battery.hasBattery === false ? "Desktop power" : battery.isCharging ? "Charging" : "Battery",
    os: { platform: os.platform(), release: os.release(), arch: os.arch(), hostname: os.hostname(), uptimeSeconds: os.uptime() },
    tools: {
      node: process.version,
      python: "Check with command tool: python --version",
      git: "Check with command tool: git --version",
      filesystemWritable: fs.existsSync(os.homedir()),
    },
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { getSystemInfo };
