// target number of physics steps per second
const physFPS = 40;
// duration of a physics step in seconds
const physTime = 1 / physFPS;
// duration of a physics step in milliseconds
const physTimeMs = 1000 * physTime;

module.exports = Object.freeze({
	physFPS,
	physTime,
	physTimeMs,
});
