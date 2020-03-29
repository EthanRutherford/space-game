import {shaders} from "2d-gl";
const {BackgroundShader} = shaders;

const bgFragShader = `
	uniform highp vec2 uMotion;
	varying highp vec2 vWorld;

	highp float bimod(float i, float by) {
		if (i > by) {
			return mod(i, by);
		}
		if (i < -by) {
			return -mod(-i, by);
		}

		return i;
	}

	highp float rand(vec2 co) {
		// the rand gets a bit odd when the inputs get too big.
		// to combat this, loop it at 50,000
		co.x = bimod(co.x, 50000.0);
		co.y = bimod(co.y, 50000.0);

		// original code
		highp float a = 12.9898;
		highp float b = 78.233;
		highp float c = 43758.5453;
		highp float dt = dot(co.xy, vec2(a, b));
		highp float sn = mod(dt, 3.14);
		return fract(sin(sn) * c);
	}

	void main() {
		const highp float scale = 20.0;

		highp vec2 xy = vWorld * scale;
		highp vec2 m = -uMotion * scale;

		highp float l = ceil(length(m));
		highp float stepCount = l * 2.0;
		highp vec2 stepSize = stepCount > 0.0 ? m / stepCount : m;

		for (highp float i = 0.0; i < 50.0; i++) {
			if (i > stepCount) {
				break;
			}

			highp vec2 sxy = xy + (stepSize * i);
			highp vec2 rxy = floor(sxy + .5);
			highp float r = rand(rxy);
			
			if (r > .999 && distance(sxy, rxy) < .5 - (.2 * i / stepCount)) {
				highp float str = 1.0 - (l > 0.0 ? distance(xy, sxy) / l : 0.0);
				gl_FragColor = vec4(str, str, str, 1);
				return;
			}
		}

		gl_FragColor = vec4(0, 0, 0, 1);
	}
`;

export class SpaceBgShader extends BackgroundShader {
	constructor(gl) {
		super(gl, bgFragShader);
		this.uMotion = gl.getUniformLocation(this.program, "uMotion");
	}
	build(pMatrix) {
		const xy = [-pMatrix[12] / pMatrix[0], -pMatrix[13] / pMatrix[5]];
		const prevXy = this.prevXy || xy;
		this.motion = [xy[0] - prevXy[0], xy[1] - prevXy[1]];
		this.prevXy = xy;
		super.build(pMatrix);
	}
	bind() {
		this.gl.uniform2fv(this.uMotion, this.motion);
	}
}
